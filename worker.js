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

const CACHE_TTL = 10 * 60 * 1000;

const memoryCache = new Map();

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
        version: "5.0-smart-router",
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
              .slice(-12)
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
       * =================================
       * 1. NGÀY GIỜ
       * =================================
       */

      const current =
        getVietnamDate();


      /*
       * =================================
       * 2. CACHE
       * =================================
       */

      const cacheKey =
        normalizeCacheKey(message);

      const cached =
        memoryCache.get(cacheKey);

      if (
        cached &&
        Date.now() - cached.time <
          CACHE_TTL
      ) {

        return json({
          reply: cached.reply,
          cached: true
        }, cors);

      }


      /*
       * =================================
       * 3. LỊCH / NGÀY LỄ
       * =================================
       */

      const monthQuery =
        parseMonthQuery(
          message,
          current
        );

      if (monthQuery) {

        const reply =
          buildMonthAnswer(
            monthQuery.month,
            monthQuery.year
          );

        saveCache(
          cacheKey,
          reply
        );

        return json({
          reply,
          source: "calendar"
        }, cors);
      }


      const calendarQuery =
        parseCalendarQuery(
          message,
          current
        );

      if (calendarQuery) {

        const reply =
          buildCalendarAnswer(
            calendarQuery,
            current
          );

        saveCache(
          cacheKey,
          reply
        );

        return json({
          reply,
          source: "calendar"
        }, cors);
      }


      /*
       * =================================
       * 4. TOÁN ĐƠN GIẢN
       * =================================
       */

      const math =
        calculateSimpleMath(
          message
        );

      if (math !== null) {

        const reply =
          `🧮 Kết quả: ${math}`;

        saveCache(
          cacheKey,
          reply
        );

        return json({
          reply,
          source: "calculator"
        }, cors);
      }


      /*
       * =================================
       * 5. AI
       * =================================
       *
       * Chỉ tới đây mới gọi Workers AI.
       */

      const systemPrompt = `
Bạn là HungAI, trợ lý AI riêng của người dùng.

THỜI GIAN HIỆN TẠI:
${formatVietnamDate(current)}
${formatVietnamTime(current)}

MÚI GIỜ:
Asia/Ho_Chi_Minh

QUY TẮC:

- Trả lời bằng tiếng Việt nếu người dùng nói tiếng Việt.
- Tự nhiên, rõ ràng và thân thiện.
- Không bịa thông tin.
- Không tự tạo nguồn hoặc nói rằng bạn đã tìm Internet
  nếu thực tế chưa có công cụ tìm kiếm.
- Nếu câu hỏi yêu cầu thông tin mới nhất mà bạn không
  có dữ liệu trực tiếp, hãy nói rõ giới hạn đó.
- Không tự đoán ngày tháng.
- Không tự đoán thời tiết.
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

      saveCache(
        cacheKey,
        reply
      );

      return json({
        reply,
        source: "workers-ai"
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
 * CACHE
 * =====================================
 */

function normalizeCacheKey(
  text
) {

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

}


function saveCache(
  key,
  reply
) {

  memoryCache.set(
    key,
    {
      reply,
      time: Date.now()
    }
  );

  /*
   * Giới hạn cache trong Worker
   * để không giữ quá nhiều dữ liệu.
   */

  if (
    memoryCache.size > 200
  ) {

    const first =
      memoryCache.keys().next().value;

    memoryCache.delete(first);

  }
}


/*
 * =====================================
 * THÁNG
 * =====================================
 */

function parseMonthQuery(
  text,
  current
) {

  const q =
    text.toLowerCase().trim();

  if (
    !q.includes("tháng")
  ) {
    return null;
  }

  const asksMonth =
    q.includes("có ngày") ||
    q.includes("ngày lễ") ||
    q.includes("ngày gì") ||
    q.includes("ngày đặc biệt") ||
    q.includes("có lễ gì");

  if (!asksMonth) {
    return null;
  }

  if (
    q.includes("tháng này")
  ) {

    return {
      month: current.month,
      year: current.year
    };

  }

  const match =
    q.match(
      /tháng\s*(0?[1-9]|1[0-2])/
    );

  if (!match) {
    return null;
  }

  const month =
    Number(match[1]);

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


function buildMonthAnswer(
  month,
  year
) {

  const lines = [];

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

  if (
    lines.length === 0
  ) {

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
 * NGÀY CỤ THỂ
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
    q === "mai"
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

  }

  else {

    return null;
  }

  const asksCalendar =
    q.includes("ngày") ||
    q.includes("thứ") ||
    q.includes("lễ") ||
    q.includes("giờ");

  if (!asksCalendar) {
    return null;
  }

  return {
    date: target,
    label,
    isToday,
    askHoliday:
      q.includes("ngày lễ") ||
      q.includes("lễ gì") ||
      q.includes("có lễ gì"),
    askSpecial:
      q.includes("ngày đặc biệt"),
    askTime:
      q.includes("mấy giờ") ||
      q.includes("bây giờ") ||
      q.includes("giờ hiện tại"),
    askGeneralDay:
      q.includes("ngày gì") ||
      q.includes("thứ mấy") ||
      q.includes("ngày mấy")
  };
}


function buildCalendarAnswer(
  query,
  current
) {

  const target =
    query.date;

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
    `📅 ${query.label}: ` +
    `${target.weekday}, ` +
    `${pad(target.day)}/` +
    `${pad(target.month)}/` +
    `${target.year}`;

  if (
    query.askTime &&
    query.isToday
  ) {

    reply +=
      `\n🕐 Bây giờ là ` +
      `${formatVietnamTime(current)}`;

  }

  if (
    query.askHoliday
  ) {

    reply += "\n\n";

    if (
      official.length > 0
    ) {

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

  if (
    query.askSpecial
  ) {

    const special =
      events.filter(
        event =>
          event.type !== "official"
      );

    reply += "\n\n";

    reply +=
      special.length
        ? formatDayEvents(special)
        : "📱 Không có ngày đặc biệt phổ biến " +
          "trong dữ liệu.";

  }

  if (
    query.askGeneralDay &&
    !query.askHoliday &&
    !query.askSpecial
  ) {

    reply += "\n\n";

    reply +=
      events.length
        ? formatDayEvents(events)
        : "📌 Không có ngày đặc biệt " +
          "trong dữ liệu.";

  }

  return reply;
}


/*
 * =====================================
 * MÁY TÍNH ĐƠN GIẢN
 * =====================================
 */

function calculateSimpleMath(
  text
) {

  let expression =
    text
      .toLowerCase()
      .trim()
      .replace(
        /^tính\s+/,
        ""
      )
      .replace(
        /^bằng bao nhiêu\??$/,
        ""
      )
      .replace(
        /=/g,
        ""
      )
      .trim();

  if (
    !/^[0-9+\-*/().%\s]+$/
      .test(expression)
  ) {
    return null;
  }

  if (
    !/[+\-*/%]/
      .test(expression)
  ) {
    return null;
  }

  try {

    /*
     * Chỉ cho phép ký tự toán học
     * đã kiểm tra ở trên.
     */

    const result =
      Function(
        `"use strict"; return (${expression})`
      )();

    if (
      typeof result !== "number" ||
      !Number.isFinite(result)
    ) {
      return null;
    }

    return result;

  } catch {

    return null;

  }
}


/*
 * =====================================
 * NGÀY
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
