import { format, parseISO, addMinutes, isAfter, isBefore, subHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const TIMEZONE = 'Asia/Bangkok';

/**
 * Returns current date/time in Asia/Bangkok
 */
export function getBangkokNow(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Formats date into TH locale string (e.g. 14 ส.ค. 2026)
 */
export function formatThaiDate(dateStr: string | Date): string {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const thMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const day = date.getDate();
  const month = thMonths[date.getMonth()];
  const year = date.getFullYear() + 543; // Buddhist Era
  return `${day} ${month} ${year}`;
}

/**
 * Formats time from HH:mm:ss to HH:mm (e.g. 10:30 น.)
 */
export function formatTimeSlot(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  return `${parts[0]}:${parts[1]} น.`;
}

/**
 * Safely parses ANY time string (12-hour AM/PM or 24-hour) into valid 24-hour PostgreSQL TIME format HH:mm:00
 */
export function formatTo24HourTime(timeStr: string, fallbackDefault: string = '07:00:00'): string {
  if (!timeStr) return fallbackDefault;
  const clean = timeStr.trim();
  const isPM = clean.toUpperCase().includes('PM');
  const isAM = clean.toUpperCase().includes('AM');

  const match = clean.match(/(\d{1,2}):(\d{2})/);
  if (!match) return fallbackDefault;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  return `${hStr}:${mStr}:00`;
}

/**
 * Calculates if cancellation is permitted based on minimum notice hours
 */
export function canCancelAppointment(
  bookingDateStr: string,
  startTimeStr: string,
  minHoursNotice: number = 2
): { canCancel: boolean; message?: string } {
  try {
    const apptDateTimeStr = `${bookingDateStr}T${startTimeStr}`;
    const apptDateTime = new Date(apptDateTimeStr);
    const now = getBangkokNow();

    const minCancelTime = subHours(apptDateTime, minHoursNotice);

    if (isAfter(now, minCancelTime)) {
      return {
        canCancel: false,
        message: `ไม่สามารถยกเลิก/เลื่อนนัดได้ล่วงหน้าน้อยกว่า ${minHoursNotice} ชั่วโมง กรุณาติดต่อร้านโดยตรง`
      };
    }

    return { canCancel: true };
  } catch {
    return { canCancel: false, message: 'รูปแบบวันที่ไม่ถูกต้อง' };
  }
}

/**
 * Adds minutes to HH:mm:ss string and returns HH:mm:ss
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;
}
