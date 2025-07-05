# Feature 8: Booksy MCP Integration

**Purpose**: Enable WhatsApp clients to discover Tata Oro's services and get guided booking assistance with transparent pricing  
**Audience**: Developers, system administrators  
**Last Updated**: Version 1.7.0  
**Status**: CURRENT - IMPLEMENTED

## Overview

This feature provides a comprehensive service discovery and booking assistance system that integrates Tata Oro's Booksy booking system with the WhatsApp GPT bot. The implementation guides customers through service selection with transparent pricing information and provides specific booking links only after service selection. Since Booksy doesn't provide a public API, this uses a curated service catalog approach with guided booking flows.

## Business Context

- **Problem**: Clients frequently ask about services, prices, and availability through WhatsApp, but need transparency about pricing for different hair lengths/densities
- **Solution**: Guided booking system that educates customers about pricing structure before providing booking links
- **Value**: Reduces manual coordination, provides 24/7 service discovery, and sets proper pricing expectations upfront

## Key Features

### Transparent Pricing Structure

- **Starting Prices**: All prices clearly marked as "starting at" for short hair
- **Length/Density Disclaimer**: Automatic warning that longer/denser hair may cost up to 2x more
- **Service-Specific Notes**: Each service includes specific pricing guidance

### Guided Booking Flow

1. **Service Discovery**: Show categorized services with transparent pricing
2. **Service Selection**: Customer indicates interest in specific service
3. **Detailed Information**: Provide comprehensive service details and pricing notes
4. **Direct Booking Link**: Only then provide the specific booking URL with instructions

### Smart Service Matching

- **Keyword Detection**: Recognizes specific service names and booking intent
- **Category Filtering**: Automatically shows relevant services (first-time, color, cuts, etc.)
- **Personalized Recommendations**: Tailored suggestions based on client type

## Technical Implementation

### MCP Server Architecture

```javascript
// Core server structure
class BooksyMCPServer {
  constructor() {
    this.businessId = "155582";
    this.stafferId = "880999";
    this.baseUrl =
      "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999";
  }
}
```

### Available Tools

1. **get_services**: Returns categorized service list with prices and durations
2. **get_booking_link**: Generates direct booking links for specific services
3. **search_services**: Search services by keyword
4. **get_business_info**: Returns business location and contact details

### Service Categories

- **Consultation**: Free diagnostic services
- **Curly**: Curly hair cuts, styling, and treatments
- **Color**: Hair color services designed for curly hair
- **Treatment**: Scalp treatments and spa services

## Integration Points

### WhatsApp Bot Integration

The MCP server integrates with the existing WhatsApp bot through conversation triggers:

```javascript
// Example conversation flow
const triggers = ["what services", "book appointment", "how much", "first time client"];
```

### System Prompt Enhancement

Added booking-related context to system prompts when conversations mention:

- Services or treatments
- Booking or appointments
- Prices or costs
- Scheduling or availability

## Usage Examples

### Service Discovery

```
User: What curly hair services does Tata offer?

Bot: 💇‍♀️ Here are all my services:

🆓 Free Consultation
• Diagnóstico capilar : curly hair - FREE

💫 Curly Hair Services
• Curly Adventure (First Time) - Starting at $200
• Curly Cut + Simple Definition - Starting at $150
• Deep Wash and Style Only - Starting at $150

🎨 Color Services
• Curly Color Experience - Starting at $250
• Hair color (cambio de color) - Starting at $200

⚠️ IMPORTANT: All prices are starting prices for short hair. Longer or denser hair may cost up to 2x more due to additional time required.

📅 Tell me which service interests you and I'll provide the specific booking link!

💡 New to curly hair care? Start with the FREE consultation!
```

### Specific Service Booking

```
User: I want to book a curly cut

Bot: ✨ Perfect! Here's everything you need to book "Curly Cut + Simple Definition":

📋 Service Details:
• Duration: 90 minutes
• Price: Starting at $150
• Professional curly haircut with styling and definition - great for regular maintenance

💰 Pricing: Starting at $150 for short hair. Longer/denser hair may cost up to $300 due to additional time required.

🔗 BOOK NOW: https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999#ba_s=dl_1

📍 Location: 8865 Commodity Circle, Suite 7A, Orlando, 32819

📝 Booking Steps:
1. 🔗 Click the booking link to open Tata's booking page
2. 🎯 Look for "Curly Cut + Simple Definition" in the services list
3. 📅 Select your preferred date and time
4. 📝 Fill out the booking form with your details
5. ✅ Confirm your appointment

💡 Consider booking the free consultation first if you're new to curly hair care!

💡 Next Steps:
• After booking, you'll receive a confirmation email
• Tata will contact you before your appointment if needed
• Come with clean, dry hair (unless specified otherwise)
• Bring reference photos if you have specific style goals
```

## Service Catalog

### Complete Service Catalog with Transparent Pricing

#### Consultation Services

| Service             | Price | Duration | Pricing Notes                       |
| ------------------- | ----- | -------- | ----------------------------------- |
| Diagnóstico capilar | FREE  | 30 min   | Always free - no additional charges |

#### Curly Hair Services

| Service                      | Price         | Duration | Pricing Notes                     |
| ---------------------------- | ------------- | -------- | --------------------------------- |
| Curly Adventure (First Time) | Starting $200 | 2.5 hrs  | Up to $400 for longer/denser hair |
| Curly Cut + Definition       | Starting $150 | 1.5 hrs  | Up to $300 for longer/denser hair |
| Curly Adventure (Regular)    | Starting $180 | 2.5 hrs  | Up to $360 for longer/denser hair |
| Full Rizos (Cliente Nuevo)   | Starting $200 | 2.5 hrs  | Up to $400 for longer/denser hair |
| Deep Wash and Style          | Starting $150 | 1.5 hrs  | Up to $300 for longer/denser hair |
| Curly Hair Restructuring     | Starting $180 | 2.5 hrs  | Up to $360 for longer/denser hair |

#### Color Services

| Service                      | Price         | Duration | Pricing Notes                     |
| ---------------------------- | ------------- | -------- | --------------------------------- |
| Curly Color Experience       | Starting $250 | 2.5 hrs  | Up to $500 for longer/denser hair |
| Hair color (cambio de color) | Starting $200 | 2.5 hrs  | Up to $400 for longer/denser hair |

#### Treatment Services

| Service               | Price         | Duration | Pricing Notes                       |
| --------------------- | ------------- | -------- | ----------------------------------- |
| Scalp Treatment       | Starting $140 | 1.5 hrs  | Up to $280 for longer/denser hair   |
| Scalp Treatment (Men) | $80           | 45 min   | Fixed price - no additional charges |
| Curly Spa Service     | Starting $180 | 3.5 hrs  | Up to $360 for longer/denser hair   |
| Photon Therapy        | Starting $150 | 2 hrs    | Up to $300 for longer/denser hair   |

#### Special Services

| Service              | Price         | Duration | Pricing Notes                     |
| -------------------- | ------------- | -------- | --------------------------------- |
| Bridal Makeup & Hair | Starting $300 | 2 hrs    | Up to $600 for longer/denser hair |

> **Important**: All prices are starting prices for short hair. Longer or denser hair may require up to twice the time and cost due to additional complexity and time required.

## Configuration

### Environment Variables

```bash
# Booksy Configuration
BOOKSY_BUSINESS_ID=155582
BOOKSY_STAFFER_ID=880999
BOOKSY_BASE_URL=https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999
```

### MCP Server Setup

```json
{
  "name": "booksy-tata-mcp",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  }
}
```

## Deployment and Testing Guide

### Development Setup

#### 1. Install MCP SDK Dependencies

```bash
# Install the MCP SDK dependency
npm install @modelcontextprotocol/sdk

# Verify installation
npm list @modelcontextprotocol/sdk
```

#### 2. Local MCP Server Testing

The MCP server can be tested independently before integration:

```bash
# Test the MCP server directly
node workers/booksy-mcp.js

# Or run with Node.js test runner
npm test -- __tests__/booksy-mcp.test.js
```

#### 3. Manual MCP Tool Testing

Create a test script to verify MCP functionality:

```javascript
// test-booksy-mcp.js
import BooksyMCPServer from "./workers/booksy-mcp.js";

async function testMCPServer() {
  const server = new BooksyMCPServer();

  // Test service discovery
  console.log("Testing get_services...");
  const services = await server.getServices("curly");
  console.log(services.content[0].text);

  // Test booking link
  console.log("\nTesting get_booking_link...");
  const booking = await server.getBookingLink("diagnostic");
  console.log(booking.content[0].text);

  // Test recommendations
  console.log("\nTesting recommendations...");
  const recs = await server.getServiceRecommendations("first-time");
  console.log(recs.content[0].text);
}

testMCPServer().catch(console.error);
```

#### 4. Integration with WhatsApp Bot

To integrate with the existing WhatsApp bot, you'll need to:

**Option A: Direct Integration (Recommended for testing)**

Add MCP calls directly in the WhatsApp handler:

```javascript
// In workers/whatsapp-incoming.js
import BooksyMCPServer from "./booksy-mcp.js";

const booksyMCP = new BooksyMCPServer();

// Add booking-related triggers
const bookingKeywords = ["service", "book", "appointment", "price", "cost", "available"];
const hasBookingIntent = bookingKeywords.some((keyword) => message.toLowerCase().includes(keyword));

if (hasBookingIntent) {
  // Enhance system prompt with booking context
  systemPrompt += `\n\nBOOKING ASSISTANCE:\nThe user is asking about services or booking. You can help them discover Tata's services, get pricing information, and provide booking links. Use natural language to guide them through the process.`;

  // You could also call MCP tools directly here if needed
  // const services = await booksyMCP.getServices('all');
}
```

**Option B: MCP Protocol Integration (Future enhancement)**

For full MCP protocol integration, you would need to set up an MCP client in the WhatsApp worker.

### Testing in Development Environment

#### 1. Local Development Server

```bash
# Start local development server
wrangler dev

# Test WhatsApp webhook with booking queries
curl -X POST http://localhost:8787/whatsapp/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890" \
  -d "To=whatsapp:+1415523886" \
  -d "Body=What services does Tata offer?"
```

#### 2. Test Booking-Related Conversations

Create test cases for common booking scenarios:

```bash
# Test service discovery
curl -X POST http://localhost:8787/whatsapp/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890" \
  -d "Body=What curly hair services are available?"

# Test pricing inquiry
curl -X POST http://localhost:8787/whatsapp/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890" \
  -d "Body=How much does a curly cut cost?"

# Test booking request
curl -X POST http://localhost:8787/whatsapp/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890" \
  -d "Body=I want to book an appointment with Tata"

# Test first-time client
curl -X POST http://localhost:8787/whatsapp/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890" \
  -d "Body=I'm a first-time client, what do you recommend?"
```

#### 3. Verify Response Quality

Check that responses include:

- ✅ Service names and prices
- ✅ Direct booking links
- ✅ Clear instructions
- ✅ Personalized recommendations
- ✅ Business location information

### Production Deployment

#### 1. Deploy to Cloudflare Workers

```bash
# Deploy to development environment first
wrangler deploy --env development

# Test in development
curl -X POST https://dev.wa.tataoro.com/whatsapp/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890" \
  -d "Body=What services does Tata offer?"

# Deploy to production when ready
wrangler deploy --env production
```

#### 2. Update Twilio Webhook

Update your Twilio WhatsApp webhook URL to point to the deployed worker:

```bash
# In Twilio Console, set webhook URL to:
https://wa.tataoro.com/whatsapp/incoming
```

#### 3. Monitor Performance

```bash
# Monitor logs for booking-related queries
wrangler tail --env production

# Look for patterns like:
# - Service discovery requests
# - Booking link generations
# - Error rates
# - Response times
```

### Real-World Testing

#### 1. WhatsApp Sandbox Testing

Use Twilio's WhatsApp sandbox for realistic testing:

1. **Join Sandbox**: Send "join [sandbox-keyword]" to your Twilio sandbox number
2. **Test Service Discovery**: "What services does Tata offer?"
3. **Test Booking Flow**: "I want to book a curly cut"
4. **Test Recommendations**: "I'm new, what do you recommend?"
5. **Test Business Info**: "Where is Tata located?"

#### 2. User Acceptance Testing

Create a test script for real users:

```markdown
## Booksy Integration Test Script

### Test 1: Service Discovery

- Send: "What curly hair services are available?"
- Expect: List of services with prices and durations
- Verify: Prices match Booksy page

### Test 2: Booking Assistance

- Send: "I want to book a curly cut"
- Expect: Direct booking link with instructions
- Verify: Link opens to Tata's Booksy page

### Test 3: First-Time Client

- Send: "I'm a first-time client"
- Expect: Recommendation for free consultation
- Verify: Mentions diagnostic service

### Test 4: Price Inquiry

- Send: "How much is a color treatment?"
- Expect: Color service prices and options
- Verify: Includes both curly color options

### Test 5: Business Information

- Send: "Where is Tata located?"
- Expect: Full business details
- Verify: Correct address and contact info
```

### Performance Monitoring

#### 1. Key Metrics to Track

```javascript
// Add performance logging to MCP calls
const startTime = Date.now();
const result = await booksyMCP.getServices(category);
const duration = Date.now() - startTime;

console.log(
  JSON.stringify({
    event: "mcp_call",
    tool: "get_services",
    duration: duration,
    category: category,
    timestamp: new Date().toISOString(),
  })
);
```

#### 2. Error Tracking

```javascript
// Monitor MCP errors
try {
  const result = await booksyMCP.getBookingLink(serviceId);
  return result;
} catch (error) {
  console.error(
    JSON.stringify({
      event: "mcp_error",
      tool: "get_booking_link",
      error: error.message,
      serviceId: serviceId,
      timestamp: new Date().toISOString(),
    })
  );

  // Fallback response
  return {
    content: [
      {
        type: "text",
        text: "I apologize, but I'm having trouble accessing booking information right now. Please visit https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999 to book directly with Tata.",
      },
    ],
  };
}
```

### Maintenance and Updates

#### 1. Service Catalog Updates

Monitor Tata's Booksy page monthly for changes:

```bash
# Create a maintenance script
# check-booksy-updates.js
const TATA_BOOKSY_URL = 'https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999';

// Check for new services, price changes, or description updates
// Update the SERVICES object in workers/booksy-mcp.js accordingly
```

#### 2. Link Validation

Regularly test that booking links are working:

```bash
# Test booking link accessibility
curl -I https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999

# Should return 200 OK
```

#### 3. Integration Health Checks

Add health check endpoint:

```javascript
// In workers/router.js, add health check for Booksy integration
if (url.pathname === "/health/booksy") {
  const booksyMCP = new BooksyMCPServer();
  const testResult = await booksyMCP.getServices("consultation");

  return new Response(
    JSON.stringify({
      status: "healthy",
      timestamp: new Date().toISOString(),
      test_result: testResult.content[0].text.includes("Diagnóstico"),
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

### Troubleshooting Common Issues

#### Issue: MCP Server Not Responding

```bash
# Check if MCP SDK is installed
npm list @modelcontextprotocol/sdk

# Test MCP server directly
node workers/booksy-mcp.js

# Check for import errors
```

#### Issue: Booking Links Not Working

```bash
# Verify Tata's Booksy URL is still valid
curl -I https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999

# Check if business ID or staffer ID changed
```

#### Issue: Service Information Outdated

```bash
# Compare current services with Booksy page
# Update SERVICES object in workers/booksy-mcp.js
# Redeploy worker
wrangler deploy
```

#### Issue: Integration Not Triggering

```bash
# Check conversation triggers in WhatsApp handler
# Verify booking keywords are being detected
# Add debug logging to track trigger conditions
```

This comprehensive deployment and testing guide ensures the Booksy MCP integration works reliably in both development and production environments.

## Limitations and Future Enhancements

### Current Limitations

- **No Real-Time Availability**: Cannot check actual appointment availability
- **Manual Service Updates**: Service catalog requires manual maintenance
- **No Booking Creation**: Only provides booking links, doesn't create appointments

### Future Enhancements

- **Browser Automation**: Add Playwright-based availability checking
- **Dynamic Service Discovery**: Automatically update service catalog
- **Booking Confirmation**: Track when clients complete bookings

## Testing

### Manual Testing

```bash
# Test service discovery
echo '{"tool": "get_services", "args": {"category": "curly"}}' | node mcp-server.js

# Test booking link generation
echo '{"tool": "get_booking_link", "args": {"serviceId": "curlyCutDefinition"}}' | node mcp-server.js
```

### Integration Testing

Test WhatsApp conversations that trigger booking-related responses:

- Service inquiries
- Price questions
- Booking requests
- First-time client questions

## Related Documents

- [API.md](../API.md) - Main API documentation
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](../DEVELOPMENT.md) - Development setup
- [TESTING.md](../TESTING.md) - Testing procedures

## Success Metrics

- **Reduced Manual Coordination**: Fewer direct messages about services/prices
- **Improved Client Experience**: 24/7 access to service information
- **Booking Conversion**: More clients using provided booking links
- **Time Savings**: Less time spent answering repetitive questions
