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
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/google/go-cmp/cmp"
)

func TestNewMuxHealth(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelInfo}))
	mux := NewMux(Config{}, logger)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil).WithContext(t.Context())
	rr := httptest.NewRecorder()

	mux.ServeHTTP(rr, req)

	if diff := cmp.Diff(http.StatusOK, rr.Code); diff != "" {
		t.Fatalf("NewMux() health status mismatch (-want +got):\n%s", diff)
	}
}

func TestNewMuxStatic(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelInfo}))
	tmpDir := t.TempDir()
	indexPath := filepath.Join(tmpDir, "index.html")

	if err := os.WriteFile(indexPath, []byte("hello"), 0o600); err != nil {
		t.Fatalf("failed to write index.html: %v", err)
	}

	mux := NewMux(Config{StaticDir: tmpDir}, logger)

	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(t.Context())
	rr := httptest.NewRecorder()

	mux.ServeHTTP(rr, req)

	if diff := cmp.Diff(http.StatusOK, rr.Code); diff != "" {
		t.Fatalf("NewMux() static status mismatch (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff("hello", rr.Body.String()); diff != "" {
		t.Fatalf("NewMux() static body mismatch (-want +got):\n%s", diff)
	}
}

func TestNewMuxMissingStatic(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelInfo}))
	mux := NewMux(Config{StaticDir: filepath.Join(t.TempDir(), "missing")}, logger)

	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(t.Context())
	rr := httptest.NewRecorder()

	mux.ServeHTTP(rr, req)

	if diff := cmp.Diff(http.StatusNotFound, rr.Code); diff != "" {
		t.Fatalf("NewMux() missing static status mismatch (-want +got):\n%s", diff)
	}
}
