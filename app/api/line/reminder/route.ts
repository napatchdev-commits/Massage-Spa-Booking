import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { lineClient } from '@/lib/line/bot';
import { createReminderMessage } from '@/lib/line/templates';
import { getBangkokNow } from '@/lib/utils/time';
import { addHours, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
      }
    }

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('reminder_24h_active, reminder_1h_active')
      .maybeSingle();

    const now = getBangkokNow();
    const sentCount = { h24: 0, h1: 0 };

    if (settings?.reminder_24h_active !== false) {
      const target24h = addHours(now, 24);
      const targetDateStr = format(target24h, 'yyyy-MM-dd');

      const { data: appts24h } = await supabaseAdmin
        .from('appointments')
        .select('*, customers(line_user_id, name), staff(name, nickname), services(name)')
        .eq('booking_date', targetDateStr)
        .eq('status', 'confirmed');

      if (appts24h && appts24h.length > 0) {
        for (const appt of appts24h) {
          if (!appt.customers?.line_user_id) continue;

          const { data: existingLog } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('appointment_id', appt.id)
            .eq('notification_type', 'reminder_24h')
            .maybeSingle();

          if (!existingLog) {
            try {
              const staffName = `ช่าง${appt.staff?.name || ''}`;
              const msgs = createReminderMessage({
                queueNumber: appt.queue_number,
                customerName: appt.customers.name,
                serviceName: appt.services?.name || '',
                staffName: staffName,
                bookingDate: appt.booking_date,
                startTime: appt.start_time,
                hoursLeft: 24,
              });

              await lineClient.pushMessage({
                to: appt.customers.line_user_id,
                messages: msgs as any,
              });

              await supabaseAdmin.from('notifications').insert({
                appointment_id: appt.id,
                customer_id: appt.customer_id,
                notification_type: 'reminder_24h',
                status: 'success',
              });

              sentCount.h24++;
            } catch (err: any) {
              console.error('Failed to send 24h reminder:', err);
              await supabaseAdmin.from('notifications').insert({
                appointment_id: appt.id,
                customer_id: appt.customer_id,
                notification_type: 'reminder_24h',
                status: 'failed',
                error_message: err.message,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, processed: sentCount });
  } catch (err: any) {
    console.error('Reminder API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
