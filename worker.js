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
      return json(
        { error: "POST only" },
        cors,
        405
      );
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
                item =>
                  item &&
                  (item.role === "user" ||
                    item.role === "assistant") &&
                  typeof item.content === "string"
              )
              .slice(-20)
          : [];

      if (!message) {
        return json(
          { error: "Tin nhắn trống." },
          cors,
          400
        );
      }

      const timezone =
        request.cf?.timezone ||
        "Asia/Ho_Chi_Minh";

      const now =
        new Date();

      const dateInfo =
        getDateTimeInfo(
          now,
          timezone
        );

      /*
       * Các câu hỏi về ngày/giờ được xử lý
       * hoàn toàn bằng code.
       */

      if (isDateTimeQuestion(message)) {

        return json({
          reply:
            `Hôm nay là ${dateInfo.weekday}, ` +
            `ngày ${dateInfo.day} tháng ` +
            `${dateInfo.month} năm ${dateInfo.year}. ` +
            `Bây giờ là ${dateInfo.hour}:${dateInfo.minute}.`,
          currentTime: dateInfo
        }, cors);

      }

      const systemPrompt = `
Bạn là HungAI, trợ lý AI riêng của người dùng.

Tính cách:
- Thân thiện.
- Tự nhiên.
- Rõ ràng.
- Hữu ích.
- Trả lời bằng tiếng Việt khi người dùng nói tiếng Việt.

THỜI GIAN HỆ THỐNG:
Ngày: ${dateInfo.day}/${dateInfo.month}/${dateInfo.year}
Thứ: ${dateInfo.weekday}
Giờ: ${dateInfo.hour}:${dateInfo.minute}
Múi giờ: ${timezone}

QUY TẮC:
1. Dùng lịch sử hội thoại để hiểu ngữ cảnh.
2. Không bịa thông tin.
3. Không tự đoán ngày hoặc thứ.
4. Nếu người dùng hỏi ngày/giờ hiện tại,
   hãy sử dụng dữ liệu hệ thống được cung cấp.
5. Nếu không có dữ liệu thời gian thực cho một vấn đề,
   không được giả vờ rằng bạn đã kiểm tra nó.
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

      if (typeof reply !== "string") {
        reply =
          JSON.stringify(
            reply ?? result
          );
      }

      return json({
        reply,
        currentTime: dateInfo
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


function isDateTimeQuestion(text) {

  const q =
    text.toLowerCase();

  const keywords = [
    "hôm nay ngày mấy",
    "hôm nay là ngày mấy",
    "hôm nay ngày bao nhiêu",
    "ngày hôm nay",
    "hôm nay thứ mấy",
    "hôm nay là thứ mấy",
    "bây giờ mấy giờ",
    "bây giờ là mấy giờ",
    "mấy giờ rồi",
    "giờ hiện tại",
    "thời gian hiện tại",
    "ngày tháng năm",
    "hôm nay là ngày gì",
    "hôm nay ngày gì"
  ];

  return keywords.some(
    keyword =>
      q.includes(keyword)
  );
}


function getDateTimeInfo(
  date,
  timezone
) {

  const parts =
    new Intl.DateTimeFormat(
      "vi-VN",
      {
        timeZone: timezone,
        weekday: "long",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    ).formatToParts(date);

  const get =
    type =>
      parts.find(
        item =>
          item.type === type
      )?.value;

  let weekday =
    get("weekday");

  /*
   * Intl tiếng Việt đôi khi trả:
   * "Thứ Sáu", "thứ sáu"...
   * Chuẩn hóa để hiển thị đẹp.
   */

  weekday =
    weekday.charAt(0).toUpperCase() +
    weekday.slice(1);

  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    weekday,
    hour: get("hour"),
    minute: get("minute"),
    timezone
  };
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
