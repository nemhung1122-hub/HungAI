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
        version: "2.1",
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

      const body = await request.json();

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
          { error: "Tin nhắn trống." },
          cors,
          400
        );
      }

      /*
       * =================================
       * THỜI GIAN THẬT
       * =================================
       */

      const current = getVietnamDate();

      /*
       * =================================
       * ƯU TIÊN KIỂM TRA NGÀY LỄ
       *
       * Phải chạy TRƯỚC kiểm tra
       * "hôm nay là ngày gì".
       * =================================
       */

      const holidayQuestion =
        isHolidayQuestion(message);

      if (holidayQuestion) {

        const target =
          getTargetDate(
            message,
            current
          );

        const official =
          getOfficialHolidays(
            target.day,
            target.month
          );

        const allEvents =
          getDayEvents(
            target.day,
            target.month
          );

        const label =
          getDateLabel(
            message
          );

        let reply =
          `📅 ${label}: ` +
          `${target.weekday}, ` +
          `${pad(target.day)}/` +
          `${pad(target.month)}/` +
          `${target.year}\n\n`;

        if (official.length > 0) {

          reply +=
            official
              .map(
                event =>
                  `🇻🇳 Ngày lễ chính thức: ${event.name}`
              )
              .join("\n");

        } else {

          reply +=
            "🇻🇳 Không phải ngày lễ chính thức " +
            "ở Việt Nam.";

        }

        /*
         * Nếu người dùng hỏi "ngày gì"
         * hoặc "ngày đặc biệt gì",
         * cho thêm các ngày kỷ niệm/
         * ngày phổ biến.
         */

        if (
          message.toLowerCase().includes(
            "ngày đặc biệt"
          ) ||
          message.toLowerCase().includes(
            "ngày gì"
          )
        ) {

          const nonOfficial =
            allEvents.filter(
              event =>
                event.type !== "official"
            );

          if (nonOfficial.length > 0) {

            reply +=
              "\n\n" +
              formatDayEvents(
                nonOfficial
              );

          }

        }

        return json({
          reply,
          calendar: target,
          events: allEvents
        }, cors);
      }

      /*
       * =================================
       * CÂU HỎI NGÀY / GIỜ
       * =================================
       */

      const calendarQuestion =
        isCalendarQuestion(message);

      if (calendarQuestion) {

        const target =
          getTargetDate(
            message,
            current
          );

        let reply =
          `📅 ${getDateLabel(message)} ` +
          `là ${target.weekday}, ` +
          `ngày ${pad(target.day)}/` +
          `${pad(target.month)}/` +
          `${target.year}.`;

        if (
          isTimeQuestion(message) &&
          isTodayQuestion(message)
        ) {

          reply +=
            `\n🕐 Bây giờ là ` +
            `${formatVietnamTime(current)}.`;

        }

        return json({
          reply,
          calendar: target
        }, cors);
      }

      /*
       * =================================
       * AI
       * =================================
       */

      const systemPrompt = `
Bạn là HungAI, trợ lý AI riêng của người dùng.

Ngày hiện tại:
${formatVietnamDate(current)}

Giờ hiện tại:
${formatVietnamTime(current)}

Múi giờ:
Việt Nam (UTC+7)

QUY TẮC:

- Trả lời bằng tiếng Việt nếu người dùng nói tiếng Việt.
- Không tự đoán ngày tháng.
- Không tự tính thứ.
- Không bịa thông tin.
- Nếu không biết thì nói rõ là không biết.
- Không gọi ngày Internet là ngày lễ quốc gia.
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
          MODEL,
          {
            messages
          }
        );

      let reply = result?.response;

      if (typeof reply !== "string") {
        reply = JSON.stringify(
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
 * =================================
 * KIỂM TRA CÂU HỎI NGÀY LỄ
 * =================================
 */

function isHolidayQuestion(text) {

  const q =
    text.toLowerCase();

  return (
    q.includes("ngày lễ") ||
    q.includes("lễ gì") ||
    q.includes("có lễ gì") ||
    q.includes("ngày đặc biệt")
  );
}


/*
 * =================================
 * KIỂM TRA CÂU HỎI NGÀY
 * =================================
 */

function isCalendarQuestion(text) {

  const q =
    text.toLowerCase();

  return (
    q.includes("hôm nay") ||
    q.includes("hôm qua") ||
    q.includes("ngày mai") ||
    q.includes("thứ mấy") ||
    q.includes("ngày mấy") ||
    q.includes("ngày bao nhiêu") ||
    q.includes("ngày tháng năm") ||
    q.includes("bây giờ") ||
    q.includes("mấy giờ") ||
    q.includes("giờ hiện tại")
  );
}


/*
 * =================================
 * XÁC ĐỊNH NGÀY CẦN HỎI
 * =================================
 */

function getTargetDate(
  text,
  current
) {

  const q =
    text.toLowerCase();

  if (
    q.includes("hôm qua")
  ) {

    return shiftDate(
      current,
      -1
    );

  }

  if (
    q.includes("ngày mai") ||
    q === "mai" ||
    q.includes("mai là")
  ) {

    return shiftDate(
      current,
      1
    );

  }

  return current;
}


/*
 * =================================
 * TÊN NGÀY
 * =================================
 */

function getDateLabel(text) {

  const q =
    text.toLowerCase();

  if (q.includes("hôm qua")) {
    return "Hôm qua";
  }

  if (
    q.includes("ngày mai") ||
    q === "mai" ||
    q.includes("mai là")
  ) {
    return "Ngày mai";
  }

  return "Hôm nay";
}


/*
 * =================================
 * CÓ PHẢI CÂU HỎI GIỜ?
 * =================================
 */

function isTimeQuestion(text) {

  const q =
    text.toLowerCase();

  return (
    q.includes("mấy giờ") ||
    q.includes("bây giờ") ||
    q.includes("giờ hiện tại") ||
    q.includes("thời gian hiện tại")
  );
}


function isTodayQuestion(text) {

  const q =
    text.toLowerCase();

  return (
    q.includes("hôm nay") ||
    (
      !q.includes("hôm qua") &&
      !q.includes("ngày mai")
    )
  );
}


/*
 * =================================
 * CỘNG / TRỪ NGÀY
 * =================================
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

  const year =
    date.getUTCFullYear();

  const month =
    date.getUTCMonth() + 1;

  const day =
    date.getUTCDate();

  const weekdays = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy"
  ];

  return {
    year,
    month,
    day,
    weekday:
      weekdays[
        date.getUTCDay()
      ]
  };
}


function pad(number) {
  return String(number)
    .padStart(2, "0");
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
