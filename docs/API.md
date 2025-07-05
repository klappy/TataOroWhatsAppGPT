# API Reference for TataOroWhatsAppGPT

**Purpose**: Complete API reference for all endpoints, data contracts, and integration points  
**Audience**: Developers, integrators, contributors  
**Last Updated**: Version 1.0.0  
**Status**: CURRENT - COMPLETE API REFERENCE

## Base URL

All API endpoints are served from the main domain:

```
https://wa.tataoro.com
```

## Authentication

### Admin Endpoints

Admin endpoints require simple password authentication via query parameter:

```
?password=<ADMIN_PASSWORD>
```

### Webhook Endpoints

Webhook endpoints validate requests using provider-specific signatures:

- **Twilio**: `X-Twilio-Signature` header validation
- **GitHub**: `X-Hub-Signature-256` header validation

## Endpoints

### WhatsApp Integration

#### POST /whatsapp/incoming

**Purpose**: Twilio WhatsApp webhook handler  
**Authentication**: Twilio signature validation  
**Content-Type**: `application/x-www-form-urlencoded`

**Request Body**:

```
From=whatsapp:+1234567890
To=whatsapp:+1415523886
Body=Hello, I need help with my curls
MessageSid=SM1234567890abcdef
AccountSid=AC1234567890abcdef
NumMedia=1
MediaUrl0=https://api.twilio.com/2010-04-01/Accounts/.../Media/ME123
MediaContentType0=image/jpeg
```

**Response**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Thank you for contacting Tata Oro! I'd love to help you with your curl journey. Let's start with a photo of your current hair - this helps me understand your hair type and condition. Please share a clear photo of your hair!</Message>
</Response>
```

**Response Headers**:

- `Content-Type: text/xml; charset=UTF-8`
- `Access-Control-Allow-Origin: *`

**Error Responses**:

- `400 Bad Request`: Invalid Twilio signature or malformed request
- `500 Internal Server Error`: OpenAI API error or system failure

### Media Delivery

#### GET /images/{encodedKey}

**Purpose**: Serve public R2-hosted media files  
**Authentication**: None (public endpoint)  
**Content-Type**: Varies based on media type

**URL Parameters**:

- `encodedKey`: URL-encoded R2 object key (e.g., `whatsapp%3A%2B1234567890%2F1234567890-0.jpeg`)

**Example Request**:

```
GET /images/whatsapp%3A%2B1234567890%2F1234567890-0.jpeg
```

**Response**:

- **Success**: Media file with appropriate `Content-Type` header
- **404 Not Found**: Media file not found in R2
- **500 Internal Server Error**: R2 access error

**Supported Media Types**:

- `image/jpeg`
- `image/png`
- `image/webp`
- `audio/mpeg`
- `audio/ogg`

### Admin Interface

#### GET /admin

**Purpose**: Admin dashboard for session management  
**Authentication**: Password query parameter  
**Content-Type**: `text/html`

**Query Parameters**:

- `password`: Admin password (required)

**Response**:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>TataOro WhatsApp Admin</title>
    <style>
      /* Admin styles */
    </style>
  </head>
  <body>
    <!-- Admin dashboard HTML -->
  </body>
</html>
```

#### POST /admin/reset

**Purpose**: Reset a specific user session  
**Authentication**: Password in request body  
**Content-Type**: `application/x-www-form-urlencoded`

**Request Body**:

```
phone=+1234567890
password=<ADMIN_PASSWORD>
```

**Response**:

```json
{
  "success": true,
  "message": "Session reset successfully",
  "phone": "+1234567890"
}
```

### Summary Interface

#### GET /summary/{conversationId}

**Purpose**: Public read-only consultation summary  
**Authentication**: None (public endpoint)  
**Content-Type**: `text/html`

**URL Parameters**:

- `conversationId`: Phone number in E.164 format (e.g., `+1234567890`)

**Response**:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Consultation Summary</title>
    <style>
      /* Summary styles */
    </style>
  </head>
  <body>
    <div class="summary">
      <h1>Curl Consultation Summary</h1>
      <div class="metadata">
        <p><strong>Phone:</strong> +1234567890</p>
        <p><strong>Status:</strong> Complete</p>
        <p><strong>Last Active:</strong> 2024-01-15 14:30:00</p>
      </div>
      <div class="conversation">
        <!-- Chat history -->
      </div>
      <div class="images">
        <!-- Uploaded images -->
      </div>
    </div>
  </body>
</html>
```

### Booksy Integration (MCP)

#### POST /booksy/mcp

**Purpose**: Model Context Protocol server for Booksy service discovery  
**Authentication**: None (internal MCP protocol)  
**Content-Type**: `application/json`

**MCP Request Example**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_services",
    "arguments": {}
  }
}
```

**MCP Response Example**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "## Tata Oro's Services\n\n### Free Consultation\n- **Diagnóstico capilar** - $0 (30 min)\n  Hair analysis and consultation\n\n### Curly Hair Services\n- **Curly Adventure** - $200+ (4 hours)\n  Complete curl transformation experience\n- **Curly Cut + Definition** - $150 (3 hours)\n  Specialized curly cut with styling\n..."
      }
    ]
  }
}
```

**Available MCP Tools**:

1. **get_services** - Get complete service catalog
2. **get_booking_link** - Get booking URL with instructions
3. **search_services** - Search services by keyword
4. **get_business_info** - Get business details and location
5. **get_service_recommendations** - Get personalized recommendations

#### GET /booksy/services

**Purpose**: REST endpoint for service discovery (alternative to MCP)  
**Authentication**: None (public endpoint)  
**Content-Type**: `application/json`

**Response**:

```json
{
  "services": [
    {
      "id": "consultation",
      "name": "Diagnóstico capilar",
      "price": 0,
      "duration": 30,
      "category": "consultation",
      "description": "Complete hair analysis and consultation to understand your curl pattern, hair health, and styling goals."
    },
    {
      "id": "curly_adventure",
      "name": "Curly Adventure",
      "price": 200,
      "duration": 240,
      "category": "curly",
      "description": "Our signature transformation experience - complete curl makeover with cut, treatment, and styling education."
    }
  ],
  "booking_url": "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999#ba_s=dl_1"
}
```

#### GET /booksy/search

**Purpose**: Search services by keyword  
**Authentication**: None (public endpoint)  
**Content-Type**: `application/json`

**Query Parameters**:

- `q`: Search query (required)
- `category`: Filter by category (optional)

**Example Request**:

```
GET /booksy/search?q=color&category=color
```

**Response**:

```json
{
  "query": "color",
  "results": [
    {
      "id": "curly_color",
      "name": "Curly Color Experience",
      "price": 250,
      "duration": 300,
      "category": "color",
      "description": "Professional color service designed specifically for curly hair patterns."
    }
  ]
}
```

### Webhook Handlers

#### POST /uploadhook

**Purpose**: GitHub webhook for documentation updates  
**Authentication**: GitHub signature validation  
**Content-Type**: `application/json`

**Request Body**:

```json
{
  "ref": "refs/heads/main",
  "repository": {
    "name": "TataOroWhatsAppGPT",
    "full_name": "user/TataOroWhatsAppGPT"
  },
  "commits": [
    {
      "id": "abc123",
      "message": "Update documentation",
      "added": ["docs/new-file.md"],
      "modified": ["README.md"],
      "removed": []
    }
  ]
}
```

**Response**:

```json
{
  "success": true,
  "message": "Documentation sync triggered",
  "files_processed": 2
}
```

#### POST /internal/doc-sync

**Purpose**: Manual documentation synchronization  
**Authentication**: Internal endpoint (IP-restricted)  
**Content-Type**: `application/json`

**Request Body**:

```json
{
  "force": true,
  "files": ["docs/*.md", "README.md"]
}
```

**Response**:

```json
{
  "success": true,
  "message": "Documentation synchronized",
  "files_processed": 15,
  "embeddings_created": 47
}
```

## Conventions

### Route Structure

All endpoints follow channel-first organization:

- `/[channel]/incoming` - Message webhooks (e.g., `/whatsapp/incoming`)
- `/[channel]/[service]` - Channel-specific services
- Platform-agnostic utilities remain unscoped (e.g., `/summary/:conversationId`)

### Storage Key Format

All storage keys use consistent scoping:

```
[channel]:[identifier]/[resource]
```

Examples:

- `whatsapp:+14155551234/history.json` - Chat session
- `whatsapp:+14155551234/1700000000000-0.jpeg` - Media file
- `kv/docs/github:klappy/docs/file.md/chunk3` - Document chunk

### Phone Number Normalization

- All phone numbers stored in E.164 format: `+14155551234`
- WhatsApp prefix (`whatsapp:`) stripped for storage keys
- Consistent normalization prevents duplicate sessions

## Data Structures

### Session Data (KV Storage)

#### Chat History Key Format

```
whatsapp:+{E164PhoneNumber}/history.json
```

#### Session Object

```json
{
  "history": [
    {
      "role": "user",
      "content": "Hello, I need help with my curls"
    },
    {
      "role": "assistant",
      "content": "Thank you for contacting Tata Oro! I'd love to help you with your curl journey."
    }
  ],
  "progress_status": "midway",
  "last_active": "2024-01-15T14:30:00Z",
  "summary_email_sent": false,
  "nudge_sent": false,
  "summary": "Client seeking help with curl definition and moisture retention...",
  "r2Urls": ["https://wa.tataoro.com/images/whatsapp%3A%2B1234567890%2F1234567890-0.jpeg"],
  "name": "Maria",
  "email_status": "pending",
  "shopify_status": "sent"
}
```

#### Field Descriptions

- **history**: Array of chat messages passed to GPT and rendered in summaries
- **progress_status**: Session state tracking (`initial` → `photo-received` → `midway` → `summary-ready` → `complete`)
- **last_active**: Epoch timestamp for timeout calculations, updated on every message
- **summary_email_sent**: Boolean flag set after email successfully dispatched
- **nudge_sent**: Boolean flag to prevent duplicate WhatsApp reminders
- **summary**: Cached assistant-generated summary (presence indicates `summary-ready` state)
- **r2Urls**: Array of public URLs for uploaded media, appended on each upload
- **name**: User-provided name when collected during conversation
- **email_status**: Email integration state (`pending` → `sent` → `failed`)
- **shopify_status**: Shopify customer upsert state (`pending` → `sent` → `failed`)

#### Session Lifecycle

1. **Load & Default**: Read from KV with safe defaults for missing fields
2. **Mutation**: Update history, media URLs, status flags on each interaction
3. **Email Trigger**: Manual command or scheduler triggers summary generation and email
4. **Summary Detection**: GPT replies starting with "Client Curl Discovery Summary" become cached summary
5. **Storage**: Object persisted to KV with 30-day TTL after each update

#### Progress Status Values

- `"initial"`: New conversation, no photos received
- `"photo-received"`: At least one photo uploaded
- `"midway"`: Consultation in progress
- `"summary-ready"`: Final summary generated
- `"complete"`: Consultation finished

### Media Storage (R2)

#### R2 Object Key Format

```
whatsapp:+{E164PhoneNumber}/{timestamp}-{index}.{extension}
```

#### Examples

```
whatsapp:+1234567890/1705123456789-0.jpeg
whatsapp:+1234567890/1705123456789-1.png
whatsapp:+1234567890/1705123456789-2.mp3
```

### OpenAI Integration

#### GPT Message Format

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "Here's a photo of my hair"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://wa.tataoro.com/images/whatsapp%3A%2B1234567890%2F1234567890-0.jpeg"
      }
    }
  ]
}
```

#### Whisper Transcription (Audio)

```json
{
  "role": "user",
  "content": "[Audio transcription] I wanted to ask about curl cream recommendations for my hair type"
}
```

## Error Handling

### Standard Error Response

```json
{
  "error": true,
  "message": "Descriptive error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### Common Error Codes

- `INVALID_SIGNATURE`: Webhook signature validation failed
- `MISSING_PARAMETER`: Required parameter not provided
- `UNAUTHORIZED`: Authentication failed
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `EXTERNAL_API_ERROR`: Third-party service error
- `INTERNAL_ERROR`: System error

## Rate Limiting

### Webhook Endpoints

- **Twilio**: No rate limiting (handled by Twilio)
- **GitHub**: No rate limiting (handled by GitHub)

### Admin Endpoints

- **Rate Limit**: 100 requests per hour per IP
- **Headers**: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Public Endpoints

- **Rate Limit**: 1000 requests per hour per IP
- **Headers**: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Environment Variables

### Required Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Twilio Configuration
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+1415523886

# Email Configuration
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
EMAIL_FROM=consultations@tataoro.com
EMAIL_TO=tata@tataoro.com
RESEND_API_KEY=re_...

# Shopify Configuration
SHOPIFY_STORE_DOMAIN=tataoro.com
SHOPIFY_API_TOKEN=shpat_...

# System Configuration
WHATSAPP_BASE_URL=https://wa.tataoro.com
ADMIN_PASSWORD=secure_admin_password
```

## Integration Examples

### Twilio Webhook Configuration

```bash
# Set webhook URL in Twilio Console
https://wa.tataoro.com/whatsapp/incoming

# Configure webhook events
- Incoming messages
- Media messages
- Message status updates
```

### GitHub Webhook Configuration

```bash
# Set webhook URL in GitHub repository settings
https://wa.tataoro.com/uploadhook

# Configure webhook events
- Push events
- Pull request events (optional)
```

### Shopify Integration

```javascript
// Example customer upsert
const customer = {
  phone: "+1234567890",
  first_name: "Maria",
  tags: ["curl-consultation", "whatsapp-lead"],
};
```

## Testing

### Local Development

```bash
# Start local development server
wrangler dev

# Test webhook locally
curl -X POST http://localhost:8787/whatsapp/incoming \
  -d "From=whatsapp:+1234567890" \
  -d "Body=Hello"
```

### Production Testing

```bash
# Test media delivery
curl https://wa.tataoro.com/images/test-image.jpg

# Test admin endpoint
curl "https://wa.tataoro.com/admin?password=test"
```

## Security Considerations

### Webhook Security

- All webhooks validate signatures
- Twilio uses HMAC-SHA1 with auth token
- GitHub uses HMAC-SHA256 with secret

### Data Protection

- No permanent storage of chat content
- Media files automatically cleaned up
- Admin access requires password
- All connections use HTTPS

### Rate Limiting

- Prevents abuse of public endpoints
- Admin endpoints have stricter limits
- Automatic IP blocking for repeated violations

---

**Note**: This API is designed for the specific use case of WhatsApp-based curl consultations. All endpoints are optimized for this workflow and may not be suitable for general-purpose chat applications.
