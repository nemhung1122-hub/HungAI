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
       * Xác định những câu hỏi có khả năng cần
       * thông tin mới từ Internet.
       */
      const needsWeb = shouldSearchWeb(message);

      let webContext = "";

      if (needsWeb) {
        webContext = await webSearch(message);
      }

      const systemPrompt = `
Bạn là HungAI, trợ lý AI riêng của người dùng.

Tính cách:
- Thân thiện.
- Tự nhiên.
- Thông minh.
- Trả lời bằng tiếng Việt nếu người dùng nói tiếng Việt.
- Trả lời trực tiếp, không vòng vo.

QUY TẮC:
1. Dùng lịch sử hội thoại để hiểu ngữ cảnh.
2. Không được bịa thông tin.
3. Nếu có dữ liệu tìm kiếm Internet được cung cấp bên dưới,
   hãy ưu tiên sử dụng dữ liệu đó cho thông tin mới.
4. Nếu dữ liệu Internet không đủ hoặc không tìm được,
   hãy nói rõ rằng chưa xác minh được thay vì bịa.
5. Không nói rằng bạn đã tìm Internet nếu không có dữ liệu tìm kiếm.

DỮ LIỆU INTERNET:
${webContext || "Không có dữ liệu Internet cho câu hỏi này."}
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

      const result = await env.AI.run(
        "@cf/zai-org/glm-4.7-flash",
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
        reply,
        webUsed: needsWeb && Boolean(webContext)
      }, cors);

    } catch (error) {
      console.error("HungAI error:", error);

      return json({
        error:
          error?.message ||
          "HungAI gặp lỗi."
      }, cors, 500);
    }
  }
};


/*
 * Quyết định câu hỏi có khả năng cần
 * thông tin mới hay không.
 */
function shouldSearchWeb(text) {
  const q = text.toLowerCase();

  const keywords = [
    "hôm nay",
    "bây giờ",
    "hiện tại",
    "mới nhất",
    "mới đây",
    "tin mới",
    "tin tức",
    "thời tiết",
    "nhiệt độ",
    "giá",
    "tỷ giá",
    "bitcoin",
    "btc",
    "cổ phiếu",
    "kết quả",
    "trận đấu",
    "lịch thi đấu",
    "ai mới",
    "iphone mới",
    "sản phẩm mới",
    "đang diễn ra",
    "vừa xảy ra",
    "năm nay",
    "2026"
  ];

  return keywords.some(
    keyword => q.includes(keyword)
  );
}


/*
 * Tìm kiếm web không cần API key.
 *
 * Đây là lớp thử nghiệm đầu tiên:
 * nếu nguồn tìm kiếm không phản hồi,
 * HungAI vẫn hoạt động bình thường.
 */
async function webSearch(query) {
  try {
    const url =
      "https://html.duckduckgo.com/html/?q=" +
      encodeURIComponent(query);

    const response =
      await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; HungAI/1.0)"
        }
      });

    if (!response.ok) {
      return "";
    }

    const html =
      await response.text();

    const results =
      parseDuckDuckGo(html);

    if (!results.length) {
      return "";
    }

    return results
      .slice(0, 5)
      .map(
        (item, index) =>
          `[${index + 1}] ${item.title}\n` +
          `${item.snippet}\n` +
          `Nguồn: ${item.url}`
      )
      .join("\n\n");

  } catch (error) {
    console.error(
      "Web search error:",
      error
    );

    return "";
  }
}


/*
 * Lấy tiêu đề, URL và đoạn mô tả
 * từ kết quả DuckDuckGo HTML.
 */
function parseDuckDuckGo(html) {
  const results = [];

  const blocks =
    html.split(
      'class="result results_links'
    );

  for (const block of blocks.slice(1)) {
    const linkMatch =
      block.match(
        /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/
      );

    if (!linkMatch) {
      continue;
    }

    const url =
      decodeHtml(linkMatch[1]);

    const title =
      cleanHtml(linkMatch[2]);

    const snippetMatch =
      block.match(
        /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/
      ) ||
      block.match(
        /class="result__snippet"[^>]*>([\s\S]*?)<\/div>/
      );

    const snippet =
      snippetMatch
        ? cleanHtml(snippetMatch[1])
        : "";

    if (title && url) {
      results.push({
        title,
        url,
        snippet
      });
    }
  }

  return results;
}


function cleanHtml(value) {
  return decodeHtml(
    value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}


function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
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
