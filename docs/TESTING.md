# Testing Guide for TataOroWhatsAppGPT

**Purpose**: Complete testing strategy, coverage goals, and instructions for all test types  
**Audience**: Developers, QA engineers, contributors  
**Last Updated**: Version 1.0.0  
**Status**: CURRENT - COMPLETE TESTING GUIDE

## Testing Philosophy

### Core Principles

- **Test behavior, not implementation** - Focus on what the code does, not how
- **Test critical paths first** - WhatsApp integration, AI responses, data persistence
- **Fail fast, fail clearly** - Tests should provide actionable error messages
- **Test edge cases** - Empty inputs, network failures, malformed data
- **Keep tests maintainable** - Simple, readable, and easy to update

### Testing Pyramid

```
    E2E Tests (Few)
   ┌─────────────────┐
   │ Integration     │ (Some)
   ├─────────────────┤
   │ Unit Tests      │ (Many)
   └─────────────────┘
```

## Test Structure

### Test Organization

```
__tests__/
├── unit/                   # Unit tests for individual modules
│   ├── gpt.test.js        # GPT integration tests
│   ├── chunker.test.js    # Document chunking tests
│   ├── emailer.test.js    # Email functionality tests
│   ├── embeddings.test.js # OpenAI embeddings tests
│   ├── r2.test.js         # R2 storage tests
│   ├── shopify.test.js    # Shopify integration tests
│   ├── summary.test.js    # Summary generation tests
│   └── systemPrompt.test.js # System prompt tests
├── integration/           # Integration tests
│   ├── router.test.js     # Router logic tests
│   ├── whatsapp-audio.test.js # Audio processing tests
│   └── adminHtml.test.js  # Admin interface tests
├── e2e/                   # End-to-end tests (future)
├── fixtures/              # Test data and fixtures
└── mockEnv.js            # Mock environment utilities
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- __tests__/gpt.test.js

# Run tests matching pattern
npm test -- --grep "WhatsApp"
```

### Test Environment Setup

```bash
# Set test environment variables
export NODE_ENV=test

# Run tests with debug output
DEBUG=true npm test

# Run tests with verbose output
npm test -- --verbose
```

## Unit Tests

### Testing Individual Modules

#### GPT Integration Tests

```javascript
// __tests__/gpt.test.js
import { describe, it, expect, vi } from "vitest";
import { mockEnv } from "./mockEnv.js";
import { callGPT } from "../shared/gpt.js";

describe("GPT Integration", () => {
  it("should handle text-only messages", async () => {
    const env = mockEnv();
    const messages = [{ role: "user", content: "Hello" }];

    const result = await callGPT(env, messages);

    expect(result).toBeDefined();
    expect(result.content).toContain("Tata Oro");
  });

  it("should handle image messages", async () => {
    const env = mockEnv();
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze my hair" },
          {
            type: "image_url",
            image_url: { url: "https://example.com/hair.jpg" },
          },
        ],
      },
    ];

    const result = await callGPT(env, messages);

    expect(result).toBeDefined();
    expect(result.content).toContain("hair");
  });

  it("should handle API errors gracefully", async () => {
    const env = mockEnv({
      OPENAI_API_KEY: "invalid-key",
    });
    const messages = [{ role: "user", content: "Hello" }];

    await expect(callGPT(env, messages)).rejects.toThrow("OpenAI API error");
  });
});
```

#### R2 Storage Tests

```javascript
// __tests__/r2.test.js
import { describe, it, expect } from "vitest";
import { mockEnv } from "./mockEnv.js";
import { uploadToR2, deleteR2Objects } from "../shared/r2.js";

describe("R2 Storage", () => {
  it("should upload media to R2", async () => {
    const env = mockEnv();
    const key = "whatsapp:+1234567890/test.jpg";
    const data = new Uint8Array([1, 2, 3, 4]);

    const url = await uploadToR2(env, key, data, "image/jpeg");

    expect(url).toContain("images/");
    expect(url).toContain(encodeURIComponent(key));
  });

  it("should delete multiple objects", async () => {
    const env = mockEnv();
    const keys = ["whatsapp:+1234567890/test1.jpg", "whatsapp:+1234567890/test2.jpg"];

    await expect(deleteR2Objects(env, keys)).resolves.not.toThrow();
  });

  it("should handle invalid keys gracefully", async () => {
    const env = mockEnv();
    const invalidKeys = ["", null, undefined];

    await expect(deleteR2Objects(env, invalidKeys)).resolves.not.toThrow();
  });
});
```

### Mock Environment Setup

```javascript
// __tests__/mockEnv.js
export function mockEnv(overrides = {}) {
  return {
    // OpenAI Configuration
    OPENAI_API_KEY: "sk-test-key",

    // Twilio Configuration
    TWILIO_ACCOUNT_SID: "AC-test-sid",
    TWILIO_AUTH_TOKEN: "test-auth-token",
    TWILIO_WHATSAPP_NUMBER: "whatsapp:+1234567890",

    // Email Configuration
    EMAIL_ENABLED: "true",
    EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: "re-test-key",

    // Shopify Configuration
    SHOPIFY_STORE_DOMAIN: "test-store.myshopify.com",
    SHOPIFY_API_TOKEN: "shpat-test-token",

    // System Configuration
    WHATSAPP_BASE_URL: "https://test.example.com",

    // Mock KV Storage
    CHAT_HISTORY: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },

    // Mock R2 Storage
    MEDIA_BUCKET: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ objects: [] }),
    },

    // Apply overrides
    ...overrides,
  };
}
```

## Integration Tests

### Router Tests

```javascript
// __tests__/router.test.js
import { describe, it, expect } from "vitest";
import { mockEnv } from "./mockEnv.js";
import router from "../workers/router.js";

describe("Router Integration", () => {
  it("should route WhatsApp webhooks correctly", async () => {
    const env = mockEnv();
    const request = new Request("https://test.com/whatsapp/incoming", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "From=whatsapp:+1234567890&Body=Hello",
    });

    const response = await router.fetch(request, env);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/xml");
  });

  it("should serve admin interface with password", async () => {
    const env = mockEnv({ ADMIN_PASSWORD: "test-password" });
    const request = new Request("https://test.com/admin?password=test-password");

    const response = await router.fetch(request, env);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
  });

  it("should reject admin access without password", async () => {
    const env = mockEnv({ ADMIN_PASSWORD: "test-password" });
    const request = new Request("https://test.com/admin");

    const response = await router.fetch(request, env);

    expect(response.status).toBe(401);
  });
});
```

### WhatsApp Audio Processing Tests

```javascript
// __tests__/whatsapp-audio.test.js
import { describe, it, expect } from "vitest";
import { mockEnv } from "./mockEnv.js";
import { processAudioMessage } from "../workers/whatsapp-incoming.js";

describe("WhatsApp Audio Processing", () => {
  it("should transcribe audio using Whisper", async () => {
    const env = mockEnv();
    const audioUrl = "https://api.twilio.com/media/audio.mp3";
    const phone = "+1234567890";

    const result = await processAudioMessage(env, audioUrl, phone);

    expect(result).toBeDefined();
    expect(result.content).toContain("[Audio transcription]");
  });

  it("should handle transcription errors", async () => {
    const env = mockEnv({ OPENAI_API_KEY: "invalid-key" });
    const audioUrl = "https://api.twilio.com/media/invalid.mp3";
    const phone = "+1234567890";

    await expect(processAudioMessage(env, audioUrl, phone)).rejects.toThrow();
  });
});
```

## Test Coverage

### Coverage Goals

- **Unit Tests**: 90%+ coverage for shared modules
- **Integration Tests**: 80%+ coverage for critical paths
- **E2E Tests**: 100% coverage for user workflows

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html

# Check coverage thresholds
npm run test:coverage -- --reporter=threshold
```

### Coverage Configuration

```javascript
// vitest.config.js
export default {
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      exclude: ["__tests__/**", "coverage/**", "node_modules/**"],
    },
  },
};
```

## Testing Strategies

### WhatsApp Integration Testing

```javascript
// Test WhatsApp webhook scenarios
const whatsappScenarios = [
  {
    name: "text message",
    body: "From=whatsapp:+1234567890&Body=Hello",
  },
  {
    name: "image message",
    body: "From=whatsapp:+1234567890&Body=Photo&NumMedia=1&MediaUrl0=https://example.com/image.jpg",
  },
  {
    name: "audio message",
    body: "From=whatsapp:+1234567890&NumMedia=1&MediaUrl0=https://example.com/audio.mp3&MediaContentType0=audio/mpeg",
  },
  {
    name: "reset command",
    body: "From=whatsapp:+1234567890&Body=reset",
  },
];

whatsappScenarios.forEach((scenario) => {
  it(`should handle ${scenario.name}`, async () => {
    // Test implementation
  });
});
```

### Error Handling Testing

```javascript
// Test error scenarios
const errorScenarios = [
  {
    name: "OpenAI API failure",
    setup: () => mockEnv({ OPENAI_API_KEY: "invalid" }),
  },
  {
    name: "KV storage failure",
    setup: () =>
      mockEnv({
        CHAT_HISTORY: {
          get: vi.fn().mockRejectedValue(new Error("KV error")),
        },
      }),
  },
  {
    name: "R2 storage failure",
    setup: () =>
      mockEnv({
        MEDIA_BUCKET: {
          put: vi.fn().mockRejectedValue(new Error("R2 error")),
        },
      }),
  },
];
```

### Performance Testing

```javascript
// Test performance characteristics
describe("Performance Tests", () => {
  it("should respond to webhooks within 5 seconds", async () => {
    const start = Date.now();
    const env = mockEnv();
    const request = new Request("https://test.com/whatsapp/incoming", {
      method: "POST",
      body: "From=whatsapp:+1234567890&Body=Hello",
    });

    await router.fetch(request, env);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000);
  });

  it("should handle concurrent requests", async () => {
    const env = mockEnv();
    const requests = Array(10)
      .fill()
      .map(
        () =>
          new Request("https://test.com/whatsapp/incoming", {
            method: "POST",
            body: "From=whatsapp:+1234567890&Body=Hello",
          })
      );

    const responses = await Promise.all(requests.map((req) => router.fetch(req, env)));

    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });
});
```

## Test Data Management

### Fixtures

```javascript
// __tests__/fixtures/sessions.js
export const mockSessions = {
  newUser: {
    history: [],
    progress_status: "initial",
    last_active: new Date().toISOString(),
    summary_email_sent: false,
    nudge_sent: false,
    r2Urls: [],
  },

  activeConsultation: {
    history: [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Welcome to Tata Oro!" },
    ],
    progress_status: "midway",
    last_active: new Date().toISOString(),
    summary_email_sent: false,
    nudge_sent: false,
    r2Urls: ["https://example.com/image1.jpg"],
  },

  completedConsultation: {
    history: [
      // Full conversation history
    ],
    progress_status: "complete",
    summary: "Client consultation summary...",
    summary_email_sent: true,
    nudge_sent: false,
    r2Urls: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  },
};
```

### Test Utilities

```javascript
// __tests__/utils/testHelpers.js
export function createMockRequest(path, options = {}) {
  return new Request(`https://test.com${path}`, {
    method: "GET",
    ...options,
  });
}

export function createWhatsAppRequest(body) {
  return new Request("https://test.com/whatsapp/incoming", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

export async function waitForResponse(promise, timeout = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
  ]);
}
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks
npm install --save-dev husky lint-staged

# Configure package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.js": ["npm test", "git add"]
  }
}
```

## Best Practices

### Writing Good Tests

- **Use descriptive test names** - `should handle WhatsApp image messages correctly`
- **Test one thing at a time** - Each test should verify a single behavior
- **Use arrange-act-assert pattern** - Setup, execute, verify
- **Mock external dependencies** - Don't rely on real APIs in tests
- **Test edge cases** - Empty inputs, large inputs, malformed data

### Test Maintenance

- **Keep tests simple** - Complex tests are hard to maintain
- **Update tests with code changes** - Tests should evolve with the codebase
- **Remove obsolete tests** - Don't keep tests for removed features
- **Share common setup** - Use helper functions for repeated setup
- **Document complex test scenarios** - Explain why certain tests exist

### Debugging Tests

```bash
# Run single test with debug output
DEBUG=true npm test -- __tests__/gpt.test.js

# Run tests with Node.js debugger
node --inspect-brk ./node_modules/.bin/vitest run

# Add debug statements in tests
console.log('Test state:', { variable, context });
```

---

**Remember**: Tests are documentation of how your code should behave. Write them as if you're explaining the system to a new developer who will maintain it in the future.
