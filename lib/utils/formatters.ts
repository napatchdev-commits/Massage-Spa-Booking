/**
 * Currency formatter for Thai Baht
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format phone number (e.g. 0812345678 -> 081-234-5678)
 */
export function formatPhone(phone: string): string {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Status mapping for Thai text and CSS color classes
 */
export interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export function getStatusConfig(status: string): StatusConfig {
  switch (status?.toLowerCase()) {
    case 'pending':
      return {
        label: 'รอรอยืนยัน',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        dotClass: 'bg-amber-500'
      };
    case 'confirmed':
      return {
        label: 'ยืนยันแล้ว',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dotClass: 'bg-emerald-500'
      };
    case 'completed':
      return {
        label: 'เสร็จสิ้น',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        dotClass: 'bg-blue-500'
      };
    case 'cancelled':
      return {
        label: 'ยกเลิกแล้ว',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
        dotClass: 'bg-rose-500'
      };
    case 'no_show':
      return {
        label: 'ไม่มาตามนัด',
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-300',
        dotClass: 'bg-gray-500'
      };
    default:
      return {
        label: status || 'ไม่ทราบสถานะ',
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-300',
        dotClass: 'bg-gray-400'
      };
  }
}
