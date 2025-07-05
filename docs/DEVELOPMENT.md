# Development Guide for TataOroWhatsAppGPT

**Purpose**: Complete guide for local development, testing, and deployment  
**Audience**: Developers, contributors  
**Last Updated**: Version 1.0.0  
**Status**: CURRENT - COMPLETE DEVELOPMENT GUIDE

## Prerequisites

### Required Tools

- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Version 8+ (comes with Node.js)
- **Wrangler CLI**: Latest version
- **Git**: For version control

### Installation

```bash
# Install Node.js (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
nvm use --lts

# Install Wrangler CLI globally
npm install -g wrangler

# Verify installations
node --version
npm --version
wrangler --version
```

## Project Setup

### Clone Repository

```bash
git clone https://github.com/your-username/TataOroWhatsAppGPT.git
cd TataOroWhatsAppGPT
```

### Install Dependencies

```bash
npm install
```

### Environment Configuration

#### 1. Cloudflare Authentication

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

#### 2. Create Environment Files

```bash
# Create local environment file
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

#### 3. Required Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACyour-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Email Configuration (Resend)
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
EMAIL_FROM=consultations@yourdomain.com
EMAIL_TO=admin@yourdomain.com
RESEND_API_KEY=re_your-resend-api-key

# Shopify Configuration
SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com
SHOPIFY_API_TOKEN=shpat_your-shopify-token

# System Configuration
WHATSAPP_BASE_URL=https://yourworker.yourdomain.workers.dev
ADMIN_PASSWORD=your-secure-admin-password
```

#### 4. Set Wrangler Secrets

```bash
# Set secrets for production
wrangler secret put OPENAI_API_KEY
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put RESEND_API_KEY
wrangler secret put SHOPIFY_API_TOKEN
wrangler secret put ADMIN_PASSWORD
```

## Local Development

### Start Development Server

```bash
# Start local development server
wrangler dev

# Server will be available at:
# http://localhost:8787
```

### Development Workflow

1. **Make changes** to code in `workers/` or `shared/`
2. **Save files** - Wrangler will automatically reload
3. **Test locally** using curl or browser
4. **Check logs** in terminal for debugging

### Local Testing

#### Test WhatsApp Webhook

```bash
# Test basic webhook
curl -X POST http://localhost:8787/whatsapp/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890" \
  -d "To=whatsapp:+1415523886" \
  -d "Body=Hello world"
```

#### Test with Media

```bash
# Test with image
curl -X POST http://localhost:8787/whatsapp/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890" \
  -d "To=whatsapp:+1415523886" \
  -d "Body=Here is my hair photo" \
  -d "NumMedia=1" \
  -d "MediaUrl0=https://example.com/test-image.jpg" \
  -d "MediaContentType0=image/jpeg"
```

#### Test Admin Interface

```bash
# Test admin dashboard
curl "http://localhost:8787/admin?password=your-admin-password"
```

## Testing

### Run Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- __tests__/gpt.test.js

# Run tests with coverage
npm run test:coverage
```

### Test Structure

```
__tests__/
├── adminHtml.test.js       # Admin interface tests
├── chunker.test.js         # Document chunking tests
├── emailer.test.js         # Email functionality tests
├── embeddings.test.js      # OpenAI embeddings tests
├── gpt.test.js             # GPT integration tests
├── mockEnv.js              # Mock environment utilities
├── prompt-builder.test.js  # Prompt building tests
├── r2.test.js              # R2 storage tests
├── router.test.js          # Router logic tests
├── shopify.test.js         # Shopify integration tests
├── summary.test.js         # Summary generation tests
├── systemPrompt.test.js    # System prompt tests
└── whatsapp-audio.test.js  # Audio processing tests
```

### Writing Tests

```javascript
// Example test structure
import { describe, it, expect } from "vitest";
import { mockEnv } from "./mockEnv.js";
import { yourFunction } from "../shared/yourModule.js";

describe("Your Module", () => {
  it("should do something", async () => {
    const env = mockEnv();
    const result = await yourFunction(env, "test-input");
    expect(result).toBe("expected-output");
  });
});
```

## Debugging

### Enable Debug Logging

```bash
# Set debug environment variable
export DEBUG=true

# Start with verbose logging
wrangler dev --log-level debug
```

### Common Debug Techniques

```javascript
// Add console.log statements
console.log("Debug info:", { variable, context });

// Use structured logging
console.log(
  JSON.stringify({
    event: "webhook_received",
    phone: phone,
    timestamp: new Date().toISOString(),
  })
);

// Check environment variables
console.log("Environment check:", {
  hasOpenAI: !!env.OPENAI_API_KEY,
  hasTwilio: !!env.TWILIO_AUTH_TOKEN,
});
```

### Monitoring Logs

```bash
# View real-time logs
wrangler tail

# View logs with filtering
wrangler tail --format pretty

# View logs for specific deployment
wrangler tail --env production
```

## Deployment

### Development Deployment

```bash
# Deploy to development environment
wrangler deploy --env development

# Deploy with specific name
wrangler deploy --name tataoro-dev
```

### Production Deployment

```bash
# Deploy to production
wrangler deploy --env production

# Deploy with version tag
wrangler deploy --env production --compatibility-date 2024-01-15
```

### Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables set
- [ ] Secrets configured
- [ ] KV namespaces created
- [ ] R2 buckets created
- [ ] Domain configured
- [ ] Webhooks updated
- [ ] Documentation updated

## Configuration Management

### Wrangler Configuration

```toml
# wrangler.toml
name = "tataoro-whatsapp-gpt"
main = "workers/router.js"
compatibility_date = "2024-01-15"

# Production environment
[env.production]
name = "tataoro-production"
route = "https://wa.tataoro.com/*"

# Development environment
[env.development]
name = "tataoro-development"
route = "https://dev.wa.tataoro.com/*"

# KV Namespaces
[[kv_namespaces]]
binding = "CHAT_HISTORY"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"

# R2 Buckets
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "tataoro-media"
preview_bucket_name = "tataoro-media-preview"

# Environment Variables
[vars]
EMAIL_ENABLED = true
EMAIL_PROVIDER = "resend"
EMAIL_FROM = "consultations@tataoro.com"
WHATSAPP_BASE_URL = "https://wa.tataoro.com"
```

### Creating Resources

#### KV Namespaces

```bash
# Create KV namespace
wrangler kv:namespace create "CHAT_HISTORY"
wrangler kv:namespace create "CHAT_HISTORY" --preview

# List existing namespaces
wrangler kv:namespace list
```

#### R2 Buckets

```bash
# Create R2 bucket
wrangler r2 bucket create tataoro-media

# List existing buckets
wrangler r2 bucket list
```

## External Service Setup

### Twilio Configuration

1. **Create Twilio Account** at https://twilio.com
2. **Get WhatsApp Sandbox** number
3. **Configure Webhook URL**: `https://your-domain.com/whatsapp/incoming`
4. **Set up Messaging Service** (production)
5. **Configure Phone Number** for WhatsApp Business

### OpenAI Setup

1. **Create OpenAI Account** at https://platform.openai.com
2. **Generate API Key** in API settings
3. **Set up Billing** (required for GPT-4o)
4. **Configure Usage Limits** (optional)

### Resend Email Setup

1. **Create Resend Account** at https://resend.com
2. **Verify Domain** for email sending
3. **Generate API Key**
4. **Configure DNS Records** for domain verification

### Shopify Integration

1. **Create Private App** in Shopify Admin
2. **Configure Permissions**: Read/Write customers
3. **Generate API Token**
4. **Test Connection** with sample customer

## Performance Optimization

### Code Optimization

```javascript
// Use efficient data structures
const cache = new Map();

// Minimize API calls
const batchResults = await Promise.all(apiCalls);

// Use streaming for large responses
return new Response(stream, {
  headers: { "Content-Type": "text/plain" },
});
```

### Resource Management

```javascript
// Proper error handling
try {
  const result = await externalAPI();
  return result;
} catch (error) {
  console.error("API Error:", error);
  return fallbackResponse;
}

// Memory management
const processLargeData = async (data) => {
  // Process in chunks to avoid memory issues
  const chunkSize = 1000;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await processChunk(chunk);
  }
};
```

## Troubleshooting

### Common Issues

#### "Module not found" errors

```bash
# Check file paths and imports
# Ensure relative paths are correct
import { helper } from '../shared/helper.js';
```

#### "Environment variable not set" errors

```bash
# Check wrangler.toml configuration
# Verify secrets are set
wrangler secret list
```

#### "KV namespace not found" errors

```bash
# Verify KV namespace IDs in wrangler.toml
# Check binding names match code
```

#### "R2 bucket not found" errors

```bash
# Verify R2 bucket names and bindings
# Check bucket exists in dashboard
```

### Getting Help

1. **Check logs** with `wrangler tail`
2. **Review documentation** in `docs/`
3. **Check GitHub issues** for known problems
4. **Test with minimal example** to isolate issues
5. **Ask for help** with specific error messages

## Best Practices

### Code Quality

- **Use TypeScript** for better type safety
- **Write tests** for all new functionality
- **Follow naming conventions** from existing code
- **Add JSDoc comments** for complex functions
- **Keep functions small** and focused

### Security

- **Never commit secrets** to version control
- **Use environment variables** for configuration
- **Validate all inputs** from external sources
- **Implement rate limiting** for public endpoints
- **Use HTTPS** for all communications

### Performance

- **Minimize bundle size** by avoiding large dependencies
- **Use caching** where appropriate
- **Implement proper error handling** with fallbacks
- **Monitor resource usage** in production
- **Optimize for edge computing** patterns

---

**Remember**: This is a Cloudflare Workers project, not a traditional Node.js application. The runtime environment is different, so some Node.js patterns may not work. Always test locally with `wrangler dev` before deploying.
