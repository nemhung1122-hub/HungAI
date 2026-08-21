import {
  getVietnamDate,
  formatVietnamDate,
  formatVietnamTime
} from "./calendar.js";

import {
  getDayEvents,
  formatDayEvents
} from "./holidays.js";


const MODEL =
  "@cf/zai-org/glm-4.7-flash";


export default {

  async fetch(request, env) {

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type"
    };


    if (request.method === "OPTIONS") {

      return new Response(null, {
        headers: cors
      });

    }


    if (request.method === "GET") {

      return json(
        {
          status: "online",
          name: "HungAI",
          model: MODEL,
          version: "2.0"
        },
        cors
      );

    }


    if (request.method !== "POST") {

      return json(
        {
          error: "POST only"
        },
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
            error: "Tin nhắn trống."
          },
          cors,
          400
        );

      }


      /*
       * =========================
       * THỜI GIAN
       * =========================
       */

      const current =
        getVietnamDate();


      /*
       * =========================
       * NGÀY ĐẶC BIỆT
       * =========================
       */

      const events =
        getDayEvents(
          current.day,
          current.month
        );


      /*
       * =========================
       * CÂU HỎI LỊCH
       * =========================
       */

      const calendarAnswer =
        getCalendarAnswer(
          message,
          current
        );


      if (calendarAnswer) {

        return json(
          {
            reply:
              calendarAnswer,

            calendar:
              current,

            events
          },
          cors
        );

      }


      /*
       * =========================
       * CÂU HỎI NGÀY ĐẶC BIỆT
       * =========================
       */

      if (
        isSpecialDayQuestion(message)
      ) {

        return json(
          {
            reply:
              buildSpecialDayAnswer(
                current,
                events
              ),

            calendar:
              current,

            events
          },
          cors
        );

      }


      /*
       * =========================
       * AI
       * =========================
       */

      const systemPrompt = `

Bạn là HungAI, trợ lý AI riêng của người dùng.

TÍNH CÁCH:

- Thân thiện.
- Tự nhiên.
- Nói tiếng Việt khi người dùng nói tiếng Việt.
- Trả lời rõ ràng.
- Không vòng vo.
- Không bịa thông tin.

THỜI GIAN HỆ THỐNG:

Ngày:
${formatVietnamDate(current)}

Giờ:
${formatVietnamTime(current)}

Múi giờ:
Việt Nam (UTC+7)

NGÀY ĐẶC BIỆT HÔM NAY:

${formatDayEvents(events)}

QUY TẮC QUAN TRỌNG:

1. Không tự đoán ngày tháng.
2. Không tự tính thứ.
3. Nếu được hỏi ngày/giờ hiện tại,
   dữ liệu hệ thống ở trên là nguồn chính xác.
4. Không gọi một ngày Internet là
   "ngày lễ quốc gia" nếu nó chỉ là
   ngày kỷ niệm hoặc ngày phổ biến.
5. Nếu không biết thông tin,
   hãy nói rằng không biết.
6. Không bịa nguồn hoặc sự kiện.

`;


      const messages = [

        {
          role: "system",
          content:
            systemPrompt
        },

        ...history,

        {
          role: "user",
          content:
            message
        }

      ];


      const result =
        await env.AI.run(
          MODEL,
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


      return json(
        {
          reply,

          calendar:
            current,

          events
        },
        cors
      );


    } catch (error) {

      console.error(
        "HungAI error:",
        error
      );


      return json(
        {
          error:
            error?.message ||
            "HungAI gặp lỗi."
        },
        cors,
        500
      );

    }

  }

};


/*
 * =====================================
 * LỊCH
 * =====================================
 */

function getCalendarAnswer(
  text,
  current
) {

  const q =
    text.toLowerCase();


  let target =
    null;

  let label =
    "";


  if (
    q.includes("hôm qua")
  ) {

    target =
      shiftDate(
        current,
        -1
      );

    label =
      "Hôm qua";

  }


  else if (
    q.includes("hôm nay")
  ) {

    target =
      current;

    label =
      "Hôm nay";

  }


  else if (
    q.includes("ngày mai") ||
    q === "mai" ||
    q.includes("mai là ngày")
  ) {

    target =
      shiftDate(
        current,
        1
      );

    label =
      "Ngày mai";

  }


  else {

    return null;

  }


  /*
   * Chỉ xử lý nếu thực sự hỏi về
   * ngày / thứ / giờ.
   */

  const asksDate =
    q.includes("ngày") ||
    q.includes("thứ") ||
    q.includes("hôm qua") ||
    q.includes("hôm nay") ||
    q.includes("ngày mai");


  const asksTime =
    q.includes("giờ") ||
    q.includes("mấy giờ") ||
    q.includes("bây giờ");


  if (
    !asksDate &&
    !asksTime
  ) {

    return null;

  }


  let answer =
    `${label} là ` +
    `${target.weekday}, ` +
    `ngày ${pad(target.day)}/` +
    `${pad(target.month)}/` +
    `${target.year}.`;


  if (
    target === current &&
    asksTime
  ) {

    answer +=
      `\n🕐 Bây giờ là ` +
      `${formatVietnamTime(current)}.`;

  }


  return answer;

}


/*
 * =====================================
 * NGÀY ĐẶC BIỆT
 * =====================================
 */

function isSpecialDayQuestion(
  text
) {

  const q =
    text.toLowerCase();


  return (
    q.includes("ngày lễ") ||
    q.includes("ngày đặc biệt") ||
    q.includes("hôm nay có lễ") ||
    q.includes("hôm nay là ngày gì")
  );

}


function buildSpecialDayAnswer(
  current,
  events
) {

  let answer =
    `📅 ${formatVietnamDate(current)}\n\n`;


  if (!events.length) {

    answer +=
      "🎉 Hôm nay không có " +
      "ngày đặc biệt phổ biến " +
      "trong dữ liệu HungAI.";

    return answer;

  }


  answer +=
    formatDayEvents(events);


  return answer;

}


/*
 * =====================================
 * CỘNG / TRỪ NGÀY
 * =====================================
 */

function shiftDate(
  current,
  amount
) {

  /*
   * Dùng UTC để tránh lỗi khi
   * đổi ngày vào thời điểm giao ngày.
   */

  const date =
    new Date(
      Date.UTC(
        current.year,
        current.month - 1,
        current.day
      )
    );


  date.setUTCDate(
    date.getUTCDate() +
    amount
  );


  const year =
    date.getUTCFullYear();

  const month =
    date.getUTCMonth() + 1;

  const day =
    date.getUTCDate();


  const weekday =
    [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy"
    ][
      date.getUTCDay()
    ];


  return {
    year,
    month,
    day,
    weekday
  };

}


function pad(
  number
) {

  return String(
    number
  ).padStart(
    2,
    "0"
  );

}


/*
 * =====================================
 * JSON RESPONSE
 * =====================================
 */

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
