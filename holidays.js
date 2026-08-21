/*
 * ==========================================
 * HUNGAI - HOLIDAYS & SPECIAL DAYS
 * ==========================================
 *
 * type:
 * official = ngày lễ / ngày nghỉ chính thức
 * special  = ngày kỷ niệm
 * youth    = ngày phổ biến / văn hóa / giới trẻ
 *
 * Lưu ý:
 * Đây là dữ liệu ngày cố định theo ngày/tháng.
 * Không để AI tự đoán ngày.
 */

const OFFICIAL_HOLIDAYS = {
  "1/1": "Tết Dương lịch",
  "30/4": "Ngày Giải phóng miền Nam, thống nhất đất nước",
  "1/5": "Ngày Quốc tế Lao động",
  "2/9": "Quốc khánh Việt Nam"
};

const SPECIAL_DAYS = {
  "3/2": "Ngày thành lập Đảng Cộng sản Việt Nam",
  "27/2": "Ngày Thầy thuốc Việt Nam",

  "8/3": "Ngày Quốc tế Phụ nữ",
  "26/3": "Ngày thành lập Đoàn Thanh niên Cộng sản Hồ Chí Minh",

  "21/4": "Ngày Sách và Văn hóa đọc Việt Nam",

  "7/5": "Ngày Chiến thắng Điện Biên Phủ",
  "19/5": "Ngày sinh Chủ tịch Hồ Chí Minh",

  "1/6": "Ngày Quốc tế Thiếu nhi",
  "21/6": "Ngày Báo chí Cách mạng Việt Nam",

  "27/7": "Ngày Thương binh - Liệt sĩ",

  "19/8": "Ngày Cách mạng Tháng Tám",

  "10/10": "Ngày Giải phóng Thủ đô",
  "20/10": "Ngày Phụ nữ Việt Nam",

  "20/11": "Ngày Nhà giáo Việt Nam",

  "22/12": "Ngày thành lập Quân đội Nhân dân Việt Nam"
};

const YOUTH_DAYS = {
  "14/2": "Valentine - Ngày lễ tình nhân",

  "1/4": "Cá tháng Tư",

  "1/6": "Ngày Quốc tế Thiếu nhi",

  "31/10": "Halloween",

  "24/12": "Đêm Giáng sinh",

  "25/12": "Giáng sinh"
};


/*
 * ==========================================
 * LẤY TẤT CẢ SỰ KIỆN CỦA MỘT NGÀY
 * ==========================================
 */

export function getDayEvents(day, month, year) {
  const key =
    `${Number(day)}/${Number(month)}`;

  const events = [];

  if (OFFICIAL_HOLIDAYS[key]) {
    events.push({
      name: OFFICIAL_HOLIDAYS[key],
      type: "official"
    });
  }

  if (SPECIAL_DAYS[key]) {
    events.push({
      name: SPECIAL_DAYS[key],
      type: "special"
    });
  }

  if (YOUTH_DAYS[key]) {
    events.push({
      name: YOUTH_DAYS[key],
      type: "youth"
    });
  }

  return events;
}


/*
 * ==========================================
 * CHỈ LẤY NGÀY LỄ CHÍNH THỨC
 * ==========================================
 */

export function getOfficialHolidays(day, month, year) {
  const key =
    `${Number(day)}/${Number(month)}`;

  if (!OFFICIAL_HOLIDAYS[key]) {
    return [];
  }

  return [
    {
      name: OFFICIAL_HOLIDAYS[key],
      type: "official"
    }
  ];
}


/*
 * ==========================================
 * FORMAT HIỂN THỊ
 * ==========================================
 */

export function formatDayEvents(events) {

  if (!events || events.length === 0) {
    return "Không có ngày đặc biệt trong dữ liệu.";
  }

  return events
    .map((event) => {

      if (event.type === "official") {
        return `🇻🇳 Ngày lễ chính thức: ${event.name}`;
      }

      if (event.type === "special") {
        return `📌 Ngày kỷ niệm: ${event.name}`;
      }

      if (event.type === "youth") {
        return `📱 Ngày phổ biến: ${event.name}`;
      }

      return `🌎 ${event.name}`;
    })
    .join("\n");
}
const YOUTH_DAYS = {
  "14/2": "Valentine",
  "1/4": "Cá tháng Tư",
  "1/6": "Ngày Quốc tế Thiếu nhi",
  "31/10": "Halloween",
  "24/12": "Đêm Giáng sinh",
  "25/12": "Giáng sinh"
};

export function getDayEvents(day, month, year) {
  const key =
    `${Number(day)}/${Number(month)}`;

  const events = [];

  addEvent(
    events,
    OFFICIAL_HOLIDAYS[key],
    "official"
  );

  addEvent(
    events,
    SPECIAL_DAYS[key],
    "special"
  );

  addEvent(
    events,
    INTERNATIONAL_DAYS[key],
    "international"
  );

  addEvent(
    events,
    YOUTH_DAYS[key],
    "youth"
  );

  return events;
}

export function getOfficialHolidays(
  day,
  month,
  year
) {
  const key =
    `${Number(day)}/${Number(month)}`;

  if (!OFFICIAL_HOLIDAYS[key]) {
    return [];
  }

  return [{
    name: OFFICIAL_HOLIDAYS[key],
    type: "official"
  }];
}

export function formatDayEvents(events) {
  if (
    !events ||
    events.length === 0
  ) {
    return "Không có ngày đặc biệt trong dữ liệu.";
  }

  return events
    .map(event => {

      if (event.type === "official") {
        return `🇻🇳 Ngày lễ chính thức: ${event.name}`;
      }

      if (event.type === "special") {
        return `📌 Ngày kỷ niệm: ${event.name}`;
      }

      if (event.type === "international") {
        return `🌎 Ngày quốc tế: ${event.name}`;
      }

      if (event.type === "youth") {
        return `📱 Ngày phổ biến: ${event.name}`;
      }

      return `📌 ${event.name}`;
    })
    .join("\n");
}

function addEvent(
  events,
  name,
  type
) {
  if (!name) {
    return;
  }

  events.push({
    name,
    type
  });
}
