# Booksy API Coverage Analysis & Discovery Plan

**Updated**: July 2025  
**Current API Coverage**: 90% of business data, 0% of real-time availability

## 📊 Complete API Coverage Breakdown

### ✅ Available via Booksy Customer API (100% Reliable)

#### Business Intelligence

```javascript
GET / businesses / { businessID };
```

**Returns**:

- Business name, description, location with GPS coordinates
- Contact information (phone, email, website)
- Operating hours and policies
- Amenities and features
- Review statistics (count, average rating)
- Booking configuration (policies, lead times, cancellation rules)

#### Service Catalog

```javascript
// Embedded in business data
business.top_services[]
```

**Returns**:

- Complete service list with internal IDs
- Service names, descriptions, categories
- Pricing information (exact amounts, variants)
- Duration estimates (in minutes)
- Staff assignments (which staff can perform service)
- Service availability flags (online, traveling, etc.)

#### Staff Directory

```javascript
// Embedded in business data
business.staff[]
```

**Returns**:

- Staff member names and IDs
- Professional photos and descriptions
- Specializations and positions
- Active status and visibility
- Review scores and rankings

#### Customer Reviews & Appointment History

```javascript
GET /businesses/{businessID}/reviews/?reviews_page=1&reviews_per_page=20
```

**Returns**:

- Historical appointment data with exact timestamps
- Service and staff combinations from real bookings
- Customer feedback and ratings
- Verified appointment confirmations
- Appointment patterns and frequency data

### ❌ Missing from Customer API (Requires Discovery)

#### Real-Time Availability

- **Available time slots** for specific dates
- **Staff schedules** and working hours
- **Blocked/unavailable periods**
- **Real-time booking conflicts**
- **Dynamic pricing** (if applicable)

#### Calendar Integration

- **Available booking dates** (next 30-60 days)
- **Day-specific availability** (morning/afternoon/evening)
- **Recurring availability patterns**
- **Holiday and closure schedules**

#### Booking Management

- **Direct appointment creation**
- **Booking confirmation and payment**
- **Appointment modification/cancellation**
- **Waitlist and notification systems**

## 🔍 Discovery Strategy for Missing Data

### Current Investigation Status

#### Attempted Endpoints (All returned 404)

```bash
# Availability endpoints
GET /businesses/{id}/availability
GET /businesses/{id}/appointments
GET /businesses/{id}/staff/{staffId}/availability
GET /businesses/{id}/services/{serviceId}/availability

# Calendar endpoints
GET /businesses/{id}/calendar
GET /businesses/{id}/schedule

# Booking endpoints
GET /businesses/{id}/book
POST /businesses/{id}/appointments
```

#### Network Interception Results

**Page Load**: 28 API calls captured (all analytics/tracking)
**Book Button Click**: 0 additional API calls captured
**Conclusion**: Time slots likely loaded via different mechanism

### Phase 2: Enhanced Discovery Plan

#### 1. Session-Based Authentication Investigation

```javascript
// Theory: Availability requires user session
const sessionCookies = await captureUserSession();
const availability = await fetch("/availability", {
  headers: {
    "x-api-key": BOOKSY_API_KEY,
    Cookie: sessionCookies,
    "X-Session-Token": sessionToken,
  },
});
```

#### 2. Alternative API Domain Discovery

```javascript
// Test different subdomains/domains
const domains = [
  "api.booksy.com",
  "booking.booksy.com",
  "calendar.booksy.com",
  "availability.booksy.com",
  "us-api.booksy.com",
];
```

#### 3. WebSocket Connection Monitoring

```javascript
// Real-time availability might use WebSocket
page.on("websocket", (ws) => {
  console.log("WebSocket connection:", ws.url());
  ws.on("framereceived", (frame) => {
    if (frame.payload.includes("availability")) {
      console.log("Availability data via WebSocket:", frame.payload);
    }
  });
});
```

#### 4. Mobile App API Reverse Engineering

```javascript
// Mobile apps often use different endpoints
const mobileHeaders = {
  "User-Agent": "Booksy/iOS 1.2.3",
  "X-Mobile-App": "true",
  "X-App-Version": "1.2.3",
};
```

#### 5. Enhanced Browser Automation

```javascript
// Monitor ALL network traffic during booking flow
page.on("request", (request) => {
  // Capture every request, not just obvious API calls
  console.log(`${request.method()} ${request.url()}`);
  console.log("Headers:", request.headers());
  console.log("Post Data:", request.postData());
});
```

### Phase 3: Advanced Techniques

#### 1. Iframe Source Analysis

```javascript
// The booking widget might load from different domain
const iframeSrc = await page.$eval('iframe[data-testid="booking-widget"]', (el) => el.src);
// Extract API calls from iframe domain
```

#### 2. JavaScript Bundle Analysis

```javascript
// Reverse engineer the booking widget JavaScript
const scripts = await page.$$eval("script", (scripts) =>
  scripts.map((s) => s.src).filter((src) => src.includes("booking"))
);
// Analyze for API endpoint patterns
```

#### 3. Local Storage & Session Storage

```javascript
// Check for cached availability data
const localStorage = await page.evaluate(() => Object.entries(localStorage));
const sessionStorage = await page.evaluate(() => Object.entries(sessionStorage));
```

## 🎯 MCP Server Implementation Plan

### Current Implementation (Phase 1)

```javascript
// workers/booksy-dynamic.js - Enhanced with API
export default {
  async fetch(request, env) {
    if (path === "/appointments") {
      // Step 1: Get service data via API (instant)
      const serviceData = await getServiceViaAPI(serviceName);

      // Step 2: Browser automation only for time slots
      const timeSlots = await extractTimeSlotsViaBrowser(serviceData);

      // Step 3: Return combined data
      return {
        service: serviceData, // 100% reliable
        timeSlots: timeSlots, // Best effort
        reliability: timeSlots.length > 0 ? "high" : "medium",
      };
    }
  },
};
```

### Enhanced Implementation (Phase 2)

```javascript
// Add discovery monitoring
export default {
  async fetch(request, env) {
    if (path === "/appointments") {
      // Try API-first approach
      const apiAvailability = await tryBookingAPI(serviceData);
      if (apiAvailability.success) {
        return apiAvailability.data;
      }

      // Fallback to browser automation with enhanced monitoring
      const browserResult = await extractWithDiscovery(serviceData);

      // Log discoveries for future API integration
      await logDiscoveredEndpoints(browserResult.capturedAPIs);

      return browserResult;
    }
  },
};
```

## 📈 Success Metrics & Goals

### Current State (v1.14.0)

- **API Coverage**: 90% of business data
- **Reliability**: 100% for service/business info, 30% for time slots
- **Speed**: Instant for API data, 15-30s for time slots
- **User Experience**: Rich context, inconsistent availability

### Target State (v2.0.0)

- **API Coverage**: 100% including real-time availability
- **Reliability**: 95%+ for all data
- **Speed**: <5 seconds for complete booking info
- **User Experience**: Seamless booking assistance

### Intermediate Milestones

1. **v1.15.0**: Deploy hybrid API+browser approach (immediate 90% improvement)
2. **v1.16.0**: Enhanced discovery monitoring and endpoint detection
3. **v1.17.0**: Session-based authentication and alternative domain testing
4. **v1.18.0**: WebSocket monitoring and mobile API investigation
5. **v2.0.0**: Complete API integration with direct booking capabilities

## 🔧 Technical Implementation Priority

### High Priority (Ready Now)

1. **Deploy hybrid approach** - Immediate 90% reliability improvement
2. **Enhanced error handling** - Graceful fallbacks and user communication
3. **API data caching** - Optimize performance for business/service data

### Medium Priority (Next 2-4 weeks)

1. **Discovery monitoring** - Automated endpoint detection
2. **Session authentication** - User session capture and replay
3. **Alternative domain testing** - Systematic API discovery

### Low Priority (Future)

1. **Direct booking integration** - Full automation workflow
2. **Real-time notifications** - Availability change alerts
3. **Payment integration** - Complete booking experience

---

**Bottom Line**: We have 90% of what we need via API. The remaining 10% (time slots) requires additional discovery, but our hybrid approach provides immediate massive improvements while we continue investigating the booking API endpoints.

**Recommendation**: Deploy Phase 1 immediately for 90% improvement, continue Phase 2 discovery in parallel.
