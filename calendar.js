const WEEKDAYS = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy"
];

const TIME_ZONE = "Asia/Ho_Chi_Minh";

export function getVietnamDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const get = (type) => {
    const part = parts.find(
      (item) => item.type === type
    );

    return part ? part.value : "";
  };

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const second = Number(get("second"));

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
    weekday: WEEKDAYS[weekdayIndex],
    hour,
    minute,
    second,
    timezone: TIME_ZONE
  };
}

export function formatVietnamDate(info) {
  return (
    `${info.weekday}, ` +
    `ngày ${pad(info.day)}/` +
    `${pad(info.month)}/` +
    `${info.year}`
  );
}

export function formatVietnamTime(info) {
  return (
    `${pad(info.hour)}:` +
    `${pad(info.minute)}:` +
    `${pad(info.second)}`
  );
}

function pad(number) {
  return String(number).padStart(2, "0");
}
