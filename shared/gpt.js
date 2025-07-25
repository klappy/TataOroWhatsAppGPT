/**
 * Enhanced GPT module with API-first Booksy integration
 *
 * Updated to use the new complete Booksy API endpoints (v1.16.0+)
 * No more browser automation - pure API calls for 100% reliability
 */

// Modern Booksy function definitions using new API-first endpoints
export const BOOKSY_FUNCTIONS = [
  {
    name: "get_booksy_services",
    description:
      "Get complete list of all available services with real pricing and details from Booksy API. Always use this when clients ask about services, pricing, or want to see options.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "search_booksy_services",
    description:
      "Search for specific services using intelligent fuzzy matching. Use when client asks for specific service types like 'curly cut', 'color', 'consultation', etc.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Service search term (e.g., 'curly', 'color', 'consultation', 'first time')",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_business_info",
    description:
      "Get complete business information including address, phone, rating, and reviews. Use when clients ask about location, contact info, or business details.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_appointment_info",
    description:
      "Get detailed service information with booking guidance. Use when clients want to book a specific service or need booking instructions.",
    parameters: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description:
            "Service name or search term (e.g., 'Curly Adventure', 'color', 'consultation')",
        },
      },
      required: ["service"],
    },
  },
  {
    name: "get_real_time_availability",
    description:
      "Get actual available appointment time slots for a service using real-time Booksy data. Shows exact times available this week. Use when clients want to see specific available times.",
    parameters: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description: "Service name (e.g., 'Curly Adventure', 'consultation')",
        },
      },
      required: ["service"],
    },
  },
];

/**
 * Execute Booksy function using new API-first architecture
 */
async function executeBooksyFunction(functionName, args, env, attempt = 1) {
  const maxAttempts = 2;

  try {
    console.log(`🔧 Executing ${functionName} (attempt ${attempt}/${maxAttempts}) - DIRECT CALL`);

    // DIRECT INTERNAL CALL - avoid recursive loop by calling booksy worker directly
    const booksyCompleteWorker = await import("../workers/booksy-complete.js");

    // Create a mock request for the booksy worker
    const endpoint = {
      get_booksy_services: "/booksy/services",
      search_booksy_services: `/booksy/appointments?service=${encodeURIComponent(
        args.query || ""
      )}`,
      get_business_info: "/booksy/business",
      get_appointment_info: `/booksy/appointments?service=${encodeURIComponent(
        args.service || ""
      )}`,
      get_real_time_availability: `/booksy/timeslots?service=${encodeURIComponent(
        args.service || ""
      )}`,
    }[functionName];

    if (!endpoint) {
      console.log(`❌ Unknown function: ${functionName}`);
      return { error: `Unknown function: ${functionName}` };
    }

    // Create a mock request object for internal call
    const mockRequest = new Request(`https://internal${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `TataOro-WhatsApp-GPT/1.20.1-internal`,
      },
    });

    console.log(`🔧 Direct internal call: ${endpoint} (attempt ${attempt})`);

    // Call the booksy worker directly - no external HTTP call
    const response = await booksyCompleteWorker.default.fetch(mockRequest, env);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await Promise.race([
      response.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("JSON parsing timeout")), 2000)),
    ]);

    console.log(`✅ Function ${functionName} executed successfully (API-first)`);

    // Transform response for WhatsApp-friendly format
    const transformedResult = transformApiResponse(functionName, result, args);

    // Debug logging for availability issues
    if (functionName === "get_real_time_availability") {
      console.log(`🔍 DEBUG ${functionName}:`, {
        rawTotalSlots: result.totalSlots,
        rawTimeSlots: result.timeSlots?.length || 0,
        transformedAvailable: transformedResult.available,
        transformedTotalSlots: transformedResult.totalSlots,
        transformedMessage: transformedResult.message,
      });
    }

    return transformedResult;
  } catch (error) {
    console.error(`🚨 API-first function ${functionName} failed on attempt ${attempt}:`, error);

    if (attempt < maxAttempts) {
      console.log(`🔄 Retrying ${functionName} (attempt ${attempt + 1}/${maxAttempts})`);
      return await executeBooksyFunction(functionName, args, env, attempt + 1);
    }

    console.log(`💥 Function ${functionName} failed after ${maxAttempts} attempts`);
    return getModernFallback(functionName, args);
  }
}

/**
 * Transform API responses for WhatsApp-friendly format
 */
function transformApiResponse(functionName, result, args) {
  switch (functionName) {
    case "get_booksy_services":
      return {
        services: result.services || [],
        count: result.count || 0,
        source: result.source || "api",
        whatsappFriendly: true,
        success: true,
        available: (result.count || 0) > 0,
        message: `SUCCESS: Found ${
          result.count || 0
        } current services from Booksy API! Filter and show appropriate services for client type.`,
      };

    case "search_booksy_services":
    case "get_appointment_info":
      return {
        service: result.service || {},
        business: result.business || {},
        booking: result.booking || {},
        availability: result.availability || null,
        whatsappFriendly: true,
        extractionMethod: result.extractionMethod || "api-first",
        message: result.availability
          ? "Found service with real-time availability!"
          : "Found service info - visit Booksy for live booking!",
      };

    case "get_business_info":
      return {
        business: {
          name: result.name,
          address: result.address,
          phone: result.phone,
          rating: result.rating,
          reviewCount: result.reviewCount,
          description: result.description,
        },
        whatsappFriendly: true,
        source: result.source || "api",
        message: `${result.name} - ${result.rating} stars (${result.reviewCount} reviews)`,
      };

    case "get_real_time_availability":
      const totalSlots = result.timeSlots
        ? result.timeSlots.reduce((sum, day) => sum + day.slotCount, 0)
        : 0;

      // Get service duration from result (parse "150 minutes" to 150)
      const serviceDuration = result.serviceDuration
        ? parseInt(result.serviceDuration.toString().replace(/\D/g, ""))
        : 150; // Default to 150 minutes if not provided

      // Format simple time ranges - Booksy already calculated valid start times
      const consolidatedTimes =
        result.timeSlots && result.timeSlots.length > 0
          ? result.timeSlots.slice(0, 7).map((day) => {
              const slots = day.slots;

              // Format time for display
              const formatTime = (timeStr) => {
                const [hour, minute] = timeStr.split(":").map(Number);
                const ampm = hour >= 12 ? "PM" : "AM";
                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                return `${displayHour}:${minute.toString().padStart(2, "0")}${ampm}`;
              };

              // Show first and last available times as a range with clear start time messaging
              if (slots.length === 1) {
                return `${day.date} (${day.dayOfWeek}): ${formatTime(
                  slots[0]
                )} start time available`;
              } else if (slots.length > 1) {
                return `${day.date} (${day.dayOfWeek}): ${formatTime(slots[0])} - ${formatTime(
                  slots[slots.length - 1]
                )} start times available`;
              }

              return `${day.date} (${day.dayOfWeek}): No times`;
            })
          : [];

      return {
        service: result.service,
        timeSlots: result.timeSlots || [],
        totalSlots: totalSlots,
        daysAvailable: result.timeSlots ? result.timeSlots.length : 0,
        source: result.source || "api",
        whatsappFriendly: true,
        available: totalSlots > 0,
        consolidatedTimes: consolidatedTimes,
        hasAvailability: totalSlots > 0,
        slotsFound: totalSlots,
        daysWithSlots: result.timeSlots ? result.timeSlots.length : 0,
        SUCCESS_FLAG: totalSlots > 0 ? "TIMES_AVAILABLE" : "NO_TIMES",
        EXPLICIT_INSTRUCTION:
          totalSlots > 0
            ? `AI: You MUST show available times to the user. DO NOT say no availability.`
            : "AI: No times available, show booking page.",
        message:
          totalSlots > 0
            ? `🎉 AVAILABILITY CONFIRMED: Available appointment times found! Tell user about these available times immediately. DO NOT say no availability.`
            : "No available time slots found for this service.",
        RESPONSE_TEMPLATE:
          totalSlots > 0
            ? `Great! I found available appointment times. Here are your options:\n\n${consolidatedTimes
                .slice(0, 5)
                .join("\n")}${
                result.timeSlots && result.timeSlots.length > 5
                  ? "\n\n📅 More dates available! Just ask about a specific day."
                  : ""
              }\n\nThese are available START times - you can book your appointment to begin at any time within these ranges!\n\nTo book, visit Tata's Booksy page and select your preferred time!`
            : "I couldn't find any available times for this service.",
      };

    default:
      return result;
  }
}

/**
 * Modern fallback responses (API-focused, no browser automation references)
 */
function getModernFallback(functionName, args) {
  console.log(`🛡️ Using modern fallback for ${functionName}`);

  const fallbacks = {
    get_booksy_services: {
      services: [
        {
          name: "Curly Adventure (First Time). Read Description",
          price: "$200.00+",
          duration: "150 minutes",
          description:
            "Complete curly hair transformation for new clients. Includes consultation, cut, and styling education.",
          category: "Curly Hair (Rizos)",
          staff: "Tatiana Orozco",
        },
        {
          name: "Diagnóstico : servicio color ( balayage, highlight",
          price: "Free",
          duration: "30 minutes",
          description: "Color consultation and diagnosis service",
          category: "General",
          staff: "Tatiana Orozco",
        },
        {
          name: "Corte, (hair cut) straight Hair, Cabello liso es",
          price: "$45.00",
          duration: "30 minutes",
          description: "Straight hair cutting service",
          category: "Hair/ salon Services",
          staff: "Tatiana Orozco",
        },
      ],
      count: 3,
      source: "fallback",
      whatsappFriendly: true,
      message: "Showing known services. Visit Booksy for complete live catalog!",
    },

    search_booksy_services: (() => {
      const serviceName = args.service || args.query || "service";
      return {
        service: {
          name: "Curly Adventure (First Time). Read Description",
          price: "$200.00+",
          duration: "150 minutes",
          staff: "Tatiana Orozco",
          description: "Complete curly hair transformation",
        },
        business: {
          name: "Akro Beauty by La Morocha Makeup",
          address: "8865 Commodity Circle, Suite 7A, Orlando, 32819",
          phone: "(407) 775-0004",
          rating: 5,
          reviewCount: 256,
        },
        booking: {
          message: "To check availability and book:",
          url: "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999",
          instructions: [
            "Visit Booksy link",
            "Search for service",
            "Select time",
            "Book appointment",
          ],
        },
        fallback: true,
        whatsappFriendly: true,
        message: `Found ${serviceName} info - visit Booksy for live booking!`,
      };
    })(),

    get_appointment_info: (() => {
      const serviceName = args.service || args.query || "service";
      return {
        service: {
          name: "Curly Adventure (First Time). Read Description",
          price: "$200.00+",
          duration: "150 minutes",
          staff: "Tatiana Orozco",
          description: "Complete curly hair transformation",
        },
        business: {
          name: "Akro Beauty by La Morocha Makeup",
          address: "8865 Commodity Circle, Suite 7A, Orlando, 32819",
          phone: "(407) 775-0004",
          rating: 5,
          reviewCount: 256,
        },
        booking: {
          message: "To check availability and book:",
          url: "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999",
          instructions: [
            "Visit Booksy link",
            "Search for service",
            "Select time",
            "Book appointment",
          ],
        },
        fallback: true,
        whatsappFriendly: true,
        message: `Found ${serviceName} info - visit Booksy for live booking!`,
      };
    })(),

    get_business_info: {
      business: {
        name: "Akro Beauty by La Morocha Makeup",
        address: "8865 Commodity Circle, Suite 7A, Orlando, 32819",
        phone: "(407) 775-0004",
        rating: 5,
        reviewCount: 256,
        description: "Curly hair specialist - Tatiana Orozco",
      },
      source: "fallback",
      whatsappFriendly: true,
      message: "Akro Beauty by La Morocha Makeup - 5 stars (256 reviews)",
    },

    get_real_time_availability: {
      service: args.service || "service",
      timeSlots: [],
      totalSlots: 0,
      daysAvailable: 0,
      source: "fallback",
      whatsappFriendly: true,
      message: "For current availability, please visit Booksy directly for real-time calendar",
    },
  };

  return (
    fallbacks[functionName] || {
      error: "Service temporarily unavailable",
      fallback: true,
      whatsappFriendly: true,
      message: "Please visit Booksy directly for current information.",
    }
  );
}

/**
 * Enhanced GPT completion with modern API-first function calling
 */
export async function getChatCompletion(messages, env, options = {}) {
  try {
    const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    const requestData = {
      model: options.model || "gpt-4o-mini",
      messages,
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature || 0.7,
      ...(options.includeFunctions !== false && {
        tools: BOOKSY_FUNCTIONS.map((func) => ({
          type: "function",
          function: func,
        })),
        tool_choice: "auto",
      }),
    };

    console.log(`🤖 GPT-4o request: ${messages.length} messages, API-first functions enabled`);

    const response = await Promise.race([
      fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "User-Agent": "TataOro-WhatsApp-GPT/1.16.0-api-first",
        },
        body: JSON.stringify(requestData),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("OpenAI API timeout after 20 seconds")), 20000)
      ),
    ]);

    if (!response.ok) {
      console.error(`❌ OpenAI API error: ${response.status} ${response.statusText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices[0]?.message;

    if (!message) {
      throw new Error("No response from OpenAI");
    }

    // Process function calls with new API-first architecture
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(`🔧 Processing ${message.tool_calls.length} API-first function call(s)...`);

      const functionResults = [];
      const functionCallsDebug = [];

      for (const toolCall of message.tool_calls) {
        try {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          console.log(`🔧 API-first function: ${functionName}`, args);
          const startTime = Date.now();
          const result = await executeBooksyFunction(functionName, args, env);
          const endTime = Date.now();

          // Track function call for debug info
          functionCallsDebug.push({
            name: functionName,
            args: args,
            success: !result.error,
            responseTime: `${endTime - startTime}ms`,
            source: result.source || "unknown",
            fallback: result.fallback || false,
          });

          functionResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: JSON.stringify(result),
          });
        } catch (error) {
          console.error(`❌ Function call failed:`, error);

          // Track failed function call for debug info
          functionCallsDebug.push({
            name: toolCall.function.name,
            args: {},
            success: false,
            responseTime: "ERROR",
            source: "error",
            fallback: true,
            error: error.message,
          });

          functionResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: toolCall.function.name,
            content: JSON.stringify({
              error: "Function temporarily unavailable",
              fallback: true,
              message: "Using backup data. Visit Booksy for live information.",
            }),
          });
        }
      }

      console.log(`🔄 Getting follow-up response after API-first function calls...`);

      const followUpResult = await getChatCompletion(
        [...messages, message, ...functionResults],
        env,
        {
          ...options,
          includeFunctions: false,
          max_tokens: options.max_tokens || 1200,
        }
      );

      // Merge function call debug info
      return {
        ...followUpResult,
        functionCalls: functionCallsDebug,
        fallback: functionCallsDebug.some((f) => f.fallback),
      };
    }

    console.log(`✅ GPT response: ${message.content?.length || 0} characters`);
    return {
      content: message.content || "I'm here to help with your curly hair needs!",
      usage: data.usage,
      functionCalls: [], // No function calls in this path
      fallback: false,
    };
  } catch (error) {
    console.error("🚨 GPT completion failed:", error);
    return {
      content: generateModernFallback(messages[messages.length - 1]?.content || ""),
      error: error.message,
      fallback: true,
    };
  }
}

/**
 * Generate modern fallback responses (WhatsApp-friendly, API-focused)
 */
function generateModernFallback(userMessage) {
  const message = userMessage.toLowerCase();

  if (message.includes("service") || message.includes("price") || message.includes("cost")) {
    return `Hi! 😊 I'm Tata's assistant! Here are our top services:

✂️ **Curly Adventure (First Time)** - $200+ (2.5h)
Perfect for discovering your curl pattern!

✂️ **Color Consultation** - Free (30min)  
Great way to plan your color journey

💇‍♀️ **Straight Hair Cut** - $45 (30min)
For non-curly hair cutting

To book: Visit Tata's Booksy page → Search for service → Book!`;
  }

  if (message.includes("book") || message.includes("appointment") || message.includes("schedule")) {
    return `Ready to book? 📅

**Akro Beauty by La Morocha Makeup**
📍 8865 Commodity Circle, Suite 7A, Orlando
📞 (407) 775-0004
⭐ 5 stars (256 reviews)

1. Visit Tata's Booksy page
2. Search for your service
3. Pick your preferred time
4. Complete booking

Need help choosing a service? Just ask! 😊`;
  }

  return `Hi! 😊 I'm Tata's assistant for curly hair services!

I can help you:
🔍 Find the perfect service & pricing
📅 Get booking information  
📍 Share location & contact details
⏰ Check real-time availability

What would you like to know? 💫`;
}

// Legacy function for backward compatibility (will be removed in future version)
export async function chatCompletion(messages, apiKey, model = "gpt-4o-mini", temperature = 0.7) {
  console.warn("⚠️ Using deprecated chatCompletion function. Use getChatCompletion instead.");

  const mockEnv = { OPENAI_API_KEY: apiKey };
  const result = await getChatCompletion(messages, mockEnv, { model, temperature });
  return result.content;
}
