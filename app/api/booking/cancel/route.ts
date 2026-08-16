import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { canCancelAppointment } from '@/lib/utils/time';
import { lineClient } from '@/lib/line/bot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, lineUserId, reason } = await req.json();

    if (!appointmentId) {
      return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });
    }

    const { data: appt, error: apptError } = await supabaseAdmin
      .from('appointments')
      .select('*, customers(line_user_id, name), services(name)')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appt) {
      return NextResponse.json({ error: 'ไม่พบรายการคิวดังกล่าว' }, { status: 404 });
    }

    if (appt.status === 'cancelled') {
      return NextResponse.json({ error: 'คิวนี้ถูกยกเลิกไปแล้ว' }, { status: 400 });
    }

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('min_cancel_hours')
      .maybeSingle();

    const minCancelHours = settings?.min_cancel_hours ?? 2;

    const cancelCheck = canCancelAppointment(appt.booking_date, appt.start_time, minCancelHours);
    if (!cancelCheck.canCancel) {
      return NextResponse.json({ error: cancelCheck.message }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled', note: reason ? `ยกเลิก: ${reason}` : appt.note })
      .eq('id', appointmentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const customerLineId = lineUserId || appt.customers?.line_user_id;
    if (customerLineId) {
      try {
        await lineClient.pushMessage({
          to: customerLineId,
          messages: [
            {
              type: 'text',
              text: `❌ ยกเลิกการจองคิวเรียบร้อยแล้ว\n\nคิวหมายเลข: ${appt.queue_number}\nบริการ: ${appt.services?.name || ''}\nวันที่: ${appt.booking_date}\n\nหวังว่าจะได้ให้บริการคุณอีกครั้งครับ/ค่ะ`
            }
          ]
        });

        await supabaseAdmin.from('notifications').insert({
          appointment_id: appt.id,
          customer_id: appt.customer_id,
          notification_type: 'booking_cancelled',
          status: 'success',
        });
      } catch (lineErr: any) {
        console.error('Cancellation LINE push error:', lineErr);
      }
    }

    return NextResponse.json({ success: true, message: 'ยกเลิกคิวเรียบร้อยแล้ว' });
  } catch (err: any) {
    console.error('Cancel booking API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
