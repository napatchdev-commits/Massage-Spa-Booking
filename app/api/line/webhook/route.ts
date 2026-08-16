import { NextRequest, NextResponse } from 'next/server';
import { validateSignature, lineClient } from '@/lib/line/bot';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatCurrency } from '@/lib/utils/formatters';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-line-signature') || '';

    // Validate LINE signature if secret exists
    if (process.env.LINE_CHANNEL_SECRET && !validateSignature(rawBody, signature)) {
      console.warn('LINE signature verification failed');
    }

    const payload = JSON.parse(rawBody);
    const events = payload.events || [];

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim().toLowerCase();
        const replyToken = event.replyToken;
        const userId = event.source?.userId || '';
        const liffUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/liff` : 'https://liff.line.me/' + process.env.NEXT_PUBLIC_LIFF_ID;

        if (text === 'myid' || text === 'id' || text === 'user id' || text.includes('myid') || text.includes('แอดมิน') || text.includes('ไอดี')) {
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: 'text',
                text: `🆔 LINE User ID ของคุณคือ:\n${userId}\n\nนำ ID นี้ไปใส่ในระบบแอดมิน (ตั้งค่าร้าน ➔ LINE Admin User ID) เพื่อรับการแจ้งเตือนอัตโนมัติเมื่อมีลูกค้ากดจองคิวสปาเข้ามาได้ทันทีครับ!`
              }
            ]
          });
        } else if (text.includes('จองคิว') || text.includes('จอง')) {
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: 'text',
                text: `💆‍♀️ จองคิวนวดสปาออนไลน์ได้ง่ายๆ ผ่านลิงก์ด้านล่างนี้ได้เลยครับ:\n\n👉 ${liffUrl}`
              }
            ]
          });
        } else if (text.includes('คิวของฉัน') || text.includes('เช็คคิว')) {
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: 'text',
                text: `🗓 ตรวจสอบคิวนวดสปาของฉันและจัดการการจอง:\n\n👉 ${liffUrl}/my-queue`
              }
            ]
          });
        } else if (text.includes('บริการ') || text.includes('เมนู')) {
          const { data: services } = await supabaseAdmin
            .from('services')
            .select('*')
            .eq('status', true);

          if (!services || services.length === 0) {
            await lineClient.replyMessage({
              replyToken,
              messages: [{ type: 'text', text: 'ยังไม่มีข้อมูลบริการนวดสปาในขณะนี้' }]
            });
          } else {
            const listText = services
              .map((s) => `• ${s.name}: ${formatCurrency(s.price)} (${s.duration_minutes} นาที)`)
              .join('\n');
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: `💆‍♀️ รายการบริการนวดสปาของทางร้าน:\n\n${listText}\n\nกดจองคิวได้เลยที่: ${liffUrl}`
                }
              ]
            });
          }
        } else if (text.includes('เทอราพิส') || text.includes('หมอนวด') || text.includes('ช่าง')) {
          const { data: staffList } = await supabaseAdmin
            .from('staff')
            .select('*')
            .eq('status', true);

          if (!staffList || staffList.length === 0) {
            await lineClient.replyMessage({
              replyToken,
              messages: [{ type: 'text', text: 'ยังไม่มีข้อมูลเทอราพิสในขณะนี้' }]
            });
          } else {
            const staffText = staffList
              .map((st) => `• คุณ${st.name} ${st.nickname ? `(${st.nickname})` : ''}`)
              .join('\n');
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: `👩‍⚕️ ทีมเทอราพิสประจำร้าน:\n\n${staffText}\n\nเลือกเทอราพิสและจองคิว: ${liffUrl}`
                }
              ]
            });
          }
        } else if (text.includes('ติดต่อร้าน') || text.includes('ที่อยู่') || text.includes('เบอร์')) {
          const { data: setting } = await supabaseAdmin
            .from('settings')
            .select('*')
            .maybeSingle();

          const name = setting?.salon_name || 'Spa & Massage';
          const phone = setting?.phone || '-';
          const address = setting?.address || '-';
          const maps = setting?.google_maps_url ? `\n🗺 Google Maps: ${setting.google_maps_url}` : '';

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: 'text',
                text: `📍 ข้อมูลการติดต่อร้าน ${name}\n\n📞 เบอร์โทรศัพท์: ${phone}\n🏢 ที่อยู่: ${address}${maps}`
              }
            ]
          });
        } else if (text.includes('โปรโมชั่น') || text.includes('ส่วนลด') || text.includes('สิทธิประโยชน์')) {
          const { data: services } = await supabaseAdmin
            .from('services')
            .select('*')
            .eq('status', true)
            .limit(3);

          const serviceSummary = services && services.length > 0 
            ? services.map(s => `• ${s.name} เพียง ${formatCurrency(s.price)}`).join('\n')
            : '• แพ็กเกจนวดสปาผ่อนคลายราคาพิเศษประจำเดือน';

          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: 'text',
                text: `🎁 สิทธิประโยชน์และโปรโมชั่นพิเศษประจำเดือน!\n\n${serviceSummary}\n\nกดจองคิวนวดสปาเพื่อรับสิทธิ์ส่วนลดได้ทันทีที่:\n👉 ${liffUrl}`
              }
            ]
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('LINE Webhook Error:', error);
    return NextResponse.json({ error: error.message || 'Webhook internal error' }, { status: 500 });
  }
}
