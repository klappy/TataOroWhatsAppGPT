/**
 * General GPT call abstraction using OpenAI Chat Completion API.
 * Now supports function calling for dynamic data retrieval.
 */
export async function chatCompletion(
  messages,
  apiKey,
  model = "gpt-4o",
  temperature = 0.7,
  tools = null,
  toolChoice = "auto"
) {
  const payload = {
    model,
    messages,
    temperature,
  };

  // Add function calling support
  if (tools && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = toolChoice;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message || null;
}

/**
 * Execute a function call by making HTTP request to MCP server
 */
export async function executeFunctionCall(functionCall, baseUrl) {
  try {
    const { name, arguments: args } = functionCall;
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;

    let url;
    switch (name) {
      case "get_booksy_services":
        url = `${baseUrl}/booksy/services`;
        break;

      case "search_booksy_services":
        url = `${baseUrl}/booksy/services/search?q=${encodeURIComponent(parsedArgs.query || "")}`;
        break;

      case "get_service_recommendations":
        url = `${baseUrl}/booksy/services/recommendations?type=${encodeURIComponent(
          parsedArgs.clientType || "new"
        )}`;
        break;

      case "get_booking_instructions":
        if (!parsedArgs.serviceName) {
          return { error: "Service name is required for booking instructions" };
        }
        url = `${baseUrl}/booksy/booking?service=${encodeURIComponent(parsedArgs.serviceName)}`;
        break;

      default:
        return { error: `Unknown function: ${name}` };
    }

    console.log(`Calling function ${name} at URL: ${url}`);

    const response = await fetch(url, {
      timeout: 5000, // 5 second timeout
      headers: {
        "User-Agent": "TataOro-WhatsApp-Bot/1.0",
      },
    });

    if (!response.ok) {
      console.error(`Function call failed: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`Function ${name} succeeded, returning data`);
    return result;
  } catch (error) {
    console.error(`Function call execution failed for ${name}:`, error);
    return {
      error: "Function execution failed",
      details: error.message,
      functionName: name,
      baseUrl,
      fallback: "Using backup service information instead",
    };
  }
}

/**
 * Available function definitions for GPT function calling
 */
export const BOOKSY_FUNCTIONS = [
  {
    type: "function",
    function: {
      name: "get_booksy_services",
      description:
        "Get all current services available from Tata Oro's Booksy page. This provides real-time, up-to-date service information including names, prices, durations, and descriptions.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_booksy_services",
      description:
        "Search for specific services by keyword (e.g. 'curly', 'color', 'consultation', 'first time'). Use this when clients ask about specific types of services.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search term to find relevant services (e.g. 'curly cut', 'color', 'consultation')",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_service_recommendations",
      description:
        "Get recommended services based on client type. Use 'new' for first-time clients, 'returning' for existing clients.",
      parameters: {
        type: "object",
        properties: {
          clientType: {
            type: "string",
            enum: ["new", "returning"],
            description:
              "Type of client - 'new' for first-time clients, 'returning' for existing clients",
          },
        },
        required: ["clientType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_booking_instructions",
      description:
        "Get detailed booking instructions for a specific service, including the Booksy link and step-by-step navigation guidance.",
      parameters: {
        type: "object",
        properties: {
          serviceName: {
            type: "string",
            description:
              "Exact name of the service to book (e.g. 'Curly Adventure (First Time)', 'Curly Cut + Simple Definition')",
          },
        },
        required: ["serviceName"],
      },
    },
  },
];
