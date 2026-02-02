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
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/go-cmp/cmp"
)

func TestHealthHandler(t *testing.T) {
	tests := map[string]struct {
		method     string
		wantStatus int
		wantBody   string
		wantAllow  string
		checkBody  bool
		checkAllow bool
	}{
		"success: get": {
			method:     http.MethodGet,
			wantStatus: http.StatusOK,
			wantBody:   "ok\n",
			checkBody:  true,
		},
		"error: method not allowed": {
			method:     http.MethodPost,
			wantStatus: http.StatusMethodNotAllowed,
			wantAllow:  http.MethodGet,
			checkAllow: true,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/healthz", nil).WithContext(t.Context())
			rr := httptest.NewRecorder()

			healthHandler(rr, req)

			if diff := cmp.Diff(tt.wantStatus, rr.Code); diff != "" {
				t.Fatalf("healthHandler() status mismatch (-want +got):\n%s", diff)
			}

			if tt.checkBody {
				if diff := cmp.Diff(tt.wantBody, rr.Body.String()); diff != "" {
					t.Fatalf("healthHandler() body mismatch (-want +got):\n%s", diff)
				}
			}

			if tt.checkAllow {
				if diff := cmp.Diff(tt.wantAllow, rr.Header().Get("Allow")); diff != "" {
					t.Fatalf("healthHandler() allow header mismatch (-want +got):\n%s", diff)
				}
			}
		})
	}
}
