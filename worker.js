export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "online",
          model: "@cf/zai-org/glm-4.7-flash"
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        }
      );
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "POST only" }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        }
      );
    }

    try {
      const body = await request.json();
      const message = String(body?.message || "").trim();

      if (!message) {
        return new Response(
          JSON.stringify({ error: "Tin nhắn trống." }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...cors
            }
          }
        );
      }

      const result = await env.AI.run(
        "@cf/zai-org/glm-4.7-flash",
        {
          messages: [
            {
              role: "system",
              content:
                "Bạn là HungAI, trợ lý AI riêng của người dùng. Trả lời tự nhiên, rõ ràng và bằng tiếng Việt."
            },
            {
              role: "user",
              content: message
            }
          ]
        }
      );

      // Cloudflare trả response.response cho Workers AI model này.
      const reply =
        typeof result?.response === "string"
          ? result.response
          : JSON.stringify(result?.response ?? result);

      return new Response(
        JSON.stringify({
          reply
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        }
      );

    } catch (error) {
      console.error("HungAI error:", error);

      return new Response(
        JSON.stringify({
          error: error?.message || "Workers AI error"
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        }
      );
    }
  }
};
