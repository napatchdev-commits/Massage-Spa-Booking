import { formatThaiDate, formatTimeSlot } from '@/lib/utils/time';
import { formatCurrency } from '@/lib/utils/formatters';

export function createBookingConfirmationMessage(data: {
  queueNumber: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  bookingDate: string;
  startTime: string;
  price: number;
  salonName?: string;
  salonPhone?: string;
}) {
  return [
    {
      type: 'flex',
      altText: `ยืนยันการจองคิวนวดสปา #${data.queueNumber}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#0f766e',
          paddingAll: '20px',
          contents: [
            {
              type: 'text',
              text: '💆‍♀️ จองคิวนวดสปาสำเร็จแล้ว!',
              weight: 'bold',
              color: '#ffffff',
              size: 'xl'
            },
            {
              type: 'text',
              text: `หมายเลขคิว: ${data.queueNumber}`,
              color: '#ccfbf1',
              size: 'sm',
              marginTop: '5px'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ชื่อลูกค้า:', color: '#666666', size: 'sm', flex: 2 },
                { type: 'text', text: data.customerName, weight: 'bold', color: '#111111', size: 'sm', flex: 3 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'บริการสปา:', color: '#666666', size: 'sm', flex: 2 },
                { type: 'text', text: data.serviceName, weight: 'bold', color: '#0f766e', size: 'sm', flex: 3 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'เทอราพิส:', color: '#666666', size: 'sm', flex: 2 },
                { type: 'text', text: data.staffName, weight: 'bold', color: '#111111', size: 'sm', flex: 3 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'วันที่:', color: '#666666', size: 'sm', flex: 2 },
                { type: 'text', text: formatThaiDate(data.bookingDate), weight: 'bold', color: '#111111', size: 'sm', flex: 3 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'เวลา:', color: '#666666', size: 'sm', flex: 2 },
                { type: 'text', text: formatTimeSlot(data.startTime), weight: 'bold', color: '#111111', size: 'sm', flex: 3 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ราคา:', color: '#666666', size: 'sm', flex: 2 },
                { type: 'text', text: formatCurrency(data.price), weight: 'bold', color: '#059669', size: 'sm', flex: 3 }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: 'ขอบคุณที่ใช้บริการสปาของเราครับ/ค่ะ กรุณามาก่อนเวลานัดหมาย 10 นาทีเพื่อเตรียมพร้อมรับบริการ',
              size: 'xs',
              color: '#888888',
              align: 'center',
              wrap: true
            }
          ]
        }
      }
    }
  ];
}

export function createAdminNewBookingMessage(data: {
  queueNumber: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  staffName: string;
  bookingDate: string;
  startTime: string;
  price: number;
}) {
  return [
    {
      type: 'text',
      text: `🔔 มีการจองคิวนวดสปาใหม่เข้ามา!\n\n📌 คิวที่: ${data.queueNumber}\n👤 ลูกค้า: ${data.customerName} (${data.customerPhone})\n💆‍♀️ บริการ: ${data.serviceName}\n👩‍⚕️ เทอราพิส: ${data.staffName}\n📅 วันที่: ${formatThaiDate(data.bookingDate)}\n⏰ เวลา: ${formatTimeSlot(data.startTime)}\n💰 ราคา: ${formatCurrency(data.price)}`
    }
  ];
}

export function createReminderMessage(data: {
  queueNumber: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  bookingDate: string;
  startTime: string;
  hoursLeft: number;
}) {
  return [
    {
      type: 'text',
      text: `⏰ แจ้งเตือนคิวนวดสปา (เหลืออีก ${data.hoursLeft} ชั่วโมง)\n\nสวัสดีครับ คุณ ${data.customerName}\nคุณมีนัดหมายนวดสปา คิว #${data.queueNumber}\n💆‍♀️ บริการ: ${data.serviceName}\n👩‍⚕️ เทอราพิส: ${data.staffName}\n📅 วันที่: ${formatThaiDate(data.bookingDate)}\n⏰ เวลา: ${formatTimeSlot(data.startTime)}\n\nขอให้มีความสุขกับการผ่อนคลายนะครับ!`
    }
  ];
}
