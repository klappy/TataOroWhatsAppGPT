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
];

/**
 * Enhanced function calling with resilience and timeout protection
 */
async function executeBooksyFunction(functionName, args, env) {
  try {
    console.log(`🔧 Executing ${functionName} with circuit breaker check...`);

    // Construct the MCP server URL
    const baseUrl = env.BOOKSY_MCP_URL || "https://booksy-dynamic.tataorowhatsappgpt.workers.dev";

    // Route function calls to appropriate endpoints
    const endpointMap = {
      get_booksy_services: "/services",
      search_booksy_services: `/search?q=${encodeURIComponent(args.query || "")}`,
      get_service_recommendations: `/recommendations?clientType=${args.clientType || "unknown"}`,
      get_booking_instructions: `/booking?service=${encodeURIComponent(args.serviceName || "")}`,
    };

    const endpoint = endpointMap[functionName];
    if (!endpoint) {
      console.log(`❌ Unknown function: ${functionName}`);
      return { error: `Unknown function: ${functionName}` };
    }

    const url = `${baseUrl}${endpoint}`;
    console.log(`🌐 Calling: ${url}`);

    // Enhanced timeout and retry logic
    const response = await Promise.race([
      fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TataOro-WhatsApp-GPT/1.8.8",
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Function call timeout after 12 seconds")), 12000)
      ),
    ]);

    if (!response.ok) {
      console.log(`❌ Function call failed: ${response.status} ${response.statusText}`);
      return getFunctionFallback(functionName, args);
    }

    const result = await Promise.race([
      response.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("JSON parsing timeout")), 3000)),
    ]);

    console.log(`✅ Function ${functionName} executed successfully`);
    return result;
  } catch (error) {
    console.error(`🚨 Function ${functionName} failed:`, error);
    return getFunctionFallback(functionName, args);
  }
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
      message:
        "Using backup service data. For complete options and live booking, please visit Tata's Booksy page.",
    },

    search_booksy_services: {
      services: getSearchFallback(args.query),
      fallback: true,
      query: args.query,
      message: `Found services related to "${args.query}" from backup data.`,
    },

    get_service_recommendations: {
      primary: getRecommendationFallback(args.clientType),
      secondary: [],
      description: `Great options for ${
        args.clientType === "new_client" ? "new" : "returning"
      } clients!`,
      fallback: true,
    },

    get_booking_instructions: {
      instructions: [
        "Visit Tata's Booksy page",
        "Look for the 'Search for service' box under Tata's name/photo",
        `Search for "${args.serviceName || "your desired service"}"`,
        "Click 'Book' next to your chosen service",
        "Select your preferred date and time",
        "Complete the booking form",
      ],
      serviceName: args.serviceName,
      fallback: true,
      message:
        "Here are the general booking steps. The live calendar will show current availability.",
    },
  };

  return (
    fallbacks[functionName] || {
      error: "Service temporarily unavailable",
      fallback: true,
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

    // Enhanced function calling with resilience
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(`🔧 Processing ${message.tool_calls.length} function call(s)...`);

      // Process function calls with enhanced error handling
      const functionResults = await Promise.all(
        message.tool_calls.map(async (toolCall) => {
          try {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            console.log(`🔧 Calling function: ${functionName}`, args);

            // Use the new enhanced function execution
            const result = await executeBooksyFunction(functionName, args, env);

            return {
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: JSON.stringify(result),
            };
          } catch (error) {
            console.error(`❌ Function call failed:`, error);

            // Return graceful fallback for failed function calls
            return {
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: JSON.stringify({
                error: "Function temporarily unavailable",
                fallback: true,
                message:
                  "Using backup data. For live information, please visit Tata's Booksy page.",
              }),
            };
          }
        })
      );

      // Add function results to conversation and get final response
      const followUpMessages = [...messages, message, ...functionResults];

      console.log(`🔄 Getting follow-up response after function calls...`);

      // Recursive call without functions to get final response
      return await getChatCompletion(followUpMessages, env, {
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
 * Generate smart fallback responses based on user message content
 */
function generateSmartFallback(userMessage) {
  const message = userMessage.toLowerCase();

  // Service-related fallbacks
  if (message.includes("service") || message.includes("price") || message.includes("cost")) {
    return `Hi there! 😊 I'm Tata's assistant. Here are the main services:

✂️ **Curly Adventure (First Time)** - $170 (3-4 hours)
Perfect for new clients to discover your curl pattern!

✂️ **Curly Adventure (Returning)** - $150 (2-3 hours)  
For clients who know their curls already

💆‍♀️ **Consultation Only** - $50 (45 minutes)
Great way to start your curly journey

🌈 **Color & Cut Package** - $250+ (4-5 hours)
Complete transformation with color

To book, visit Tata's Booksy page and use the "Search for service" box under her name/photo!`;
  }

  // Booking-related fallbacks
  if (message.includes("book") || message.includes("appointment") || message.includes("schedule")) {
    return `I'd love to help you book! 📅

To schedule your appointment:
1. Visit Tata's Booksy page
2. Look for the "Search for service" box under Tata's name/photo
3. Search for your desired service
4. Click "Book" and select your preferred time

The live calendar will show all available slots. I'm here if you need help choosing the right service! 😊`;
  }

  // New client fallbacks
  if (message.includes("new") || message.includes("first time")) {
    return `Welcome to your curly hair journey! 🌟

For first-time clients, I recommend:
✂️ **Curly Adventure (First Time)** - $170 (3-4 hours)
This includes consultation, cut, and styling education!

Or start with:
💆‍♀️ **Consultation Only** - $50 (45 minutes)
Perfect to understand your curl pattern first

Ready to book? Visit Tata's Booksy page and search for your chosen service! 😊`;
  }

  // Default friendly fallback
  return `Hi there! 😊 I'm Tata's assistant, here to help with your curly hair journey!

I can help you:
🔍 Find the perfect service for your curls
💰 Get pricing and duration info  
📅 Guide you through booking
✨ Answer questions about curly hair care

What can I help you with today? Just let me know if you're a new or returning client and I'll show you the best options! 🌈`;
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
