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

import "testing"

func TestChatMetricsCounters(t *testing.T) {
	baseline := snapshotChatMetrics()
	t.Cleanup(func() {
		restoreChatMetrics(baseline)
	})

	incChatConnections()
	if chatConnections.Value() != baseline.connections+1 {
		t.Fatalf("chatConnections = %d, want %d", chatConnections.Value(), baseline.connections+1)
	}

	decChatConnections()
	if chatConnections.Value() != baseline.connections {
		t.Fatalf("chatConnections after dec = %d, want %d", chatConnections.Value(), baseline.connections)
	}

	incChatMessages()
	if chatMessagesTotal.Value() != baseline.messages+1 {
		t.Fatalf("chatMessagesTotal = %d, want %d", chatMessagesTotal.Value(), baseline.messages+1)
	}

	incChatRateLimited()
	if chatRateLimitedTotal.Value() != baseline.rateLimited+1 {
		t.Fatalf("chatRateLimitedTotal = %d, want %d", chatRateLimitedTotal.Value(), baseline.rateLimited+1)
	}

	incChatErrors()
	if chatErrorsTotal.Value() != baseline.errors+1 {
		t.Fatalf("chatErrorsTotal = %d, want %d", chatErrorsTotal.Value(), baseline.errors+1)
	}
}

type chatMetricsSnapshot struct {
	connections int64
	messages    int64
	rateLimited int64
	errors      int64
}

func snapshotChatMetrics() chatMetricsSnapshot {
	return chatMetricsSnapshot{
		connections: chatConnections.Value(),
		messages:    chatMessagesTotal.Value(),
		rateLimited: chatRateLimitedTotal.Value(),
		errors:      chatErrorsTotal.Value(),
	}
}

func restoreChatMetrics(snapshot chatMetricsSnapshot) {
	chatConnections.Set(snapshot.connections)
	chatMessagesTotal.Set(snapshot.messages)
	chatRateLimitedTotal.Set(snapshot.rateLimited)
	chatErrorsTotal.Set(snapshot.errors)
}
