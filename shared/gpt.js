/**
 * Enhanced GPT module with resilient function calling for Booksy services
 * Supports circuit breaker patterns, smart fallbacks, and timeout protection
 */

/**
 * Available function definitions for GPT function calling
 */
export const BOOKSY_FUNCTIONS = [
  {
    name: "get_booksy_services",
    description:
      "Get complete list of all available services from Tata's Booksy page. Use when client asks about services, pricing, or wants to see all options.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "search_booksy_services",
    description:
      "Search for specific services by keyword (e.g., 'curly', 'color', 'consultation'). Use when client mentions specific service types.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search term for finding specific services (e.g., 'curly cut', 'color', 'first time')",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_service_recommendations",
    description:
      "Get personalized service recommendations based on client type. Use when client identifies as new/returning or needs guidance.",
    parameters: {
      type: "object",
      properties: {
        clientType: {
          type: "string",
          enum: ["new_client", "returning_client", "unknown"],
          description: "Type of client for personalized recommendations",
        },
      },
      required: ["clientType"],
    },
  },
  {
    name: "get_booking_instructions",
    description:
      "Get specific instructions for booking a service on Booksy. Use when client is ready to book or needs booking guidance.",
    parameters: {
      type: "object",
      properties: {
        serviceName: {
          type: "string",
          description: "Name of the service the client wants to book",
        },
      },
      required: ["serviceName"],
    },
  },
  {
    name: "get_available_appointments",
    description:
      "Get actual available appointment times for a specific service by scraping Booksy's booking calendar. Shows real-time availability! Ask client for preferred dates for better results.",
    parameters: {
      type: "object",
      properties: {
        serviceName: {
          type: "string",
          description:
            "Exact name of the service to get appointment times for (e.g. 'Curly Adventure (First Time)', 'Curly Cut + Simple Definition')",
        },
        preferredDates: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Optional array of preferred dates in YYYY-MM-DD format (e.g. ['2025-01-28', '2025-01-29']). Ask the client what dates work best for them.",
        },
      },
      required: ["serviceName"],
    },
  },
];

/**
 * Enhanced function calling with retry logic and user communication
 */
async function executeBooksyFunction(functionName, args, env, attempt = 1) {
  const maxAttempts = 2; // Allow one retry

  try {
    console.log(`🔧 Executing ${functionName} (attempt ${attempt}/${maxAttempts})`);

    const baseUrl = env.BOOKSY_MCP_URL || "https://booksy-dynamic.tataorowhatsappgpt.workers.dev";

    // Route function calls to appropriate endpoints
    const endpointMap = {
      get_booksy_services: "/services",
      search_booksy_services: `/search?q=${encodeURIComponent(args.query || "")}`,
      get_service_recommendations: `/recommendations?clientType=${args.clientType || "unknown"}`,
      get_booking_instructions: `/booking?service=${encodeURIComponent(args.serviceName || "")}`,
      get_available_appointments: `/appointments?service=${encodeURIComponent(
        args.serviceName || ""
      )}${args.preferredDates ? `&dates=${args.preferredDates.join(",")}` : ""}`,
    };

    const endpoint = endpointMap[functionName];
    if (!endpoint) {
      console.log(`❌ Unknown function: ${functionName}`);
      return { error: `Unknown function: ${functionName}` };
    }

    const url = `${baseUrl}${endpoint}`;
    console.log(`🌐 Calling: ${url} (attempt ${attempt})`);

    // Enhanced timeout with retry-aware timing
    const timeoutMs = attempt === 1 ? 12000 : 15000; // More time on retry
    const response = await Promise.race([
      fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": `TataOro-WhatsApp-GPT/1.9.0-retry-${attempt}`,
        },
      }),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Function call timeout after ${timeoutMs / 1000} seconds (attempt ${attempt})`
              )
            ),
          timeoutMs
        )
      ),
    ]);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await Promise.race([
      response.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("JSON parsing timeout")), 3000)),
    ]);

    console.log(`✅ Function ${functionName} executed successfully on attempt ${attempt}`);

    // Add retry success metadata for user communication
    if (attempt > 1) {
      result.retrySuccess = true;
      result.successfulAttempt = attempt;
      result.userMessage = "Great! I was able to get the latest information on my second try.";
    }

    return result;
  } catch (error) {
    console.error(`🚨 Function ${functionName} failed on attempt ${attempt}:`, error);

    // If this was our first attempt and we can retry, prepare retry response
    if (attempt < maxAttempts) {
      console.log(`🔄 Will retry ${functionName} (attempt ${attempt + 1}/${maxAttempts})`);

      // Return a retry indicator for user communication
      const retryResponse = {
        retryNeeded: true,
        currentAttempt: attempt,
        maxAttempts: maxAttempts,
        functionName: functionName,
        userMessage: generateRetryMessage(functionName, args),
        error: error.message,
      };

      return retryResponse;
    }

    // We've exhausted retries - return fallback with context
    console.log(`💥 Function ${functionName} failed after ${maxAttempts} attempts`);

    const fallback = getFunctionFallback(functionName, args);
    fallback.retriedAndFailed = true;
    fallback.totalAttempts = maxAttempts;
    fallback.userMessage = generateFailureMessage(functionName, args);

    return fallback;
  }
}

/**
 * Generate user-friendly retry messages
 */
function generateRetryMessage(functionName, args) {
  const messages = {
    get_booksy_services:
      "I'm having a bit of trouble getting the latest service information. Let me try again to get you the most current details! ⏳",
    search_booksy_services: `I had some difficulty searching for "${args.query}" services. Give me a moment to try again! 🔍`,
    get_service_recommendations: `I'm working to get you personalized recommendations. Let me try once more to find the perfect options for you! 💫`,
    get_booking_instructions: `I want to make sure I give you the clearest booking instructions for "${args.serviceName}". Trying again! 📅`,
    get_available_appointments: `I'm having trouble checking appointment availability for "${args.serviceName}". Let me try once more to get you real appointment times! ⏰`,
  };

  return (
    messages[functionName] || "I had some difficulty getting that information. Let me try again! ⏳"
  );
}

/**
 * Generate user-friendly failure messages after retries
 */
function generateFailureMessage(functionName, args) {
  const messages = {
    get_booksy_services:
      "I tried twice but had trouble getting the very latest service details. I'll show you our comprehensive service list with current pricing! 📋",
    search_booksy_services: `I tried a couple of times to search for "${args.query}" but ran into some technical issues. Here are the related services I can show you! 🔍`,
    get_service_recommendations:
      "I attempted to get you personalized recommendations but had some technical difficulties. Here are some great options based on your needs! 💫",
    get_booking_instructions: `I tried to get the most current booking steps for "${args.serviceName}" but encountered some issues. Here's how you can book! 📅`,
    get_available_appointments: `I tried twice to check real appointment times for "${args.serviceName}" but had technical difficulties. I'll help you with booking guidance instead! ⏰`,
  };

  return (
    messages[functionName] ||
    "I tried a couple of times but ran into some technical issues. Here's what I can help you with! 🛠️"
  );
}

/**
 * Smart fallback responses for function failures
 */
function getFunctionFallback(functionName, args) {
  console.log(`🛡️ Using fallback for ${functionName}`);

  const fallbacks = {
    get_booksy_services: {
      services: [
        {
          name: "Curly Adventure (First Time)",
          price: "$170",
          duration: "3-4 hours",
          description:
            "Complete curly hair transformation for new clients. Includes consultation, cut, and styling education.",
          category: "new_client",
        },
        {
          name: "Curly Adventure (Returning)",
          price: "$150",
          duration: "2-3 hours",
          description:
            "Curly cut and style for returning clients who understand their curl pattern.",
          category: "returning_client",
        },
        {
          name: "Consultation Only",
          price: "$50",
          duration: "45 minutes",
          description:
            "In-depth consultation to understand your curl pattern and create a care plan.",
          category: "consultation",
        },
        {
          name: "Color & Cut Package",
          price: "$250+",
          duration: "4-5 hours",
          description:
            "Complete color transformation with curly cut. Price varies based on color complexity.",
          category: "color",
        },
      ],
      fallback: true,
      whatsappFriendly: true,
      message:
        "Showing top services. Visit Tata's Booksy page for complete options and live booking!",
    },

    search_booksy_services: {
      services: getSearchFallback(args.query),
      fallback: true,
      query: args.query,
      whatsappFriendly: true,
      message: `Found services for "${args.query}". Visit Booksy for more options!`,
    },

    get_service_recommendations: {
      primary: getRecommendationFallback(args.clientType),
      secondary: [],
      description: `Great options for ${
        args.clientType === "new_client" ? "new" : "returning"
      } clients!`,
      fallback: true,
      whatsappFriendly: true,
    },

    get_booking_instructions: {
      instructions: [
        "Visit Tata's Booksy page",
        "Use 'Search for service' box under Tata's name",
        `Search for "${args.serviceName || "your service"}"`,
        "Click 'Book' and select your time",
      ],
      serviceName: args.serviceName,
      fallback: true,
      whatsappFriendly: true,
      message: "Quick booking steps - live calendar shows current availability!",
    },

    get_available_appointments: {
      available: false,
      message: `For "${
        args.serviceName || "your service"
      }" availability, please visit Tata's Booksy page where you can see real-time open slots.`,
      bookingTip:
        "Use the 'Search for service' box under Tata's name, then click 'Book' for available times.",
      preferredDates: args.preferredDates,
      fallback: true,
      whatsappFriendly: true,
    },
  };

  return (
    fallbacks[functionName] || {
      error: "Service temporarily unavailable",
      fallback: true,
      whatsappFriendly: true,
      message: "Please visit Tata's Booksy page directly for current information.",
    }
  );
}

/**
 * Smart search fallback based on query
 */
function getSearchFallback(query) {
  const allServices = [
    { name: "Curly Adventure (First Time)", price: "$170", category: "new_client" },
    { name: "Curly Adventure (Returning)", price: "$150", category: "returning_client" },
    { name: "Consultation Only", price: "$50", category: "consultation" },
    { name: "Color & Cut Package", price: "$250+", category: "color" },
  ];

  if (!query) return allServices;

  const searchTerm = query.toLowerCase();
  return allServices.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm) || service.category.includes(searchTerm)
  );
}

/**
 * Smart recommendation fallback based on client type
 */
function getRecommendationFallback(clientType) {
  const recommendations = {
    new_client: [
      { name: "Curly Adventure (First Time)", price: "$170", duration: "3-4 hours" },
      { name: "Consultation Only", price: "$50", duration: "45 minutes" },
    ],
    returning_client: [
      { name: "Curly Adventure (Returning)", price: "$150", duration: "2-3 hours" },
      { name: "Curl Refresh", price: "$60", duration: "1 hour" },
    ],
  };

  return recommendations[clientType] || recommendations.new_client;
}

/**
 * Enhanced GPT completion with resilient function calling
 */
export async function getChatCompletion(messages, env, options = {}) {
  try {
    const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    // Enhanced request configuration
    const requestData = {
      model: options.model || "gpt-4o-mini",
      messages,
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature || 0.7,
      // Only include functions for non-voice requests or when explicitly requested
      ...(options.includeFunctions !== false && {
        tools: BOOKSY_FUNCTIONS.map((func) => ({
          type: "function",
          function: func,
        })),
        tool_choice: "auto",
      }),
    };

    console.log(
      `🤖 GPT-4o request: ${messages.length} messages, functions: ${
        options.includeFunctions !== false ? "enabled" : "disabled"
      }`
    );

    // Enhanced timeout for GPT requests
    const response = await Promise.race([
      fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "User-Agent": "TataOro-WhatsApp-GPT/1.8.8",
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

    const data = await Promise.race([
      response.json(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("OpenAI response parsing timeout")), 5000)
      ),
    ]);

    const message = data.choices[0]?.message;
    if (!message) {
      throw new Error("No response from OpenAI");
    }

    // Enhanced function calling with resilience and retry logic
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(`🔧 Processing ${message.tool_calls.length} function call(s)...`);

      // Process function calls with enhanced error handling and retry logic
      const functionResults = [];
      let retryNeeded = false;
      let retryMessages = [];

      for (const toolCall of message.tool_calls) {
        try {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          console.log(`🔧 Calling function: ${functionName}`, args);

          // First attempt
          const result = await executeBooksyFunction(functionName, args, env, 1);

          // Check if retry is needed
          if (result.retryNeeded) {
            console.log(`🔄 Function ${functionName} needs retry`);
            retryNeeded = true;
            retryMessages.push(result.userMessage);

            // Perform the actual retry
            const retryResult = await executeBooksyFunction(functionName, args, env, 2);

            functionResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: JSON.stringify(retryResult),
            });
          } else {
            // First attempt succeeded or failed completely
            functionResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: JSON.stringify(result),
            });
          }
        } catch (error) {
          console.error(`❌ Function call failed:`, error);

          // Return graceful fallback for failed function calls
          functionResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: toolCall.function.name,
            content: JSON.stringify({
              error: "Function temporarily unavailable",
              fallback: true,
              message: "Using backup data. For live information, please visit Tata's Booksy page.",
            }),
          });
        }
      }

      // If retries were needed, we should communicate that to the user
      let conversationMessages = [...messages, message, ...functionResults];

      // Add retry context to the conversation if retries occurred
      if (retryNeeded && retryMessages.length > 0) {
        const retryContext = {
          role: "system",
          content: `Note: Some information required retries. User was informed with these messages: ${retryMessages.join(
            " "
          )} Please acknowledge the retry effort in your response and provide the requested information.`,
        };
        conversationMessages.push(retryContext);
      }

      console.log(`🔄 Getting follow-up response after function calls...`);

      // Recursive call without functions to get final response
      return await getChatCompletion(conversationMessages, env, {
        ...options,
        includeFunctions: false, // Prevent infinite function calling
        max_tokens: options.max_tokens || 1200, // Slightly higher for function result processing
      });
    }

    console.log(`✅ GPT response: ${message.content?.length || 0} characters`);
    return {
      content:
        message.content ||
        "I'm here to help with your curly hair needs! Please let me know what you're looking for.",
      usage: data.usage,
    };
  } catch (error) {
    console.error("🚨 GPT completion failed:", error);

    // Enhanced fallback response based on the last user message
    const lastMessage = messages[messages.length - 1]?.content || "";
    const fallbackResponse = generateSmartFallback(lastMessage);

    return {
      content: fallbackResponse,
      error: error.message,
      fallback: true,
    };
  }
}

/**
 * Generate smart fallback responses based on user message content (WhatsApp-friendly)
 */
function generateSmartFallback(userMessage) {
  const message = userMessage.toLowerCase();

  // Service-related fallbacks (concise)
  if (message.includes("service") || message.includes("price") || message.includes("cost")) {
    return `Hi there! 😊 I'm Tata's assistant! Here are our top services:

✂️ **Curly Adventure (First Time)** - $170 (3-4h)
Perfect for discovering your curl pattern!

✂️ **Curly Adventure (Returning)** - $150 (2-3h)  
For clients who know their curls

💆‍♀️ **Consultation Only** - $50 (45min)
Great way to start your journey

🌈 **Color & Cut Package** - $250+ (4-5h)

To book: Visit Tata's Booksy page → Search for service → Book!`;
  }

  // Booking-related fallbacks (concise)
  if (message.includes("book") || message.includes("appointment") || message.includes("schedule")) {
    return `Ready to book? 📅

1. Visit Tata's Booksy page
2. Use "Search for service" box under her name
3. Find your service → Click "Book"
4. Pick your preferred time

The live calendar shows all available slots. Need help choosing a service? Just ask! 😊`;
  }

  // New client fallbacks (concise)
  if (message.includes("new") || message.includes("first time")) {
    return `Welcome to your curly hair journey! 🌟

Perfect for new clients:
✂️ **Curly Adventure (First Time)** - $170 (3-4h)
Includes consultation, cut & styling education!

Or start with:
💆‍♀️ **Consultation Only** - $50 (45min)
Understand your curl pattern first

Ready to book? Visit Tata's Booksy page! 😊`;
  }

  // Default friendly fallback (concise)
  return `Hi there! 😊 I'm Tata's assistant for all things curly hair!

I can help you:
🔍 Find the perfect service
💰 Get pricing info  
📅 Guide you through booking
✨ Answer curly hair questions

Are you a new client or have you seen Tata before? 🌈`;
}

/**
 * Legacy compatibility function - use getChatCompletion instead
 * @deprecated Use getChatCompletion for new implementations
 */
export async function chatCompletion(messages, apiKey, model = "gpt-4o-mini", temperature = 0.7) {
  console.warn("⚠️ chatCompletion is deprecated, use getChatCompletion instead");

  // Create a mock env object for legacy compatibility
  const mockEnv = { OPENAI_API_KEY: apiKey };
  const result = await getChatCompletion(messages, mockEnv, {
    model,
    temperature,
    includeFunctions: false,
  });

  return {
    content: result.content,
    message: { content: result.content },
    usage: result.usage,
  };
}
