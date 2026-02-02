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
	"expvar"
	"log/slog"
	"net/http"
	"os"
)

type Config struct {
	StaticDir              string
	ChatEnabled            bool
	ChatMaxMessageLen      int
	ChatMaxNameLen         int
	ChatRateLimitPerSecond float64
	ChatRateLimitBurst     float64
	MetricsEnabled         bool
}

func NewMux(cfg Config, logger *slog.Logger) *http.ServeMux {
	if logger == nil {
		logger = slog.Default()
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthHandler)

	if cfg.MetricsEnabled {
		mux.Handle("/debug/vars", expvar.Handler())
	}

	if cfg.ChatEnabled {
		chatHub := newChatHub()
		chatHandler := newChatHandler(
			chatHub,
			logger,
			cfg.ChatMaxMessageLen,
			cfg.ChatMaxNameLen,
			cfg.ChatRateLimitPerSecond,
			cfg.ChatRateLimitBurst,
		)
		mux.Handle("/ws", chatHandler)
	}

	if cfg.StaticDir != "" {
		info, err := os.Stat(cfg.StaticDir)
		if err != nil {
			logger.Warn("static directory unavailable; skipping", "dir", cfg.StaticDir, "err", err)
			return mux
		}
		if !info.IsDir() {
			logger.Warn("static path is not a directory; skipping", "dir", cfg.StaticDir)
			return mux
		}
		mux.Handle("/", http.FileServer(http.Dir(cfg.StaticDir)))
	}

	return mux
}
