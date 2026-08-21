const MODEL = "@cf/zai-org/glm-4.7-flash";
export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };
    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }
    // GET /health
    if (
      request.method === "GET" &&
      new URL(request.url).pathname === "/health"
    ) {
      return json({
        status: "online",
        name: "HungAI",
        version: "17.0",
        model: MODEL,
        aiBinding:
          !!env.AI &&
          typeof env.AI.run === "function"
      }, cors);
    }
    // POST /
    if (request.method !== "POST") {
      return json({
        error: "POST only"
      }, cors, 405);
    }
    try {
      if (
        !env.AI ||
        typeof env.AI.run !== "function"
      ) {
        return json({
          error: "AI binding không hoạt động."
        }, cors, 500);
      }
      const body = await request.json();
      const message =
        typeof body?.message === "string"
          ? body.message.trim()
          : "";
      if (!message) {
        return json({
          error: "Tin nhắn trống."
        }, cors, 400);
      }
      const history =
        Array.isArray(body?.history)
          ? body.history
              .filter(item =>
                item &&
                (
                  item.role === "user" ||
                  item.role === "assistant"
                ) &&
                typeof item.content === "string" &&
                item.content.trim()
              )
              .slice(-12)
              .map(item => ({
                role: item.role,
                content: item.content.trim()
              }))
          : [];
      const messages = [
        {
          role: "system",
          content:
            "Bạn là HungAI, trợ lý AI riêng của người dùng. " +
            "Trả lời bằng tiếng Việt khi người dùng nói tiếng Việt. " +
            "Hãy đọc history để hiểu ngữ cảnh cuộc trò chuyện. " +
            "Trả lời tự nhiên, rõ ràng và ngắn gọn khi câu hỏi đơn giản."
        },
        ...history,
        {
          role: "user",
          content: message
        }
      ];
      const result = await env.AI.run(
        MODEL,
        {
          messages
        }
      );
      let reply = "";
      if (
        typeof result?.response === "string"
      ) {
        reply = result.response.trim();
      }
      if (
        !reply &&
        typeof result?.response?.content === "string"
      ) {
        reply =
          result.response.content.trim();
      }
      if (
        !reply &&
        typeof result?.choices?.[0]?.message?.content === "string"
      ) {
        reply =
          result.choices[0].message.content.trim();
      }
      if (!reply) {
        console.error(
          "EMPTY AI RESPONSE",
          JSON.stringify(result)
        );
        return json({
          error:
            "Workers AI không trả về nội dung.",
          raw: result
        }, cors, 502);
      }
      return json({
        reply,
        source: "workers-ai",
        version: "17.0"
      }, cors);
    } catch (error) {
      console.error(
        "HUNGAI ERROR",
        error
      );
      return json({
        error:
          error?.message ||
          "HungAI gặp lỗi."
      }, cors, 500);
    }
  }
};
function json(data, cors, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...cors,
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "no-store"
      }
    }
  );
}
