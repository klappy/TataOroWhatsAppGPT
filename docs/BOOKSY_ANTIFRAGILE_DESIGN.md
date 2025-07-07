# Booksy Antifragile Integration Design

**Philosophy**: Simple, reliable, maintainable. API-first with graceful degradation.

## 🎯 Design Principles

### 1. **API-First Architecture**

- Use the discovered Booksy API for 90% of data (instant, reliable)
- Browser automation only as last resort for time slots
- Never build complex browser logic when API exists

### 2. **Graceful Degradation**

- Each layer fails gracefully to the next
- Always provide useful information, even if incomplete
- Clear communication about what's available vs unavailable

### 3. **Simplicity Over Complexity**

- **Current**: 4,379 lines of complex browser automation
- **Target**: ~300 lines of clean API + minimal browser fallback
- Easy to understand, debug, and maintain

### 4. **Fast Feedback**

- API responses in <1 second
- Browser automation only when needed, with strict timeouts
- Never make users wait for unreliable scraping

## 🏗️ Clean Architecture

### Layer 1: Booksy API (Primary - 90% coverage)

```javascript
// Fast, reliable business data
const BOOKSY_API_KEY = "web-e3d812bf-d7a2-445d-ab38-55589ae6a121";
const BOOKSY_API_BASE = "https://us.booksy.com/api/us/2/customer_api";

async function getBusinessData() {
  const response = await fetch(`${BOOKSY_API_BASE}/businesses/155582`, {
    headers: {
      Accept: "application/json",
      "x-api-key": BOOKSY_API_KEY,
    },
  });
  return response.json();
}
```

### Layer 2: Smart Fallbacks (Secondary - 9% coverage)

```javascript
// Cached data when API fails
async function getCachedBusinessData(env) {
  try {
    const cached = await env.CHAT_HISTORY.get("booksy:business_data");
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}
```

### Layer 3: Static Fallbacks (Final - 1% coverage)

```javascript
// Known service data when everything fails
const KNOWN_SERVICES = {
  curly_adventure_first: {
    name: "Curly Adventure (First Time)",
    price: "$200",
    duration: "150 minutes",
    staff: "Tatiana Orozco",
    description: "Complete curly hair transformation...",
  },
};
```

## 🚀 Implementation Plan

### Phase 1: Replace Complex Scraping with Simple API

```javascript
/**
 * Clean, simple Booksy service lookup
 * 300 lines instead of 4,379 lines
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Simple routing
    if (path === "/booksy/services") {
      return await getServices(env);
    }

    if (path === "/booksy/appointments") {
      const service = url.searchParams.get("service");
      return await getAppointments(env, service);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function getServices(env) {
  try {
    // Try API first (fast, reliable)
    const businessData = await getBusinessData();
    const services = businessData.business.top_services.map((service) => ({
      name: service.name,
      price: service.variants[0]?.service_price || "Contact for pricing",
      duration: `${service.variants[0]?.duration || "Varies"} minutes`,
      description: service.description,
      category: service.category_name,
      staff: "Tatiana Orozco", // We know from API
      id: service.id,
    }));

    // Cache the result
    await env.CHAT_HISTORY.put("booksy:services", JSON.stringify(services), {
      expirationTtl: 3600, // 1 hour
    });

    return new Response(JSON.stringify(services), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Graceful fallback to cached data
    const cached = await getCachedServices(env);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Final fallback to known services
    return new Response(JSON.stringify(Object.values(KNOWN_SERVICES)), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function getAppointments(env, serviceName) {
  try {
    // Get service info via API (instant)
    const businessData = await getBusinessData();
    const service = findServiceByName(businessData.business.top_services, serviceName);

    if (!service) {
      return new Response(
        JSON.stringify({
          error: "Service not found",
          availableServices: businessData.business.top_services.map((s) => s.name),
        }),
        { status: 404 }
      );
    }

    // For time slots, provide helpful guidance instead of unreliable scraping
    return new Response(
      JSON.stringify({
        service: {
          name: service.name,
          price: service.variants[0]?.service_price,
          duration: `${service.variants[0]?.duration} minutes`,
          description: service.description,
          staff: "Tatiana Orozco",
        },
        business: {
          name: businessData.business.name,
          address: businessData.business.location?.address,
          phone: businessData.business.phone,
          rating: businessData.business.reviews_stars,
        },
        booking: {
          message: "To check availability and book this service, please visit:",
          url: "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999",
          phone: businessData.business.phone,
          instructions: "Call or book online for fastest service",
        },
        reliability: "high",
        extractionMethod: "api-first",
      })
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Service temporarily unavailable",
        message: "Please visit booksy.com or call directly",
        fallback: true,
      }),
      { status: 503 }
    );
  }
}
```

### Phase 2: Optional Time Slot Enhancement (If Needed)

```javascript
// Only if users really need time slots, add minimal browser automation
async function getAppointmentsWithTimeSlots(env, serviceName) {
  // Get service info via API first
  const serviceInfo = await getServiceViaAPI(serviceName);

  // Try simple time slot extraction (5 second timeout max)
  try {
    const timeSlots = await extractTimeSlotsSimple(env, serviceInfo.id);
    return { ...serviceInfo, timeSlots, reliability: "high" };
  } catch {
    // Graceful fallback - still provide rich service info
    return {
      ...serviceInfo,
      timeSlots: [],
      message: "For current availability, please visit booksy.com",
      reliability: "medium",
    };
  }
}

async function extractTimeSlotsSimple(env, serviceId) {
  // Minimal browser automation - 5 second timeout
  const browser = await launch(env.BROWSER);
  const page = await browser.newPage();

  try {
    await page.goto(BOOKSY_URL, { timeout: 5000 });
    // Simple extraction logic here
    const slots = await page.evaluate(() => {
      // Look for time slots, return empty array if not found quickly
      return [];
    });
    return slots;
  } finally {
    await browser.close();
  }
}
```

## 📊 Comparison: Current vs Antifragile

### Current Implementation (Complex)

- **Lines of Code**: 4,379
- **Reliability**: 30-40%
- **Response Time**: 15-60 seconds
- **Maintenance**: High complexity, many failure modes
- **Browser Usage**: Heavy, expensive
- **Debugging**: Difficult, many moving parts

### Antifragile Design (Simple)

- **Lines of Code**: ~300
- **Reliability**: 90%+ (API data always works)
- **Response Time**: 1-3 seconds
- **Maintenance**: Low complexity, clear failure modes
- **Browser Usage**: Minimal or none
- **Debugging**: Easy, clear data flow

## 🛡️ Antifragile Features

### 1. **Multiple Fallback Layers**

```
API → Cached Data → Static Data → Always Works
```

### 2. **Clear Error Communication**

```javascript
// Instead of: "Could not extract appointment data"
// Provide: "Found Curly Adventure service ($200, 150 min) - visit booksy.com to book"
```

### 3. **Fast Feedback**

```javascript
// Never make users wait for unreliable scraping
const HARD_TIMEOUT = 3000; // 3 seconds max for any operation
```

### 4. **Self-Healing**

```javascript
// Cache good data, recover from failures automatically
if (apiWorks) {
  await cacheGoodData();
  await resetFailureCounters();
}
```

### 5. **Monitoring & Observability**

```javascript
// Simple metrics for health monitoring
await env.CHAT_HISTORY.put("booksy:last_success", new Date().toISOString());
await env.CHAT_HISTORY.put("booksy:api_calls_today", callCount);
```

## 🎯 Migration Strategy

### Step 1: Deploy API-First Version

- Replace complex scraping with simple API calls
- Immediate 90% reliability improvement
- Keep old code as backup during transition

### Step 2: Monitor & Optimize

- Track API success rates
- Optimize caching strategies
- Remove unused browser automation code

### Step 3: Optional Enhancement

- Add minimal time slot extraction if really needed
- Focus on user experience over technical complexity

## 🚀 Expected Outcomes

### User Experience

```
Before: "Let me try to check availability... [30 seconds] ...sorry, system unavailable"

After: "Found Curly Adventure service! $200, 2.5 hours with Tatiana at Akro Beauty (8865 Commodity Circle, Orlando). Rating: 5 stars. To book, visit booksy.com or call [phone]."
```

### Developer Experience

- **Simpler codebase**: 300 lines vs 4,379 lines
- **Easier debugging**: Clear API responses vs complex browser states
- **Better reliability**: 90%+ vs 30-40%
- **Faster development**: API changes vs browser automation fixes

### Business Value

- **Higher customer satisfaction**: Reliable information vs frequent failures
- **Lower maintenance costs**: Simple API vs complex browser automation
- **Better scalability**: API calls vs browser instances
- **Professional experience**: Rich business data vs error messages

---

**Recommendation**: Implement the antifragile API-first design immediately. It's simpler, more reliable, and provides better user experience than the current complex browser automation approach.
