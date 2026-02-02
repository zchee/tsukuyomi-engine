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
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-json-experiment/json"
	"nhooyr.io/websocket"
)

const (
	defaultMaxMessageLen = 280
	defaultMaxNameLen    = 24
	sendBufferSize       = 16
)

type chatHandler struct {
	hub           *chatHub
	logger        *slog.Logger
	maxMessageLen int
	maxNameLen    int
}

type chatHub struct {
	mu      sync.RWMutex
	clients map[string]*chatClient
}

type chatClient struct {
	id   string
	name string
	conn *websocket.Conn
	send chan serverEvent
}

type clientMessage struct {
	Type string `json:"type,omitempty"`
	Body string `json:"body,omitempty"`
}

type serverEvent struct {
	Type   string     `json:"type,omitempty"`
	Action string     `json:"action,omitempty"`
	From   *presence  `json:"from,omitzero"`
	Body   string     `json:"body,omitempty"`
	Users  []presence `json:"users,omitempty"`
	At     string     `json:"at,omitempty"`
}

type presence struct {
	ID   string `json:"id,omitempty"`
	Name string `json:"name,omitempty"`
}

func newChatHandler(hub *chatHub, logger *slog.Logger, maxMessageLen int, maxNameLen int) *chatHandler {
	if logger == nil {
		logger = slog.Default()
	}
	if maxMessageLen <= 0 {
		maxMessageLen = defaultMaxMessageLen
	}
	if maxNameLen <= 0 {
		maxNameLen = defaultMaxNameLen
	}
	return &chatHandler{
		hub:           hub,
		logger:        logger,
		maxMessageLen: maxMessageLen,
		maxNameLen:    maxNameLen,
	}
}

func (h *chatHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		h.logger.Warn("websocket accept failed", "err", err)
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	clientID := newClientID()
	fallbackName := "Guest-" + clientID[:4]
	name := normalizeName(r.URL.Query().Get("name"), fallbackName, h.maxNameLen)

	client := &chatClient{
		id:   clientID,
		name: name,
		conn: conn,
		send: make(chan serverEvent, sendBufferSize),
	}

	h.hub.register(client)
	defer h.hub.unregister(client.id)

	ctx := r.Context()
	go client.writeLoop(ctx, h.logger)

	client.enqueue(serverEvent{
		Type:  "welcome",
		From:  client.presence(),
		Users: h.hub.snapshot(),
		At:    time.Now().UTC().Format(time.RFC3339),
	})

	h.hub.broadcast(serverEvent{
		Type:   "presence",
		Action: "join",
		From:   client.presence(),
		At:     time.Now().UTC().Format(time.RFC3339),
	})

	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			if errors.Is(err, context.Canceled) || websocket.CloseStatus(err) != -1 {
				return
			}
			h.logger.Warn("websocket read failed", "err", err)
			return
		}

		if len(data) == 0 {
			continue
		}

		var msg clientMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			h.logger.Warn("invalid client message", "err", err)
			continue
		}

		switch msg.Type {
		case "chat":
			body, ok := normalizeMessage(msg.Body, h.maxMessageLen)
			if !ok {
				continue
			}
			h.hub.broadcast(serverEvent{
				Type: "chat",
				From: client.presence(),
				Body: body,
				At:   time.Now().UTC().Format(time.RFC3339),
			})
		case "name":
			updated := normalizeName(msg.Body, fallbackName, h.maxNameLen)
			if updated == client.name {
				continue
			}
			previous := client.name
			client.name = updated
			h.hub.broadcast(serverEvent{
				Type:   "presence",
				Action: "rename",
				From:   client.presence(),
				Body:   previous,
				At:     time.Now().UTC().Format(time.RFC3339),
			})
		}
	}
}

func (c *chatClient) presence() *presence {
	return &presence{ID: c.id, Name: c.name}
}

func (c *chatClient) enqueue(event serverEvent) {
	select {
	case c.send <- event:
	default:
	}
}

func (c *chatClient) writeLoop(ctx context.Context, logger *slog.Logger) {
	for event := range c.send {
		payload, err := json.Marshal(event)
		if err != nil {
			logger.Warn("failed to encode event", "err", err)
			continue
		}

		writeCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		err = c.conn.Write(writeCtx, websocket.MessageText, payload)
		cancel()
		if err != nil {
			logger.Warn("failed to write websocket message", "err", err)
			return
		}
	}
}

func newChatHub() *chatHub {
	return &chatHub{clients: make(map[string]*chatClient)}
}

func (h *chatHub) register(client *chatClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client.id] = client
}

func (h *chatHub) unregister(id string) {
	h.mu.Lock()
	client, ok := h.clients[id]
	if ok {
		delete(h.clients, id)
	}
	h.mu.Unlock()

	if ok {
		close(client.send)
		h.broadcast(serverEvent{
			Type:   "presence",
			Action: "leave",
			From:   client.presence(),
			At:     time.Now().UTC().Format(time.RFC3339),
		})
	}
}

func (h *chatHub) snapshot() []presence {
	h.mu.RLock()
	defer h.mu.RUnlock()
	users := make([]presence, 0, len(h.clients))
	for _, client := range h.clients {
		users = append(users, *client.presence())
	}
	return users
}

func (h *chatHub) broadcast(event serverEvent) {
	h.mu.RLock()
	clients := make([]*chatClient, 0, len(h.clients))
	for _, client := range h.clients {
		clients = append(clients, client)
	}
	h.mu.RUnlock()

	for _, client := range clients {
		client.enqueue(event)
	}
}

func newClientID() string {
	var buffer [8]byte
	if _, err := rand.Read(buffer[:]); err != nil {
		return hex.EncodeToString([]byte(time.Now().Format("150405.000000")))
	}
	return hex.EncodeToString(buffer[:])
}

func normalizeName(raw string, fallback string, maxLen int) string {
	candidate := normalizeWhitespace(raw)
	if candidate == "" {
		candidate = fallback
	}
	return truncateRunes(candidate, maxLen)
}

func normalizeMessage(raw string, maxLen int) (string, bool) {
	candidate := normalizeWhitespace(raw)
	if candidate == "" {
		return "", false
	}
	return truncateRunes(candidate, maxLen), true
}

func normalizeWhitespace(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	return strings.Join(strings.Fields(trimmed), " ")
}

func truncateRunes(value string, maxLen int) string {
	if maxLen <= 0 {
		return value
	}
	runes := []rune(value)
	if len(runes) <= maxLen {
		return value
	}
	return string(runes[:maxLen])
}
