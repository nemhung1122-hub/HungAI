const WEEKDAYS = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy"
];

export function getVietnamDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const get = (type) =>
    parts.find((p) => p.type === type)?.value;

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  /*
   * Tính thứ bằng UTC.
   * Không để AI tự đoán.
   */
  const weekdayIndex = new Date(
    Date.UTC(year, month - 1, day)
  ).getUTCDay();

  return {
    day,
    month,
    year,
    weekday: WEEKDAYS[weekdayIndex],
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    timezone: "Asia/Ho_Chi_Minh"
  };
}

export function formatVietnamDate(info) {
  return (
    `${info.weekday}, ` +
    `ngày ${String(info.day).padStart(2, "0")}/` +
    `${String(info.month).padStart(2, "0")}/` +
    `${info.year}`
  );
}

export function formatVietnamTime(info) {
  return (
    `${String(info.hour).padStart(2, "0")}:` +
    `${String(info.minute).padStart(2, "0")}:` +
    `${String(info.second).padStart(2, "0")}`
  );
}
