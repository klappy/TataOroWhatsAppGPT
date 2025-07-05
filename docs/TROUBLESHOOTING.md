# Troubleshooting Guide for TataOroWhatsAppGPT

**Purpose**: Common issues, debugging techniques, and solutions for development and production problems  
**Audience**: Developers, operators, support team  
**Last Updated**: Version 1.0.0  
**Status**: CURRENT - COMPLETE TROUBLESHOOTING GUIDE

## Quick Diagnostics

### Health Check Commands

```bash
# Check Worker status
wrangler tail --format pretty

# Test basic connectivity
curl https://wa.tataoro.com/health

# Check KV storage
wrangler kv:key list --binding CHAT_HISTORY

# Check R2 storage
wrangler r2 bucket list
```

### Environment Verification

```bash
# Verify secrets are set
wrangler secret list

# Check wrangler.toml configuration
wrangler whoami
cat wrangler.toml

# Test local development
wrangler dev --log-level debug
```

## Common Issues

### 1. WhatsApp Integration Problems

#### Issue: "Webhook not receiving messages"

**Symptoms**: No logs in `wrangler tail`, Twilio shows failed deliveries

**Diagnosis**:

```bash
# Check if Worker is deployed
wrangler deployments list

# Test webhook endpoint directly
curl -X POST https://wa.tataoro.com/whatsapp/incoming \
  -d "From=whatsapp:+1234567890&Body=test"

# Check Twilio webhook configuration
# Verify URL: https://wa.tataoro.com/whatsapp/incoming
```

**Solutions**:

1. **Redeploy Worker**: `wrangler deploy`
2. **Check domain routing**: Verify route in wrangler.toml
3. **Verify Twilio configuration**: Webhook URL must match exactly
4. **Check firewall**: Ensure Cloudflare isn't blocking Twilio IPs

#### Issue: "Invalid signature" errors

**Symptoms**: 400 errors in logs, "X-Twilio-Signature validation failed"

**Diagnosis**:

```bash
# Check if Twilio secrets are set correctly
wrangler secret list | grep TWILIO

# Test with signature validation disabled (temporarily)
# Add debug logging in webhook handler
```

**Solutions**:

1. **Verify Twilio credentials**:
   ```bash
   wrangler secret put TWILIO_AUTH_TOKEN
   wrangler secret put TWILIO_ACCOUNT_SID
   ```
2. **Check webhook URL**: Must use HTTPS and match exactly
3. **Verify request body**: Ensure no modifications in transit

#### Issue: "Media files not loading"

**Symptoms**: Images/audio not appearing in conversations, 404 errors

**Diagnosis**:

```bash
# Check R2 bucket exists
wrangler r2 bucket list

# Test image endpoint directly
curl https://wa.tataoro.com/images/test-key

# Check R2 object listing
wrangler r2 object list tataoro-media
```

**Solutions**:

1. **Verify R2 configuration**:
   ```toml
   [[r2_buckets]]
   binding = "MEDIA_BUCKET"
   bucket_name = "tataoro-media"
   ```
2. **Check object keys**: Must use proper encoding
3. **Verify permissions**: R2 bucket must allow Worker access

### 2. OpenAI API Issues

#### Issue: "OpenAI API rate limit exceeded"

**Symptoms**: 429 errors, delayed responses, failed conversations

**Diagnosis**:

```bash
# Check OpenAI API usage in dashboard
# Look for rate limit headers in logs
# Monitor request patterns
```

**Solutions**:

1. **Implement retry logic**: Add exponential backoff
2. **Reduce request frequency**: Batch or queue requests
3. **Upgrade OpenAI plan**: Increase rate limits
4. **Add request caching**: Cache similar requests

#### Issue: "Invalid OpenAI API key"

**Symptoms**: 401 errors, "Incorrect API key provided"

**Diagnosis**:

```bash
# Check if secret is set
wrangler secret list | grep OPENAI

# Test API key directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Solutions**:

1. **Update API key**: `wrangler secret put OPENAI_API_KEY`
2. **Verify key format**: Should start with `sk-`
3. **Check billing**: Ensure OpenAI account has credits
4. **Verify permissions**: Key must have access to required models

#### Issue: "GPT responses are inconsistent"

**Symptoms**: Random response quality, conversation context lost

**Diagnosis**:

```bash
# Check system prompt configuration
# Review conversation history in KV
# Monitor token usage patterns
```

**Solutions**:

1. **Review system prompt**: Ensure clear instructions
2. **Check conversation history**: Verify context preservation
3. **Adjust temperature**: Lower for more consistent responses
4. **Monitor token limits**: Ensure context fits within limits

### 3. Storage Issues

#### Issue: "KV operations failing"

**Symptoms**: Session data not persisting, "KV namespace not found"

**Diagnosis**:

```bash
# Check KV namespace configuration
wrangler kv:namespace list

# Test KV operations
wrangler kv:key put --binding CHAT_HISTORY "test" "value"
wrangler kv:key get --binding CHAT_HISTORY "test"
```

**Solutions**:

1. **Verify KV binding**:
   ```toml
   [[kv_namespaces]]
   binding = "CHAT_HISTORY"
   id = "your-namespace-id"
   ```
2. **Check permissions**: Worker must have KV access
3. **Create namespace**: `wrangler kv:namespace create "CHAT_HISTORY"`
4. **Update wrangler.toml**: Use correct namespace ID

#### Issue: "R2 uploads failing"

**Symptoms**: Media not storing, "R2 bucket not found" errors

**Diagnosis**:

```bash
# Check R2 bucket exists
wrangler r2 bucket list

# Test R2 operations
echo "test" | wrangler r2 object put tataoro-media/test.txt

# Check bucket permissions
```

**Solutions**:

1. **Create R2 bucket**: `wrangler r2 bucket create tataoro-media`
2. **Verify R2 binding**:
   ```toml
   [[r2_buckets]]
   binding = "MEDIA_BUCKET"
   bucket_name = "tataoro-media"
   ```
3. **Check quotas**: Ensure R2 storage limits not exceeded
4. **Verify permissions**: Worker must have R2 write access

### 4. Email Integration Issues

#### Issue: "Emails not sending"

**Symptoms**: No consultation summaries received, Resend errors

**Diagnosis**:

```bash
# Check email configuration
echo $EMAIL_ENABLED $EMAIL_PROVIDER $RESEND_API_KEY

# Test Resend API directly
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@yourdomain.com","to":"test@example.com","subject":"Test","text":"Test"}'
```

**Solutions**:

1. **Verify Resend API key**: `wrangler secret put RESEND_API_KEY`
2. **Check domain verification**: Domain must be verified in Resend
3. **Verify email addresses**: From/to addresses must be valid
4. **Check rate limits**: Resend has sending limits

#### Issue: "Email formatting broken"

**Symptoms**: Malformed HTML, missing images, broken links

**Diagnosis**:

```bash
# Test email template locally
# Check HTML structure
# Verify image URLs are accessible
```

**Solutions**:

1. **Validate HTML**: Use HTML validator
2. **Test image URLs**: Ensure R2 images are public
3. **Check CSS**: Inline styles for email compatibility
4. **Test across clients**: Different email clients render differently

### 5. Shopify Integration Issues

#### Issue: "Customer creation failing"

**Symptoms**: Shopify API errors, customers not appearing in admin

**Diagnosis**:

```bash
# Test Shopify API connection
curl -X GET https://your-store.myshopify.com/admin/api/2023-10/customers.json \
  -H "X-Shopify-Access-Token: $SHOPIFY_API_TOKEN"

# Check API permissions
# Verify store domain
```

**Solutions**:

1. **Verify API token**: `wrangler secret put SHOPIFY_API_TOKEN`
2. **Check permissions**: Token must have customer read/write access
3. **Verify store domain**: Must be exact Shopify domain
4. **Check rate limits**: Shopify has API rate limits

### 6. Development Issues

#### Issue: "Local development not working"

**Symptoms**: `wrangler dev` fails, localhost not responding

**Diagnosis**:

```bash
# Check Node.js version
node --version

# Check Wrangler installation
wrangler --version

# Check for port conflicts
lsof -i :8787
```

**Solutions**:

1. **Update Node.js**: Use LTS version (18+)
2. **Reinstall Wrangler**: `npm install -g wrangler@latest`
3. **Clear cache**: `wrangler dev --local --persist-to ./dev-storage`
4. **Check firewall**: Ensure port 8787 is open

#### Issue: "Tests failing"

**Symptoms**: npm test shows failures, CI/CD pipeline broken

**Diagnosis**:

```bash
# Run tests with verbose output
npm test -- --verbose

# Check test environment
NODE_ENV=test npm test

# Run specific failing test
npm test -- __tests__/failing-test.js
```

**Solutions**:

1. **Update dependencies**: `npm update`
2. **Check mock environment**: Ensure mockEnv.js is correct
3. **Verify test data**: Check fixtures and test inputs
4. **Clear test cache**: `npm test -- --clearCache`

## Debugging Techniques

### 1. Logging and Monitoring

#### Enable Debug Logging

```javascript
// Add to Worker code
console.log("Debug info:", {
  timestamp: new Date().toISOString(),
  event: "webhook_received",
  phone: phone,
  bodyLength: body.length,
});

// Structured logging for better filtering
console.log(
  JSON.stringify({
    level: "debug",
    event: "gpt_request",
    phone: phone,
    messageCount: messages.length,
    timestamp: new Date().toISOString(),
  })
);
```

#### Monitor Real-time Logs

```bash
# View all logs
wrangler tail

# Filter by log level
wrangler tail --format pretty | grep ERROR

# Filter by specific events
wrangler tail --format pretty | grep "webhook_received"
```

### 2. Request Tracing

#### Add Request IDs

```javascript
// Generate unique request ID
const requestId = crypto.randomUUID();

// Add to all log statements
console.log(`[${requestId}] Processing webhook`);

// Include in error responses
return new Response(
  JSON.stringify({
    error: "Internal error",
    requestId: requestId,
  }),
  { status: 500 }
);
```

#### Trace External API Calls

```javascript
// Log API requests and responses
console.log("OpenAI request:", {
  model: "gpt-4o-mini",
  messageCount: messages.length,
  requestId: requestId,
});

try {
  const response = await openai.chat.completions.create(payload);
  console.log("OpenAI response:", {
    usage: response.usage,
    responseLength: response.choices[0].message.content.length,
    requestId: requestId,
  });
} catch (error) {
  console.error("OpenAI error:", {
    error: error.message,
    status: error.status,
    requestId: requestId,
  });
}
```

### 3. Performance Debugging

#### Measure Execution Time

```javascript
// Time critical operations
const start = performance.now();
const result = await expensiveOperation();
const duration = performance.now() - start;

console.log("Operation timing:", {
  operation: "expensiveOperation",
  duration: `${duration.toFixed(2)}ms`,
  requestId: requestId,
});
```

#### Monitor Memory Usage

```javascript
// Check memory usage (in Workers)
const memoryUsage = performance.memory?.usedJSHeapSize;
if (memoryUsage) {
  console.log("Memory usage:", {
    used: `${(memoryUsage / 1024 / 1024).toFixed(2)}MB`,
    requestId: requestId,
  });
}
```

### 4. Data Validation

#### Validate Input Data

```javascript
// Add input validation
function validateWhatsAppWebhook(body) {
  const required = ["From", "To", "Body"];
  const missing = required.filter((field) => !body.has(field));

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  // Validate phone number format
  const from = body.get("From");
  if (!from.startsWith("whatsapp:+")) {
    throw new Error(`Invalid phone format: ${from}`);
  }
}
```

#### Check Data Consistency

```javascript
// Validate session data
function validateSession(session) {
  if (!session) return null;

  // Check required fields
  const required = ["history", "progress_status", "last_active"];
  const missing = required.filter((field) => !(field in session));

  if (missing.length > 0) {
    console.warn("Session missing fields:", { missing, phone });
    // Return default session or repair
  }

  return session;
}
```

## Production Monitoring

### 1. Health Checks

#### Basic Health Endpoint

```javascript
// Add to router
if (url.pathname === "/health") {
  return new Response(
    JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

#### Detailed Health Check

```javascript
// Comprehensive health check
async function healthCheck(env) {
  const checks = {
    openai: false,
    kv: false,
    r2: false,
    email: false,
  };

  try {
    // Test OpenAI
    await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    });
    checks.openai = true;
  } catch (error) {
    console.error("OpenAI health check failed:", error);
  }

  try {
    // Test KV
    await env.CHAT_HISTORY.get("health-check");
    checks.kv = true;
  } catch (error) {
    console.error("KV health check failed:", error);
  }

  // ... other checks

  return checks;
}
```

### 2. Error Alerting

#### Error Rate Monitoring

```javascript
// Track error rates
let errorCount = 0;
let requestCount = 0;

export default {
  async fetch(request, env) {
    requestCount++;

    try {
      return await handleRequest(request, env);
    } catch (error) {
      errorCount++;

      // Alert if error rate too high
      const errorRate = errorCount / requestCount;
      if (errorRate > 0.1 && requestCount > 10) {
        console.error("High error rate detected:", {
          errorRate: errorRate,
          errorCount: errorCount,
          requestCount: requestCount,
        });
      }

      throw error;
    }
  },
};
```

### 3. Performance Monitoring

#### Response Time Tracking

```javascript
// Track response times
const responseTimeHistogram = new Map();

function trackResponseTime(endpoint, duration) {
  if (!responseTimeHistogram.has(endpoint)) {
    responseTimeHistogram.set(endpoint, []);
  }

  const times = responseTimeHistogram.get(endpoint);
  times.push(duration);

  // Keep only last 100 measurements
  if (times.length > 100) {
    times.shift();
  }

  // Calculate percentiles
  const sorted = [...times].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  console.log("Response time metrics:", {
    endpoint: endpoint,
    current: duration,
    p95: p95,
    count: times.length,
  });
}
```

## Getting Help

### 1. Information to Gather

When reporting issues, include:

- **Error messages**: Exact error text and stack traces
- **Request details**: Headers, body, timestamp
- **Environment**: Development vs production
- **Steps to reproduce**: Minimal reproduction case
- **Expected vs actual behavior**: What should happen vs what happens

### 2. Useful Commands

```bash
# Get deployment info
wrangler deployments list

# Check recent logs
wrangler tail --format pretty | tail -50

# Test specific endpoint
curl -v https://wa.tataoro.com/endpoint

# Check configuration
wrangler whoami
cat wrangler.toml
```

### 3. Support Channels

1. **Documentation**: Check docs/ directory first
2. **GitHub Issues**: Search existing issues
3. **Cloudflare Community**: For Workers-specific issues
4. **OpenAI Community**: For GPT integration issues
5. **Twilio Support**: For WhatsApp API issues

---

**Remember**: Most issues are configuration problems. Check environment variables, API keys, and service configurations before diving into code debugging.
