import {
  getVietnamDate,
  formatVietnamDate,
  formatVietnamTime
} from "./calendar.js";

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: cors
      });
    }

    if (request.method === "GET") {
      return json({
        status: "online",
        name: "HungAI",
        model: "@cf/zai-org/glm-4.7-flash"
      }, cors);
    }

    if (request.method !== "POST") {
      return json(
        { error: "POST only" },
        cors,
        405
      );
    }

    try {
      const body =
        await request.json();

      const message =
        typeof body?.message === "string"
          ? body.message.trim()
          : "";

      const history =
        Array.isArray(body?.history)
          ? body.history
              .filter(
                item =>
                  item &&
                  (
                    item.role === "user" ||
                    item.role === "assistant"
                  ) &&
                  typeof item.content === "string"
              )
              .slice(-20)
          : [];

      if (!message) {
        return json(
          {
            error:
              "Tin nhắn trống."
          },
          cors,
          400
        );
      }

      /*
       * Lấy thời gian thật của Việt Nam.
       */
      const current =
        getVietnamDate();

      /*
       * Các câu hỏi về ngày giờ
       * được xử lý trực tiếp bằng code.
       */
      if (
        isCalendarQuestion(message)
      ) {

        return json({
          reply:
            `📅 ${formatVietnamDate(current)}\n` +
            `🕐 ${formatVietnamTime(current)}\n` +
            `🌏 Múi giờ: Việt Nam (UTC+7)`,
          calendar: current
        }, cors);
      }

      /*
       * Với câu hỏi bình thường,
       * đưa thời gian thật vào context
       * để AI biết ngày hiện tại.
       */
      const systemPrompt = `
Bạn là HungAI, trợ lý AI riêng của người dùng.

Hãy trả lời tự nhiên, thân thiện và chính xác.

THỜI GIAN THỰC TẾ:
${formatVietnamDate(current)}
${formatVietnamTime(current)}
Múi giờ: Việt Nam (UTC+7)

QUY TẮC:
- Không tự đoán ngày hoặc thứ.
- Không tự bịa thông tin.
- Dùng lịch sử hội thoại để hiểu ngữ cảnh.
- Nếu không biết thì nói không biết.
`;

      const messages = [
        {
          role: "system",
          content: systemPrompt
        },

        ...history,

        {
          role: "user",
          content: message
        }
      ];

      const result =
        await env.AI.run(
          "@cf/zai-org/glm-4.7-flash",
          {
            messages
          }
        );

      let reply =
        result?.response;

      if (
        typeof reply !== "string"
      ) {
        reply =
          JSON.stringify(
            reply ?? result
          );
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


function isCalendarQuestion(text) {

  const q =
    text.toLowerCase();

  const keywords = [
    "hôm nay",
    "hôm qua",
    "ngày mai",
    "mai là ngày",
    "mấy giờ",
    "bây giờ",
    "giờ hiện tại",
    "thời gian hiện tại",
    "thứ mấy",
    "ngày mấy",
    "ngày bao nhiêu",
    "ngày tháng năm"
  ];

  return keywords.some(
    keyword =>
      q.includes(keyword)
  );
}


function json(
  data,
  cors,
  status = 200
) {

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
