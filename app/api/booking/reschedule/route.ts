import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { canCancelAppointment } from '@/lib/utils/time';
import { lineClient } from '@/lib/line/bot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, newBookingDate, newStartTime, newStaffId, lineUserId } = await req.json();

    if (!appointmentId || !newBookingDate || !newStartTime) {
      return NextResponse.json({ error: 'Missing required reschedule parameter' }, { status: 400 });
    }

    const { data: oldAppt, error: fetchErr } = await supabaseAdmin
      .from('appointments')
      .select('*, customers(line_user_id, name, phone, email)')
      .eq('id', appointmentId)
      .single();

    if (fetchErr || !oldAppt) {
      return NextResponse.json({ error: 'ไม่พบรายการคิวดังกล่าว' }, { status: 404 });
    }

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('min_cancel_hours')
      .maybeSingle();

    const minCancelHours = settings?.min_cancel_hours ?? 2;
    const policyCheck = canCancelAppointment(oldAppt.booking_date, oldAppt.start_time, minCancelHours);
    if (!policyCheck.canCancel) {
      return NextResponse.json({ error: policyCheck.message }, { status: 400 });
    }

    const staffToUse = newStaffId || oldAppt.staff_id;
    const targetLineId = lineUserId || oldAppt.customers?.line_user_id;

    const { data: newResult, error: rpcErr } = await supabaseAdmin.rpc('create_booking_atomic', {
      p_line_user_id: targetLineId,
      p_customer_name: oldAppt.customers?.name || 'Customer',
      p_customer_phone: oldAppt.customers?.phone || '',
      p_customer_email: oldAppt.customers?.email || null,
      p_staff_id: staffToUse,
      p_service_id: oldAppt.service_id,
      p_booking_date: newBookingDate,
      p_start_time: newStartTime,
      p_note: `เลื่อนมาจากคิว #${oldAppt.queue_number}`,
    });

    if (rpcErr) {
      let friendlyMessage = 'ไม่สามารถเลื่อนนัดหมายเป็นเวลานี้ได้';
      if (rpcErr.message.includes('TIME_SLOT_ALREADY_BOOKED')) {
        friendlyMessage = 'ขออภัย เวลาใหม่ที่คุณเลือกถูกจองไปแล้ว';
      }
      return NextResponse.json({ error: friendlyMessage }, { status: 400 });
    }

    await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled', note: `เลื่อนนัดไปยังคิว #${newResult.queue_number}` })
      .eq('id', appointmentId);

    if (targetLineId) {
      try {
        await lineClient.pushMessage({
          to: targetLineId,
          messages: [
            {
              type: 'text',
              text: `🔄 เลื่อนนัดหมายสำเร็จแล้ว!\n\nคิวเดิม (#${oldAppt.queue_number}) ถูกยกเลิก\nคิวใหม่: #${newResult.queue_number}\nวันที่: ${newBookingDate}\nเวลา: ${newStartTime.substring(0, 5)} น.`
            }
          ]
        });

        await supabaseAdmin.from('notifications').insert({
          appointment_id: newResult.appointment_id,
          customer_id: oldAppt.customer_id,
          notification_type: 'booking_rescheduled',
          status: 'success',
        });
      } catch (lineErr) {
        console.error('Reschedule LINE notification error:', lineErr);
      }
    }

    return NextResponse.json({
      success: true,
      newQueueNumber: newResult.queue_number,
      message: 'เลื่อนนัดหมายสำเร็จแล้ว',
    });
  } catch (err: any) {
    console.error('Reschedule API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
