import {
  getVietnamDate,
  formatVietnamDate,
  formatVietnamTime
} from "./calendar.js";

import {
  getDayEvents,
  getOfficialHolidays,
  formatDayEvents
} from "./holidays.js";

const MODEL = "@cf/zai-org/glm-4.7-flash";

const WEEKDAYS = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy"
];

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
      return json({
        status: "online",
        name: "HungAI",
        version: "4.0",
        model: MODEL
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
              .filter(item =>
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
       * ================================
       * THỜI GIAN HIỆN TẠI
       * ================================
       */

      const current =
        getVietnamDate();


      /*
       * ================================
       * KIỂM TRA CÂU HỎI THEO THÁNG
       * PHẢI CHẠY TRƯỚC CÂU HỎI NGÀY
       * ================================
       */

      const monthQuery =
        parseMonthQuery(
          message,
          current
        );

      if (monthQuery) {

        const result =
          buildMonthAnswer(
            monthQuery.month,
            monthQuery.year
          );

        return json({
          reply: result,
          month:
            monthQuery.month,
          year:
            monthQuery.year
        }, cors);
      }


      /*
       * ================================
       * CÂU HỎI NGÀY
       * ================================
       */

      const calendarQuery =
        parseCalendarQuery(
          message,
          current
        );

      if (calendarQuery) {

        const target =
          calendarQuery.date;

        const events =
          getDayEvents(
            target.day,
            target.month
          );

        const official =
          getOfficialHolidays(
            target.day,
            target.month
          );

        let reply =
          `📅 ${calendarQuery.label}: ` +
          `${target.weekday}, ` +
          `${pad(target.day)}/` +
          `${pad(target.month)}/` +
          `${target.year}`;


        /*
         * ==========================
         * GIỜ
         * ==========================
         */

        if (
          calendarQuery.askTime &&
          calendarQuery.isToday
        ) {

          reply +=
            `\n🕐 Bây giờ là ` +
            `${formatVietnamTime(current)}`;

        }


        /*
         * ==========================
         * NGÀY LỄ
         * ==========================
         */

        if (
          calendarQuery.askHoliday
        ) {

          reply += "\n\n";

          if (official.length > 0) {

            reply +=
              official.map(
                event =>
                  `🇻🇳 Ngày lễ chính thức: ${event.name}`
              ).join("\n");

          } else {

            reply +=
              "🇻🇳 Không phải ngày lễ chính thức " +
              "ở Việt Nam.";

          }
        }


        /*
         * ==========================
         * NGÀY ĐẶC BIỆT
         * ==========================
         */

        if (
          calendarQuery.askSpecial
        ) {

          const special =
            events.filter(
              event =>
                event.type !== "official"
            );

          reply += "\n\n";

          if (special.length > 0) {

            reply +=
              formatDayEvents(
                special
              );

          } else {

            reply +=
              "📱 Không có ngày đặc biệt " +
              "phổ biến trong dữ liệu.";

          }
        }


        /*
         * ==========================
         * HỎI "NGÀY GÌ"
         * ==========================
         */

        if (
          calendarQuery.askGeneralDay &&
          !calendarQuery.askHoliday &&
          !calendarQuery.askSpecial
        ) {

          reply += "\n\n";

          if (events.length > 0) {

            reply +=
              formatDayEvents(events);

          } else {

            reply +=
              "📌 Không có ngày đặc biệt " +
              "trong dữ liệu.";

          }
        }


        return json({
          reply,
          calendar: target,
          events
        }, cors);
      }


      /*
       * ================================
       * AI
       * ================================
       */

      const systemPrompt = `
Bạn là HungAI, trợ lý AI riêng của người dùng.

Thời gian hiện tại:

${formatVietnamDate(current)}
${formatVietnamTime(current)}

Múi giờ:
Asia/Ho_Chi_Minh

QUY TẮC:

- Trả lời bằng tiếng Việt nếu người dùng dùng tiếng Việt.
- Trả lời tự nhiên và thân thiện.
- Không bịa thông tin.
- Không tự đoán ngày tháng.
- Không tự tính thứ.
- Nếu không biết thì nói rõ.
- Không gọi ngày phổ biến trên Internet là
  ngày lễ quốc gia.
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

      return json({
        reply
      }, cors);

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
 * HỎI THEO THÁNG
 * =====================================
 */

function parseMonthQuery(
  text,
  current
) {

  const q =
    text.toLowerCase().trim();


  /*
   * Phải có chữ "tháng"
   */

  if (!q.includes("tháng")) {
    return null;
  }


  /*
   * Không phải câu hỏi tháng
   * nếu chỉ đang hỏi một ngày cụ thể.
   */

  const asksMonth =
    q.includes("có ngày") ||
    q.includes("ngày lễ") ||
    q.includes("ngày gì") ||
    q.includes("ngày đặc biệt") ||
    q.includes("có lễ gì");


  if (!asksMonth) {
    return null;
  }


  /*
   * "tháng này"
   */

  if (
    q.includes("tháng này")
  ) {

    return {
      month:
        current.month,
      year:
        current.year
    };

  }


  /*
   * "tháng 8"
   * "tháng 08"
   */

  const match =
    q.match(
      /tháng\s*(0?[1-9]|1[0-2])/
    );


  if (!match) {
    return null;
  }


  const month =
    Number(match[1]);


  /*
   * Tìm năm nếu có:
   *
   * tháng 8 năm 2027
   */

  const yearMatch =
    q.match(
      /năm\s*(20\d{2})/
    );


  const year =
    yearMatch
      ? Number(yearMatch[1])
      : current.year;


  return {
    month,
    year
  };
}


/*
 * =====================================
 * TẠO DANH SÁCH NGÀY TRONG THÁNG
 * =====================================
 */

function buildMonthAnswer(
  month,
  year
) {

  const lines = [];


  /*
   * Có tối đa 31 ngày.
   */

  const daysInMonth =
    new Date(
      Date.UTC(
        year,
        month,
        0
      )
    ).getUTCDate();


  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {

    const events =
      getDayEvents(
        day,
        month
      );


    if (
      events.length === 0
    ) {
      continue;
    }


    const date =
      makeDate(
        year,
        month,
        day
      );


    lines.push(
      `${pad(day)}/${pad(month)} - ` +
      `${date.weekday}: ` +
      `${formatDayEvents(events)}`
    );

  }


  let answer =
    `📅 Các ngày đặc biệt trong ` +
    `tháng ${month}/${year}:\n\n`;


  if (lines.length === 0) {

    answer +=
      "Không có ngày đặc biệt " +
      "trong dữ liệu HungAI.";

  } else {

    answer +=
      lines.join("\n");

  }


  return answer;
}


/*
 * =====================================
 * PHÂN TÍCH CÂU HỎI NGÀY
 * =====================================
 */

function parseCalendarQuery(
  text,
  current
) {

  const q =
    text.toLowerCase().trim();


  const numericDate =
    q.match(
      /\b(0?[1-9]|[12][0-9]|3[01])\s*[\/\-]\s*(0?[1-9]|1[0-2])\b/
    );


  let target = null;
  let label = "Hôm nay";
  let isToday = true;


  if (numericDate) {

    const day =
      Number(numericDate[1]);

    const month =
      Number(numericDate[2]);

    target =
      makeDate(
        current.year,
        month,
        day
      );

    if (!target) {
      return null;
    }

    label =
      `${pad(day)}/${pad(month)}`;

    isToday =
      day === current.day &&
      month === current.month;

  }

  else if (
    q.includes("hôm qua")
  ) {

    target =
      shiftDate(
        current,
        -1
      );

    label =
      "Hôm qua";

    isToday = false;

  }

  else if (
    q.includes("ngày mai") ||
    q === "mai" ||
    q.includes("mai là")
  ) {

    target =
      shiftDate(
        current,
        1
      );

    label =
      "Ngày mai";

    isToday = false;

  }

  else if (
    q.includes("hôm nay")
  ) {

    target =
      current;

    label =
      "Hôm nay";

    isToday = true;

  }

  else {

    return null;

  }


  const askHoliday =
    q.includes("ngày lễ") ||
    q.includes("lễ gì") ||
    q.includes("có lễ gì");


  const askSpecial =
    q.includes("ngày đặc biệt");


  const askTime =
    q.includes("mấy giờ") ||
    q.includes("bây giờ") ||
    q.includes("giờ hiện tại");


  const askGeneralDay =
    q.includes("ngày gì") ||
    q.includes("thứ mấy") ||
    q.includes("ngày mấy") ||
    q.includes("ngày bao nhiêu");


  return {
    date: target,
    label,
    isToday,
    askHoliday,
    askSpecial,
    askTime,
    askGeneralDay
  };
}


/*
 * =====================================
 * TẠO NGÀY
 * =====================================
 */

function makeDate(
  year,
  month,
  day
) {

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );


  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {

    return null;

  }


  return {
    year,
    month,
    day,
    weekday:
      WEEKDAYS[
        date.getUTCDay()
      ]
  };
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

  const date =
    new Date(
      Date.UTC(
        current.year,
        current.month - 1,
        current.day
      )
    );


  date.setUTCDate(
    date.getUTCDate() + amount
  );


  return makeDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
}


/*
 * =====================================
 * FORMAT
 * =====================================
 */

function pad(number) {

  return String(number)
    .padStart(2, "0");

}


/*
 * =====================================
 * JSON
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
