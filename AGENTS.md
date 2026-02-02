# Repository Guidelines

This document provides contributor guidelines for the tsukuyomi-engine project. Follow these standards to ensure consistency and quality across the codebase.

## Tsukuyomi

超かぐや姫！
- https://note.com/u_ta_life/n/n03deb980283e
- https://virtualgorillaplus.com/anime/cosmic-princess-kaguya-last/
- https://note.com/asada_kadura/n/n457ca090d99f

## Project Structure & Module Organization

This is a Go module-based project with the following structure:

```
tsukuyomi-engine/
├── .github/              # GitHub configuration and automation
│   ├── workflows/        # GitHub Actions CI/CD workflows
│   ├── ISSUE_TEMPLATE/   # Issue templates for bug reports
│   ├── CODEOWNERS        # Code ownership definitions
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── dependabot.yaml   # Dependabot configuration
│   └── renovate.json5    # Renovate bot configuration
├── hack/                 # Build and development scripts
│   └── boilerplate/      # License header templates
├── CODE_OF_CONDUCT.md    # Community guidelines
├── LICENSE               # Apache License 2.0
├── README.md             # Project documentation
├── go.mod                # Go module definition
└── go.sum                # Go module checksums
```

**Source Code Location**: Go source files will be organized in standard Go project layout when added (e.g., `pkg/`, `cmd/`, `internal/`).

**Module Information**:
- Module path: `github.com/zchee/tsukuyomi-engine`
- Go version: 1.26+

## Build, Test, and Development Commands

### Standard Go Commands

```bash
# Build the project
go build ./...

# Run tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run tests with race detector
go test -race ./...

# Format code
gofmt -s -w .

# Run Go vet
go vet ./...

# Tidy dependencies
go mod tidy

# Download dependencies
go mod download

# Verify dependencies
go mod verify
```

### Code Quality

```bash
# Run golangci-lint (when configured)
golangci-lint run

# Check for vulnerabilities
go run golang.org/x/vuln/cmd/govulncheck@latest ./...
```

## Coding Style & Naming Conventions

This project follows the [Google Go Style Guide](https://google.github.io/styleguide/go/).

### General Rules

- **Go Version**: Use Go 1.26 or higher
- **Formatting**: Run `gofmt -s -w .` before committing
- **Interfaces**: Use `any` instead of `interface{}`
- **Generics**: Use generic types when appropriate
- **Godoc Comments**: Always end with a period
- **File Headers**: All Go files must include the Apache 2.0 license header (see `hack/boilerplate/boilerplate.go.txt`)

### Naming Conventions

- **Packages**: Short, lowercase, no underscores (e.g., `engine`, `config`)
- **Types**: PascalCase (e.g., `EngineConfig`, `TaskRunner`)
- **Functions/Methods**: PascalCase for exported, camelCase for unexported
- **Variables**: camelCase for local, PascalCase for exported package-level
- **Constants**: PascalCase or ALL_CAPS for package-level

### Code Structure

- Expand struct fields for readability when initializing complex structures
- Avoid `No newline at end of file` errors
- Use third-party packages when they provide significant value, but prefer standard library when functionality overlaps
- For JSON handling, prefer `github.com/go-json-experiment/json` over `encoding/json`

### JSON Struct Tags

```go
type Example struct {
    // Primitive types: non-pointer with omitempty
    Name string `json:"name,omitempty"`
    Age  int    `json:"age,omitempty"`

    // Struct types: pointer with omitzero
    Config *Config `json:"config,omitzero"`
    Meta   *Meta   `json:"meta,omitzero"`
}
```

## Testing Guidelines

### Testing Framework

- Use standard `testing` package
- Use `github.com/google/go-cmp/cmp` for assertions
- Use `testing/synctest` for concurrent code testing

### Test Structure

All tests must follow this pattern:

```go
func TestFunctionName(t *testing.T) {
    tests := map[string]struct {
        input    string
        expected string
        wantErr  bool
    }{
        "success: basic case": {
            input:    "hello",
            expected: "HELLO",
        },
        "error: empty input": {
            input:   "",
            wantErr: true,
        },
    }

    for name, tt := range tests {
        t.Run(name, func(t *testing.T) {
            // Use t.Context() instead of context.Background()
            ctx := t.Context()

            got, err := FunctionName(ctx, tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("FunctionName() error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            if diff := cmp.Diff(tt.expected, got); diff != "" {
                t.Errorf("FunctionName() mismatch (-want +got):\n%s", diff)
            }
        })
    }
}
```

### Test Naming Conventions

- Test functions: `Test<FunctionName>`
- Benchmark functions: `Benchmark<FunctionName>`
- Example functions: `Example<FunctionName>`
- Test cases: Use descriptive strings like `"success: basic case"` or `"error: invalid input"`

### Test Requirements

- **Coverage**: Write tests for all public functions
- **Context**: Always use `t.Context()` instead of `context.Background()`
- **No Hard-coding**: Implement general solutions, not test-specific logic
- **Real APIs**: For tests requiring API keys, make actual API calls (no mocks for external services)
- **Verbosity**: Write verbose tests that help with debugging
- **Test Data**: Use table-driven tests with `map[string]struct{...}` pattern

### Benchmark Tests

```go
func BenchmarkFunction(b *testing.B) {
    // Use b.Loop() when appropriate (Go 1.26+)
    for b.Loop() {
        Function()
    }
}
```

## Commit & Pull Request Guidelines

### Commit Message Format

Based on project history and configuration:

```
<prefix>: <subject>

<body>
```

**Prefixes**:
- `go.mod`: Go dependency updates
- `tools`: Tools directory updates
- `gha`: GitHub Actions workflow changes
- `github`: GitHub configuration changes
- `pkg/<name>`: Package-specific changes
- `cmd/<name>`: Command-specific changes

**Examples**:
```
go.mod: update golang.org/x/tools to v0.15.0

gha: add CI workflow for Go tests

pkg/engine: implement core engine logic
```

### Commit Signing

All commits must be signed and include sign-off:

```bash
git commit --gpg-sign --signoff -m "commit message"
```

### Pull Request Requirements

1. **Title**: Use the same format as commit messages with appropriate prefix
2. **Description**: Complete the PR template sections:
   - **Why**: Describe the motivation for the change
3. **Testing**: Ensure all tests pass and add new tests for new functionality
4. **Code Review**: Address all review comments before merging
5. **Dependencies**: If dependencies are updated, both Dependabot and Renovate configurations are in place

### Code Review Process

- PRs require approval from code owners (see `.github/CODEOWNERS`)
- All CI checks must pass
- Follow up on review comments promptly
- Keep PRs focused and reasonably sized

## Dependency Management

### Automated Updates

This project uses two systems for dependency management:

1. **Dependabot**: Configured for daily updates (11:00 JST)
   - Go modules (main and `/tools`)
   - GitHub Actions

2. **Renovate**: Configured for daily updates
   - Semantic commits enabled
   - Auto-runs `go mod tidy`
   - Groups updates under "deps"

### Manual Dependency Updates

```bash
# Add a new dependency
go get github.com/example/package@latest

# Update a specific dependency
go get -u github.com/example/package

# Update all dependencies
go get -u ./...

# Clean up
go mod tidy
```

## Security & Configuration

### License Headers

All Go source files must include the Apache 2.0 license header. Use the template from `hack/boilerplate/boilerplate.go.txt`:

```go
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
```

### Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Report violations to zchee.io@gmail.com.

## Agent-Specific Instructions

### For AI Code Assistants

When working with this codebase:

1. **Always Read Before Writing**: Never modify files without reading them first
2. **Follow Google Go Style**: Adhere to all guidelines in the Google Go Style Guide
3. **Use MCP Tools**: Leverage `gopls` MCP server for Go-specific operations
4. **Test Coverage**: Write comprehensive tests using the patterns defined above
5. **No Over-Engineering**: Keep solutions simple and focused
6. **No Dead Code**: Remove unused code completely
7. **Consistent Naming**: Follow existing patterns in the codebase

### Common Pitfalls to Avoid

- Don't use `interface{}`, use `any`
- Don't skip license headers
- Don't create solutions that only work for specific test cases
- Don't use mocks for external services
- Don't forget to run `gofmt -s -w .` before committing
- Don't commit without signing (`--gpg-sign --signoff`)

## Questions or Issues?

- Open an issue using the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- Follow the Code of Conduct in all interactions
- Contact maintainers through GitHub issues
