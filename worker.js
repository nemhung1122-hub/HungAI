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
      return json({
        status: "online",
        name: "HungAI",
        model: "@cf/zai-org/glm-4.7-flash"
      }, cors);
    }

    if (request.method !== "POST") {
      return json({ error: "POST only" }, cors, 405);
    }

    try {
      const body = await request.json();

      const message =
        typeof body?.message === "string"
          ? body.message.trim()
          : "";

      const history =
        Array.isArray(body?.history)
          ? body.history
              .filter(
                x =>
                  x &&
                  (x.role === "user" ||
                   x.role === "assistant") &&
                  typeof x.content === "string"
              )
              .slice(-20)
          : [];

      if (!message) {
        return json({
          error: "Tin nhắn trống."
        }, cors, 400);
      }

      /*
       * HungAI system:
       *
       * - Hiểu ngữ cảnh cuộc trò chuyện.
       * - Không bịa dữ liệu hiện tại.
       * - Nếu không có dữ liệu thời gian thực,
       *   nói rõ giới hạn.
       * - Trả lời tự nhiên bằng tiếng Việt.
       */

      const messages = [
        {
          role: "system",
          content: `
Bạn là HungAI, trợ lý AI riêng của người dùng.

Tính cách:
- Thân thiện.
- Tự nhiên.
- Rõ ràng.
- Hữu ích.
- Ưu tiên tiếng Việt.

Nguyên tắc:
1. Sử dụng lịch sử hội thoại để hiểu ngữ cảnh.
2. Trả lời trực tiếp câu hỏi.
3. Không bịa thông tin.
4. Với thông tin cần dữ liệu thời gian thực như thời tiết,
   giá tiền, tin tức hoặc sự kiện mới nhất, nếu bạn không
   có dữ liệu trực tiếp thì phải nói rõ rằng bạn không thể
   xác nhận dữ liệu hiện tại.
5. Khi người dùng hỏi tiếp về một chủ đề vừa nói,
   hãy tiếp tục đúng ngữ cảnh.
`
        },

        ...history,

        {
          role: "user",
          content: message
        }
      ];

      const result = await env.AI.run(
        "@cf/zai-org/glm-4.7-flash",
        {
          messages
        }
      );

      let reply = result?.response;

      if (typeof reply !== "string") {
        reply = JSON.stringify(reply ?? result);
      }

      return json({
        reply
      }, cors);

    } catch (error) {

      console.error(
        "HungAI error:",
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
        "Content-Type":
          "application/json; charset=utf-8",

        ...cors
      }
    }
  );
}
