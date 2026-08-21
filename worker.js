export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "online",
          message: "HungAI đang hoạt động.",
          model: "@cf/zai-org/glm-4.7-flash"
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Chỉ hỗ trợ POST."
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    try {
      const body = await request.json();
      const message = body?.message;

      if (!message || typeof message !== "string") {
        return new Response(
          JSON.stringify({
            error: "Thiếu message."
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
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
                "Bạn là HungAI, một trợ lý AI riêng của người dùng. Hãy trả lời tự nhiên, hữu ích và bằng tiếng Việt."
            },
            {
              role: "user",
              content: message
            }
          ]
        }
      );

      // Trả nguyên kết quả của Workers AI để frontend xử lý đúng cấu trúc.
      return new Response(
        JSON.stringify({
          success: true,
          result: result
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error?.message || String(error)
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
  }
};
