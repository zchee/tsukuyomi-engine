// Copyright 2026 The tsukuyomi-engine Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// SPDX-License-Identifier: Apache-2.0

package server

import (
	"context"
	"encoding/hex"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/go-json-experiment/json"
	"github.com/google/go-cmp/cmp"
)

func TestNewChatHandlerDefaults(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{}))
	hub := newChatHub()
	handler := newChatHandler(hub, logger, 0, 0, 0, 0)

	if handler.maxMessageLen != defaultMaxMessageLen {
		t.Fatalf("newChatHandler() maxMessageLen = %d, want %d", handler.maxMessageLen, defaultMaxMessageLen)
	}
	if handler.maxNameLen != defaultMaxNameLen {
		t.Fatalf("newChatHandler() maxNameLen = %d, want %d", handler.maxNameLen, defaultMaxNameLen)
	}
	if handler.ratePerSecond != defaultRateLimitPerSecond {
		t.Fatalf("newChatHandler() ratePerSecond = %v, want %v", handler.ratePerSecond, defaultRateLimitPerSecond)
	}
	if handler.burst != defaultRateLimitBurst {
		t.Fatalf("newChatHandler() burst = %v, want %v", handler.burst, defaultRateLimitBurst)
	}
}

func TestNewChatHub(t *testing.T) {
	hub := newChatHub()
	if hub == nil {
		t.Fatal("newChatHub() returned nil")
	}
	if len(hub.clients) != 0 {
		t.Fatalf("newChatHub() clients length = %d, want 0", len(hub.clients))
	}
}

func TestNewClientID(t *testing.T) {
	id1 := newClientID()
	id2 := newClientID()

	if id1 == "" || id2 == "" {
		t.Fatalf("newClientID() returned empty string")
	}
	if id1 == id2 {
		t.Fatalf("newClientID() returned duplicate ids: %q", id1)
	}
	if len(id1) < 8 {
		t.Fatalf("newClientID() length = %d, want >= 8", len(id1))
	}

	if _, err := hex.DecodeString(id1); err != nil {
		t.Fatalf("newClientID() not hex: %v", err)
	}
}

func TestNormalizeName(t *testing.T) {
	tests := map[string]struct {
		raw      string
		fallback string
		maxLen   int
		want     string
	}{
		"uses fallback on empty": {
			raw:      "   ",
			fallback: "Guest-1234",
			maxLen:   10,
			want:     "Guest-1234",
		},
		"trims and collapses whitespace": {
			raw:      "  alice   smith  ",
			fallback: "Guest",
			maxLen:   20,
			want:     "alice smith",
		},
		"truncates long names": {
			raw:      "abcdefghijkl",
			fallback: "Guest",
			maxLen:   5,
			want:     "abcde",
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			got := normalizeName(tt.raw, tt.fallback, tt.maxLen)
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Fatalf("normalizeName() mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func TestNormalizeMessage(t *testing.T) {
	tests := map[string]struct {
		raw    string
		maxLen int
		want   string
		ok     bool
	}{
		"rejects empty": {
			raw:    "  ",
			maxLen: 10,
			ok:     false,
		},
		"trims whitespace": {
			raw:    "  hello  ",
			maxLen: 10,
			want:   "hello",
			ok:     true,
		},
		"truncates message": {
			raw:    "abcdefghij",
			maxLen: 4,
			want:   "abcd",
			ok:     true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			got, ok := normalizeMessage(tt.raw, tt.maxLen)
			if ok != tt.ok {
				t.Fatalf("normalizeMessage() ok = %v, want %v", ok, tt.ok)
			}
			if tt.ok {
				if diff := cmp.Diff(tt.want, got); diff != "" {
					t.Fatalf("normalizeMessage() mismatch (-want +got):\n%s", diff)
				}
			}
		})
	}
}

func TestChatHubRegisterSnapshotBroadcast(t *testing.T) {
	hub := newChatHub()

	clientA := &chatClient{id: "a", name: "Alice", send: make(chan serverEvent, 1)}
	clientB := &chatClient{id: "b", name: "Bob", send: make(chan serverEvent, 1)}

	hub.register(clientA)
	hub.register(clientB)

	users := hub.snapshot()
	if len(users) != 2 {
		t.Fatalf("snapshot length = %d, want 2", len(users))
	}

	event := serverEvent{Type: "chat", Body: "hi"}
	hub.broadcast(event)

	select {
	case got := <-clientA.send:
		if diff := cmp.Diff(event, got); diff != "" {
			t.Fatalf("broadcast to clientA mismatch (-want +got):\n%s", diff)
		}
	default:
		t.Fatalf("expected clientA to receive broadcast")
	}

	select {
	case got := <-clientB.send:
		if diff := cmp.Diff(event, got); diff != "" {
			t.Fatalf("broadcast to clientB mismatch (-want +got):\n%s", diff)
		}
	default:
		t.Fatalf("expected clientB to receive broadcast")
	}
}

func TestChatClientPresenceAndEnqueue(t *testing.T) {
	client := &chatClient{id: "id1", name: "Nami", send: make(chan serverEvent, 1)}

	presence := client.presence()
	if presence == nil || presence.ID != "id1" || presence.Name != "Nami" {
		t.Fatalf("presence() = %#v, want id1/Nami", presence)
	}

	client.enqueue(serverEvent{Type: "chat", Body: "one"})
	client.enqueue(serverEvent{Type: "chat", Body: "two"})

	select {
	case <-client.send:
	default:
		t.Fatalf("expected enqueue to write first event")
	}

	select {
	case <-client.send:
		t.Fatalf("expected enqueue to drop when channel is full")
	default:
	}
}

func TestChatClientWriteLoop(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{}))
	serverConn := make(chan *websocket.Conn, 1)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			t.Errorf("accept websocket: %v", err)
			return
		}
		serverConn <- conn
	}))
	defer server.Close()

	ctx := t.Context()
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	clientConn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	defer clientConn.Close(websocket.StatusNormalClosure, "")

	conn := <-serverConn
	defer conn.Close(websocket.StatusNormalClosure, "")

	client := &chatClient{id: "writer", name: "Writer", conn: conn, send: make(chan serverEvent, 1)}
	go client.writeLoop(ctx, logger)
	client.enqueue(serverEvent{Type: "chat", Body: "hello"})

	event := readEvent(t, ctx, clientConn)
	if diff := cmp.Diff("chat", event.Type); diff != "" {
		t.Fatalf("writeLoop event type mismatch (-want +got):\n%s", diff)
	}

	close(client.send)
}

func TestNormalizeWhitespace(t *testing.T) {
	tests := map[string]struct {
		input string
		want  string
	}{
		"empty": {
			input: "   ",
			want:  "",
		},
		"collapses": {
			input: "  a  b\n c\t",
			want:  "a b c",
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			got := normalizeWhitespace(tt.input)
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Fatalf("normalizeWhitespace() mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func TestTruncateRunes(t *testing.T) {
	tests := map[string]struct {
		value  string
		maxLen int
		want   string
	}{
		"no limit": {value: "abc", maxLen: 0, want: "abc"},
		"short":    {value: "abc", maxLen: 2, want: "ab"},
		"unicode":  {value: "あいう", maxLen: 2, want: "あい"},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			got := truncateRunes(tt.value, tt.maxLen)
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Fatalf("truncateRunes() mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func TestRateLimiterAllow(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	limiter := newRateLimiter(2, 3, now)

	for i := 0; i < 3; i++ {
		if !limiter.allow(now) {
			t.Fatalf("allow() returned false at burst index %d", i)
		}
	}

	if limiter.allow(now) {
		t.Fatalf("allow() should be false when burst exhausted")
	}

	now = now.Add(500 * time.Millisecond)
	if !limiter.allow(now) {
		t.Fatalf("allow() should be true after refill")
	}

	now = now.Add(100 * time.Millisecond)
	if limiter.allow(now) {
		t.Fatalf("allow() should be false when tokens are low")
	}
}

func TestChatHandlerFlow(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{}))
	mux := NewMux(Config{ChatEnabled: true}, logger)
	server := httptest.NewServer(mux)
	defer server.Close()

	ctx := t.Context()
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?name=Alice"
	connA, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	defer connA.Close(websocket.StatusNormalClosure, "")

	welcome := readEvent(t, ctx, connA)
	if diff := cmp.Diff("welcome", welcome.Type); diff != "" {
		t.Fatalf("welcome event type mismatch (-want +got):\n%s", diff)
	}
	if welcome.From == nil || welcome.From.Name != "Alice" {
		t.Fatalf("welcome event from = %#v, want Alice", welcome.From)
	}

	joinSelf := readEvent(t, ctx, connA)
	if diff := cmp.Diff("presence", joinSelf.Type); diff != "" {
		t.Fatalf("join event type mismatch (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff("join", joinSelf.Action); diff != "" {
		t.Fatalf("join action mismatch (-want +got):\n%s", diff)
	}

	wsURLB := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?name=Bob"
	connB, _, err := websocket.Dial(ctx, wsURLB, nil)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	defer connB.Close(websocket.StatusNormalClosure, "")

	_ = readEvent(t, ctx, connB) // welcome
	_ = readEvent(t, ctx, connB) // join

	joinBob := readEvent(t, ctx, connA)
	if joinBob.From == nil || joinBob.From.Name != "Bob" {
		t.Fatalf("presence join from = %#v, want Bob", joinBob.From)
	}

	chatPayload, err := json.Marshal(clientMessage{Type: "chat", Body: "hello"})
	if err != nil {
		t.Fatalf("marshal chat payload: %v", err)
	}
	if err := connA.Write(ctx, websocket.MessageText, chatPayload); err != nil {
		t.Fatalf("chat write failed: %v", err)
	}

	chatEvent := readEvent(t, ctx, connB)
	if diff := cmp.Diff("chat", chatEvent.Type); diff != "" {
		t.Fatalf("chat event type mismatch (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff("hello", chatEvent.Body); diff != "" {
		t.Fatalf("chat event body mismatch (-want +got):\n%s", diff)
	}

	renamePayload, err := json.Marshal(clientMessage{Type: "name", Body: "Aki"})
	if err != nil {
		t.Fatalf("marshal rename payload: %v", err)
	}
	if err := connA.Write(ctx, websocket.MessageText, renamePayload); err != nil {
		t.Fatalf("rename write failed: %v", err)
	}

	renameEvent := readEvent(t, ctx, connB)
	if diff := cmp.Diff("presence", renameEvent.Type); diff != "" {
		t.Fatalf("rename event type mismatch (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff("rename", renameEvent.Action); diff != "" {
		t.Fatalf("rename action mismatch (-want +got):\n%s", diff)
	}
	if renameEvent.From == nil || renameEvent.From.Name != "Aki" {
		t.Fatalf("rename event from = %#v, want Aki", renameEvent.From)
	}
}

func readEvent(t *testing.T, ctx context.Context, conn *websocket.Conn) serverEvent {
	t.Helper()
	readCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	_, data, err := conn.Read(readCtx)
	if err != nil {
		t.Fatalf("read event failed: %v", err)
	}

	var event serverEvent
	if err := json.Unmarshal(data, &event); err != nil {
		t.Fatalf("decode event failed: %v", err)
	}
	return event
}
