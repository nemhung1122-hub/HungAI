const MODEL = "@cf/zai-org/glm-4.7-flash";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...CORS
      }
    }
  );
}

export default {
  async fetch(request, env) {

    /*
     * ==========================
     * CORS PREFLIGHT
     * ==========================
     */

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS
      });
    }


    /*
     * ==========================
     * GET
     * ==========================
     */

    if (request.method === "GET") {
      return json({
        status: "online",
        name: "HungAI",
        version: "TEST-1",
        model: MODEL,
        aiBinding: !!env?.AI
      });
    }


    /*
     * ==========================
     * POST
     * ==========================
     */

    if (request.method !== "POST") {
      return json({
        error: "POST only"
      }, 405);
    }


    try {

      /*
       * Kiểm tra AI binding
       */

      if (
        !env?.AI ||
        typeof env.AI.run !== "function"
      ) {
        return json({
          error: "AI binding không tồn tại."
        }, 500);
      }


      /*
       * Đọc JSON
       */

      const body =
        await request.json();


      const message =
        typeof body?.message === "string"
          ? body.message.trim()
          : "";


      if (!message) {
        return json({
          error: "Tin nhắn trống."
        }, 400);
      }


      /*
       * Chỉ test AI.
       *
       * Không calendar.
       * Không cache.
       * Không history.
       * Không tính toán.
       */

      const result =
        await env.AI.run(
          MODEL,
          {
            messages: [
              {
                role: "user",
                content: message
              }
            ]
          }
        );


      /*
       * Cloudflare hiện trả response
       * dạng { response: "..." } cho
       * cách gọi synchronous này.
       */

      const reply =
        typeof result?.response === "string"
          ? result.response.trim()
          : "";


      /*
       * Trả cả raw result để kiểm tra
       * nếu model không trả response.
       */

      if (!reply) {

        return json({
          error:
            "Workers AI không trả response dạng text.",
          aiResult: result
        }, 500);
      }


      return json({
        reply,
        source: "workers-ai",
        model: MODEL
      });


    } catch (error) {

      console.error(
        "HungAI TEST ERROR:",
        error
      );


      return json({
        error:
          error?.message ||
          String(error) ||
          "Unknown Worker error"
      }, 500);
    }
  }
};
