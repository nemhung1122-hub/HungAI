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
        version: "6.0",
        model: MODEL
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
              .filter(x =>
                x &&
                (x.role === "user" || x.role === "assistant") &&
                typeof x.content === "string"
              )
              .slice(-12)
          : [];

      if (!message) {
        return json({
          error: "Tin nhắn trống."
        }, cors, 400);
      }

      const current = getVietnamDate();

      /*
       * CACHE
       */

      const cacheKey = normalize(message);
      const cached = memoryCache.get(cacheKey);

      if (
        cached &&
        Date.now() - cached.time < CACHE_TTL
      ) {
        return json({
          reply: cached.reply,
          cached: true
        }, cors);
      }

      /*
       * CALCULATOR
       */

      const math = calculate(message);

      if (math !== null) {
        const reply = `🧮 Kết quả: ${math}`;

        saveCache(cacheKey, reply);

        return json({
          reply,
          source: "calculator"
        }, cors);
      }

      /*
       * MONTH
       */

      const month = parseMonth(message, current);

      if (month) {
        const reply =
          buildMonthAnswer(
            month.month,
            month.year
          );

        saveCache(cacheKey, reply);

        return json({
          reply,
          source: "calendar"
        }, cors);
      }

      /*
       * DATE
       */

      const dateQuery =
        parseDateQuery(
          message,
          current
        );

      if (dateQuery) {
        const reply =
          buildDateAnswer(
            dateQuery,
            current
          );

        saveCache(cacheKey, reply);

        return json({
          reply,
          source: "calendar"
        }, cors);
      }

      /*
       * AI
       */

      const systemPrompt = `
Bạn là HungAI, trợ lý AI riêng của người dùng.

Thời gian hiện tại:
${formatVietnamDate(current)}

Giờ hiện tại:
${formatVietnamTime(current)}

Múi giờ:
Asia/Ho_Chi_Minh

QUY TẮC:

- Trả lời bằng tiếng Việt nếu người dùng nói tiếng Việt.
- Trả lời tự nhiên, rõ ràng, thân thiện.
- Không bịa thông tin.
- Không tự nói rằng bạn đã tra Internet nếu thực tế chưa tra Internet.
- Không tự đoán ngày tháng.
- Không tự đoán thời tiết.
- Không sử dụng Markdown in đậm dạng **...**.
- Nếu cần nhấn mạnh, dùng dấu ngoặc kép "..." thay cho **...**.
- Không sử dụng dấu ** trong câu trả lời.
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
          { messages }
        );

      let reply =
        typeof result?.response === "string"
          ? result.response
          : JSON.stringify(result);

      /*
       * CHỐNG AI LỠ DÙNG **
       */

      reply = removeBoldMarkdown(reply);

      saveCache(cacheKey, reply);

      return json({
        reply,
        source: "workers-ai"
      }, cors);

    } catch (error) {
      console.error(error);

      return json({
        error:
          error?.message ||
          "HungAI gặp lỗi."
      }, cors, 500);
    }
  }
};


/*
 * ================================
 * CALCULATOR
 * ================================
 */

function calculate(text) {

  let expression =
    text
      .trim()
      .toLowerCase()
      .replace(/^tính\s+/i, "")
      .replace(/=\s*$/, "")
      .replace(/bằng bao nhiêu\??$/i, "")
      .trim();

  /*
   * Cho phép:
   * 2+2
   * 2 : 2
   * 10 / 2
   * 5 × 5
   */

  expression =
    expression
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/:/g, "/")
      .replace(/,/g, ".")
      .replace(/\s+/g, "");

  if (!expression) {
    return null;
  }

  if (!/^[0-9+\-*/().%]+$/.test(expression)) {
    return null;
  }

  if (!/[+\-*/%]/.test(expression)) {
    return null;
  }

  try {
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
 * ================================
 * MONTH
 * ================================
 */

function parseMonth(text, current) {

  const q =
    text.toLowerCase().trim();

  if (!q.includes("tháng")) {
    return null;
  }

  const wantsMonth =
    q.includes("có gì") ||
    q.includes("có ngày") ||
    q.includes("ngày lễ") ||
    q.includes("ngày gì") ||
    q.includes("ngày đặc biệt") ||
    q.includes("có lễ gì");

  if (!wantsMonth) {
    return null;
  }

  if (q.includes("tháng này")) {
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

  const yearMatch =
    q.match(/năm\s*(20\d{2})/);

  return {
    month: Number(match[1]),
    year:
      yearMatch
        ? Number(yearMatch[1])
        : current.year
  };
}


function buildMonthAnswer(month, year) {

  const days =
    new Date(
      Date.UTC(
        year,
        month,
        0
      )
    ).getUTCDate();

  const results = [];

  for (
    let day = 1;
    day <= days;
    day++
  ) {

    const events =
      getDayEvents(
        day,
        month,
        year
      );

    if (!events.length) {
      continue;
    }

    const date =
      makeDate(
        year,
        month,
        day
      );

    results.push(
      `${pad(day)}/${pad(month)} - ` +
      `${date.weekday}: ` +
      `${formatDayEvents(events)}`
    );
  }

  let reply =
    `📅 Các ngày đặc biệt trong tháng ${month}/${year}:\n\n`;

  reply +=
    results.length
      ? results.join("\n")
      : "Không có ngày đặc biệt trong dữ liệu HungAI.";

  return reply;
}


/*
 * ================================
 * DATE
 * ================================
 */

function parseDateQuery(text, current) {

  const q =
    text.toLowerCase().trim();

  let date = null;
  let label = "";

  const match =
    q.match(
      /\b(0?[1-9]|[12][0-9]|3[01])\s*[\/\-]\s*(0?[1-9]|1[0-2])(?:\s*[\/\-]\s*(20\d{2}))?\b/
    );

  if (match) {

    const year =
      match[3]
        ? Number(match[3])
        : current.year;

    date =
      makeDate(
        year,
        Number(match[2]),
        Number(match[1])
      );

    label =
      `${pad(Number(match[1]))}/${pad(Number(match[2]))}/${year}`;
  }

  else if (q.includes("hôm qua")) {

    date =
      shiftDate(
        current,
        -1
      );

    label = "Hôm qua";
  }

  else if (
    q.includes("ngày mai") ||
    q === "mai"
  ) {

    date =
      shiftDate(
        current,
        1
      );

    label = "Ngày mai";
  }

  else if (q.includes("hôm nay")) {

    date = current;
    label = "Hôm nay";
  }

  else {
    return null;
  }

  if (!date) {
    return null;
  }

  const wantsDate =
    q.includes("ngày") ||
    q.includes("thứ") ||
    q.includes("lễ") ||
    q.includes("giờ");

  if (!wantsDate) {
    return null;
  }

  return {
    date,
    label,
    askHoliday:
      q.includes("ngày lễ") ||
      q.includes("lễ gì") ||
      q.includes("có lễ gì"),

    askGeneral:
      q.includes("ngày gì") ||
      q.includes("thứ mấy") ||
      q.includes("ngày mấy"),

    askTime:
      q.includes("mấy giờ") ||
      q.includes("bây giờ") ||
      q.includes("giờ hiện tại")
  };
}


function buildDateAnswer(query, current) {

  const date = query.date;

  let reply =
    `📅 ${query.label}: ` +
    `${date.weekday}, ` +
    `${pad(date.day)}/${pad(date.month)}/${date.year}`;

  if (
    query.askTime &&
    date.year === current.year &&
    date.month === current.month &&
    date.day === current.day
  ) {

    reply +=
      `\n🕐 Bây giờ là ${formatVietnamTime(current)}`;
  }

  if (query.askHoliday) {

    const holidays =
      getOfficialHolidays(
        date.day,
        date.month,
        date.year
      );

    reply += "\n\n";

    reply +=
      holidays.length
        ? holidays
            .map(
              x =>
                `🇻🇳 Ngày lễ chính thức: ${x.name}`
            )
            .join("\n")
        : "🇻🇳 Không phải ngày lễ chính thức ở Việt Nam.";
  }

  if (
    query.askGeneral &&
    !query.askHoliday
  ) {

    const events =
      getDayEvents(
        date.day,
        date.month,
        date.year
      );

    reply += "\n\n";

    reply +=
      events.length
        ? formatDayEvents(events)
        : "📌 Không có ngày đặc biệt trong dữ liệu.";
  }

  return reply;
}


/*
 * ================================
 * DATE HELPERS
 * ================================
 */

const WEEKDAYS = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy"
];

function makeDate(year, month, day) {

  const d =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
    weekday:
      WEEKDAYS[d.getUTCDay()]
  };
}


function shiftDate(current, amount) {

  const d =
    new Date(
      Date.UTC(
        current.year,
        current.month - 1,
        current.day
      )
    );

  d.setUTCDate(
    d.getUTCDate() + amount
  );

  return makeDate(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate()
  );
}


function pad(n) {
  return String(n).padStart(2, "0");
}


/*
 * ================================
 * REMOVE **
 * ================================
 */

function removeBoldMarkdown(text) {

  return text
    .replace(/\*\*(.*?)\*\*/g, '"$1"')
    .replace(/\*\*/g, "");
}


/*
 * ================================
 * CACHE
 * ================================
 */

function normalize(text) {

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}


function saveCache(key, reply) {

  memoryCache.set(
    key,
    {
      reply,
      time: Date.now()
    }
  );

  if (memoryCache.size > 200) {

    const first =
      memoryCache.keys().next().value;

    memoryCache.delete(first);
  }
}


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
