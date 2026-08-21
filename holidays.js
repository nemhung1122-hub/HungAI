const OFFICIAL_HOLIDAYS = {
  "1/1": "Tết Dương lịch",
  "30/4": "Ngày Giải phóng miền Nam",
  "1/5": "Ngày Quốc tế Lao động",
  "2/9": "Quốc khánh Việt Nam"
};

const SPECIAL_DAYS = {
  "27/2": "Ngày Thầy thuốc Việt Nam",
  "8/3": "Ngày Quốc tế Phụ nữ",
  "21/6": "Ngày Báo chí Cách mạng Việt Nam",
  "27/7": "Ngày Thương binh - Liệt sĩ",
  "19/8": "Ngày Cách mạng Tháng Tám",
  "20/10": "Ngày Phụ nữ Việt Nam",
  "20/11": "Ngày Nhà giáo Việt Nam",
  "22/12": "Ngày thành lập Quân đội Nhân dân Việt Nam"
};

const YOUTH_DAYS = {
  "14/2": "Valentine",
  "1/4": "Cá tháng Tư",
  "1/6": "Ngày Quốc tế Thiếu nhi",
  "31/10": "Halloween",
  "24/12": "Đêm Giáng sinh",
  "25/12": "Giáng sinh"
};

export function getDayEvents(day, month) {
  const key = `${Number(day)}/${Number(month)}`;

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

export function getOfficialHolidays(day, month) {
  const key = `${Number(day)}/${Number(month)}`;

  if (!OFFICIAL_HOLIDAYS[key]) {
    return [];
  }

  return [{
    name: OFFICIAL_HOLIDAYS[key],
    type: "official"
  }];
}

export function formatDayEvents(events) {
  if (!events || events.length === 0) {
    return "Không có ngày đặc biệt trong dữ liệu.";
  }

  return events.map(event => {
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
  }).join("\n");
}
