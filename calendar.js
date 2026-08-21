/*
 * ==========================================
 * HUNGAI - VIETNAM CALENDAR
 * ==========================================
 *
 * Múi giờ cố định:
 * Asia/Ho_Chi_Minh
 *
 * Tất cả ngày và giờ của HungAI
 * đều lấy theo giờ Việt Nam.
 */

const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

const WEEKDAYS = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy"
];


/*
 * ==========================================
 * LẤY NGÀY + GIỜ VIỆT NAM
 * ==========================================
 */

export function getVietnamDate(date = new Date()) {

  const parts =
    new Intl.DateTimeFormat("en-US", {
      timeZone: VIETNAM_TIMEZONE,

      weekday: "short",

      year: "numeric",
      month: "2-digit",
      day: "2-digit",

      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",

      hour12: false
    }).formatToParts(date);


  const get = (type) => {

    const part =
      parts.find(
        (item) => item.type === type
      );

    return part?.value;
  };


  const year =
    Number(get("year"));

  const month =
    Number(get("month"));

  const day =
    Number(get("day"));

  const hour =
    Number(get("hour"));

  const minute =
    Number(get("minute"));

  const second =
    Number(get("second"));


  /*
   * Tính thứ bằng UTC.
   *
   * Không để AI tự đoán.
   */

  const weekdayIndex =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    ).getUTCDay();


  return {
    day,
    month,
    year,

    weekday:
      WEEKDAYS[weekdayIndex],

    hour,
    minute,
    second,

    timezone:
      VIETNAM_TIMEZONE
  };
}


/*
 * ==========================================
 * FORMAT NGÀY
 * ==========================================
 *
 * Ví dụ:
 * Thứ Sáu, ngày 21/08/2026
 */

export function formatVietnamDate(info) {

  return (
    `${info.weekday}, ` +
    `ngày ${String(info.day).padStart(2, "0")}/` +
    `${String(info.month).padStart(2, "0")}/` +
    `${info.year}`
  );
}


/*
 * ==========================================
 * FORMAT GIỜ
 * ==========================================
 *
 * Ví dụ:
 * 13:25:08
 */

export function formatVietnamTime(info) {

  return (
    `${String(info.hour).padStart(2, "0")}:` +
    `${String(info.minute).padStart(2, "0")}:` +
    `${String(info.second).padStart(2, "0")}`
  );
}
