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

      /*
       * Lấy thời gian thực tế của request.
       * Nếu Cloudflare xác định được timezone
       * của người dùng thì dùng timezone đó.
       * Nếu không, mặc định Việt Nam.
       */

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
       * Nếu người dùng hỏi ngày/giờ,
       * trả lời trực tiếp từ đồng hồ hệ thống.
       * Không cho model đoán.
       */

      if (isDateTimeQuestion(message)) {

        return json({
          reply:
            `Hôm nay là ${dateInfo.day} ` +
            `tháng ${dateInfo.month} ` +
            `năm ${dateInfo.year}. ` +
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

THỜI GIAN HIỆN TẠI:
- Ngày: ${dateInfo.day}/${dateInfo.month}/${dateInfo.year}
- Giờ: ${dateInfo.hour}:${dateInfo.minute}
- Múi giờ: ${timezone}

QUY TẮC:
1. Dùng lịch sử hội thoại để hiểu ngữ cảnh.
2. Không bịa thông tin.
3. Không tự đoán ngày tháng.
4. Khi người dùng hỏi về ngày hoặc giờ hiện tại,
   hãy dùng thông tin thời gian được cung cấp ở trên.
5. Với thông tin cần dữ liệu trực tiếp như thời tiết,
   tin tức hoặc giá hiện tại, không được giả vờ rằng
   bạn đã kiểm tra dữ liệu nếu chưa có nguồn dữ liệu.
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


/*
 * Nhận biết câu hỏi về ngày/giờ.
 */

function isDateTimeQuestion(text) {

  const q =
    text.toLowerCase();

  const keywords = [
    "hôm nay ngày mấy",
    "hôm nay là ngày mấy",
    "hôm nay ngày bao nhiêu",
    "ngày hôm nay",
    "hôm nay thứ mấy",
    "bây giờ mấy giờ",
    "bây giờ là mấy giờ",
    "mấy giờ rồi",
    "giờ hiện tại",
    "thời gian hiện tại",
    "ngày tháng năm"
  ];

  return keywords.some(
    keyword =>
      q.includes(keyword)
  );
}


/*
 * Chuyển thời gian thành dữ liệu
 * dễ đưa cho model sử dụng.
 */

function getDateTimeInfo(
  date,
  timezone
) {

  const parts =
    new Intl.DateTimeFormat(
      "vi-VN",
      {
        timeZone: timezone,
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

  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
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
