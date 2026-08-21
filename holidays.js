const FIXED_HOLIDAYS = {
  "1/1": {
    name: "Tết Dương lịch",
    type: "official",
    country: "VN"
  },

  "30/4": {
    name: "Ngày Giải phóng miền Nam",
    type: "official",
    country: "VN"
  },

  "1/5": {
    name: "Ngày Quốc tế Lao động",
    type: "official",
    country: "VN"
  },

  "2/9": {
    name: "Quốc khánh Việt Nam",
    type: "official",
    country: "VN"
  },

  "14/2": {
    name: "Valentine",
    type: "popular",
    country: "international"
  },

  "8/3": {
    name: "Ngày Quốc tế Phụ nữ",
    type: "popular",
    country: "international"
  },

  "1/4": {
    name: "Cá tháng Tư",
    type: "popular",
    country: "international"
  },

  "31/10": {
    name: "Halloween",
    type: "popular",
    country: "international"
  },

  "24/12": {
    name: "Đêm Giáng sinh",
    type: "popular",
    country: "international"
  },

  "25/12": {
    name: "Giáng sinh",
    type: "popular",
    country: "international"
  }
};


/*
 * Một số ngày kỷ niệm phổ biến.
 *
 * Những ngày này KHÔNG được gọi là
 * "ngày lễ quốc gia".
 */
const SPECIAL_DAYS = {
  "20/10": {
    name: "Ngày Phụ nữ Việt Nam",
    type: "special",
    country: "VN"
  },

  "27/2": {
    name: "Ngày Thầy thuốc Việt Nam",
    type: "special",
    country: "VN"
  },

  "21/6": {
    name: "Ngày Báo chí Cách mạng Việt Nam",
    type: "special",
    country: "VN"
  },

  "27/7": {
    name: "Ngày Thương binh - Liệt sĩ",
    type: "special",
    country: "VN"
  },

  "19/8": {
    name: "Ngày Cách mạng Tháng Tám",
    type: "special",
    country: "VN"
  },

  "20/11": {
    name: "Ngày Nhà giáo Việt Nam",
    type: "special",
    country: "VN"
  },

  "22/12": {
    name: "Ngày thành lập Quân đội Nhân dân Việt Nam",
    type: "special",
    country: "VN"
  }
};


/*
 * Các ngày quốc tế phổ biến với giới trẻ.
 *
 * Đây là ngày phổ biến/kỷ niệm,
 * KHÔNG đồng nghĩa với ngày nghỉ lễ.
 */
const YOUTH_DAYS = {
  "14/2": "Valentine",
  "8/3": "Ngày Quốc tế Phụ nữ",
  "1/4": "Cá tháng Tư",
  "1/6": "Ngày Quốc tế Thiếu nhi",
  "31/10": "Halloween",
  "25/12": "Giáng sinh"
};


export function getDayEvents(
  day,
  month
) {

  const key =
    `${Number(day)}/${Number(month)}`;

  const events = [];

  if (FIXED_HOLIDAYS[key]) {
    events.push(
      FIXED_HOLIDAYS[key]
    );
  }

  if (SPECIAL_DAYS[key]) {
    events.push(
      SPECIAL_DAYS[key]
    );
  }

  if (YOUTH_DAYS[key]) {

    const alreadyExists =
      events.some(
        event =>
          event.name ===
          YOUTH_DAYS[key]
      );

    if (!alreadyExists) {
      events.push({
        name:
          YOUTH_DAYS[key],

        type:
          "youth",

        country:
          "international"
      });
    }
  }

  return events;
}


export function formatDayEvents(
  events
) {

  if (!events.length) {
    return "Hôm nay không có ngày đặc biệt phổ biến trong dữ liệu.";
  }

  return events
    .map(event => {

      let label;

      switch (event.type) {

        case "official":
          label =
            "🇻🇳 Ngày lễ chính thức";

          break;

        case "special":
          label =
            "📌 Ngày kỷ niệm";

          break;

        case "youth":
          label =
            "📱 Ngày phổ biến với giới trẻ";

          break;

        default:
          label =
            "🌎 Ngày đặc biệt";
      }

      return `${label}: ${event.name}`;

    })
    .join("\n");
}
