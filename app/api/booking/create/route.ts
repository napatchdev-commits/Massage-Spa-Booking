import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { lineClient } from '@/lib/line/bot';
import { createBookingConfirmationMessage, createAdminNewBookingMessage } from '@/lib/line/templates';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lineUserId,
      customerName,
      customerPhone,
      customerEmail,
      staffId,
      serviceId,
      bookingDate,
      startTime,
      note,
    } = body;

    if (!lineUserId || !customerName || !customerPhone || !staffId || !serviceId || !bookingDate || !startTime) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const targetDate = new Date(bookingDate);
    const dow = targetDate.getDay(); // 0=Sun, 6=Sat

    // Ensure staff schedule exists for this staff & day_of_week
    const { data: schedule } = await supabaseAdmin
      .from('staff_schedules')
      .select('*')
      .eq('staff_id', staffId)
      .eq('day_of_week', dow)
      .maybeSingle();

    if (!schedule) {
      // Auto-insert default schedule 07:00:00 to 21:00:00
      await supabaseAdmin.from('staff_schedules').upsert(
        {
          staff_id: staffId,
          day_of_week: dow,
          work_start_time: '07:00:00',
          work_end_time: '21:00:00',
          is_working: true,
        },
        { onConflict: 'staff_id,day_of_week' }
      );
    } else if (schedule.is_working === false) {
      return NextResponse.json({ error: 'ช่างหยุดให้บริการในวันที่เลือก' }, { status: 400 });
    }

    // Call stored procedure for atomic conflict-free creation
    let { data: result, error: rpcError } = await supabaseAdmin.rpc('create_booking_atomic', {
      p_line_user_id: lineUserId,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_email: customerEmail || null,
      p_staff_id: staffId,
      p_service_id: serviceId,
      p_booking_date: bookingDate,
      p_start_time: startTime,
      p_note: note || null,
    });

    // Auto-repair schedule if RPC reported OUTSIDE_WORKING_HOURS
    if (rpcError && rpcError.message.includes('OUTSIDE_WORKING_HOURS')) {
      const defaultSchedules = Array.from({ length: 7 }, (_, i) => ({
        staff_id: staffId,
        day_of_week: i,
        work_start_time: '07:00:00',
        work_end_time: '21:00:00',
        is_working: true,
      }));
      await supabaseAdmin.from('staff_schedules').upsert(defaultSchedules, { onConflict: 'staff_id,day_of_week' });

      const retry = await supabaseAdmin.rpc('create_booking_atomic', {
        p_line_user_id: lineUserId,
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_customer_email: customerEmail || null,
        p_staff_id: staffId,
        p_service_id: serviceId,
        p_booking_date: bookingDate,
        p_start_time: startTime,
        p_note: note || null,
      });

      if (!retry.error) {
        result = retry.data;
        rpcError = null;
      }
    }

    // Fallback if RPC fails or throws custom domain errors
    if (rpcError) {
      console.warn('RPC create_booking_atomic error:', rpcError);

      if (rpcError.message.includes('TIME_SLOT_ALREADY_BOOKED')) {
        return NextResponse.json({ error: 'ขออภัย ช่วงเวลานี้ถูกจองไปแล้ว กรุณาเลือกเวลาอื่น' }, { status: 400 });
      } else if (rpcError.message.includes('STAFF_ON_HOLIDAY')) {
        return NextResponse.json({ error: 'ช่างหยุดให้บริการในวันที่เลือก' }, { status: 400 });
      } else if (rpcError.message.includes('STAFF_BREAK_CONFLICT')) {
        return NextResponse.json({ error: 'เวลานี้ตรงกับเวลาพักของช่าง' }, { status: 400 });
      }

      // Fallback direct JS execution
      const { data: cust, error: custErr } = await supabaseAdmin
        .from('customers')
        .upsert(
          {
            line_user_id: lineUserId,
            name: customerName,
            phone: customerPhone,
            email: customerEmail || null,
          },
          { onConflict: 'line_user_id' }
        )
        .select()
        .single();

      if (custErr || !cust) {
        console.error('Customer upsert error:', custErr);
        return NextResponse.json(
          { error: `ไม่สามารถบันทึกข้อมูลลูกค้าใน Supabase ได้: ${custErr?.message || 'ข้อผิดพลาดใน Supabase'}` },
          { status: 500 }
        );
      }

      const { data: srv, error: srvErr } = await supabaseAdmin
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (srvErr || !srv) {
        return NextResponse.json({ error: 'ไม่พบรายการบริการในระบบ' }, { status: 404 });
      }

      const duration = srv.duration_minutes;
      const [h, m] = startTime.split(':').map(Number);
      const endMin = h * 60 + m + duration;
      const endH = Math.floor(endMin / 60) % 24;
      const endM = endMin % 60;
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

      // Check conflict
      const { data: conflict } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('staff_id', staffId)
        .eq('booking_date', bookingDate)
        .neq('status', 'cancelled')
        .lt('start_time', endTime)
        .gt('end_time', startTime)
        .maybeSingle();

      if (conflict) {
        return NextResponse.json({ error: 'ขออภัย ช่วงเวลานี้ถูกจองไปแล้ว กรุณาเลือกเวลาอื่น' }, { status: 400 });
      }

      // Generate Queue Number
      const { count } = await supabaseAdmin
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('booking_date', bookingDate);

      const seq = (count || 0) + 1;
      const dateNum = bookingDate.replace(/-/g, '');
      const queueNumber = `Q-${dateNum}-${String(seq).padStart(3, '0')}`;

      // Insert Appointment into Supabase
      const { data: appt, error: apptErr } = await supabaseAdmin
        .from('appointments')
        .insert({
          queue_number: queueNumber,
          customer_id: cust.id,
          staff_id: staffId,
          service_id: serviceId,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration,
          price: srv.price,
          status: 'confirmed',
          note: note || null,
        })
        .select()
        .single();

      if (apptErr || !appt) {
        console.error('Appointment insert error:', apptErr);
        return NextResponse.json(
          { error: `ไม่สามารถบันทึกคิวใน Supabase ได้: ${apptErr?.message || 'ข้อผิดพลาดใน Supabase'}` },
          { status: 500 }
        );
      }

      result = {
        appointment_id: appt.id,
        queue_number: queueNumber,
        booking_date: bookingDate,
        start_time: startTime,
        price: srv.price,
        service_name: srv.name,
        customer_id: cust.id,
      };
    }

    // Push notification to Customer via LINE
    const { data: staffData } = await supabaseAdmin
      .from('staff')
      .select('name, nickname')
      .eq('id', staffId)
      .single();

    const staffDisplayName = staffData
      ? `ช่าง${staffData.name} ${staffData.nickname ? `(${staffData.nickname})` : ''}`
      : 'ช่าง';

    try {
      const messages = createBookingConfirmationMessage({
        queueNumber: result.queue_number,
        customerName: customerName,
        serviceName: result.service_name,
        staffName: staffDisplayName,
        bookingDate: bookingDate,
        startTime: startTime,
        price: result.price,
      });

      await lineClient.pushMessage({
        to: lineUserId,
        messages: messages as any,
      });

      await supabaseAdmin.from('notifications').insert({
        appointment_id: result.appointment_id,
        customer_id: result.customer_id,
        notification_type: 'booking_created',
        status: 'success',
      });
    } catch (lineErr: any) {
      console.error('Customer LINE push failed:', lineErr);
      await supabaseAdmin.from('notifications').insert({
        appointment_id: result.appointment_id,
        customer_id: result.customer_id,
        notification_type: 'booking_created',
        status: 'failed',
        error_message: lineErr.message,
      });
    }

    // Push instant notification to Admin / Salon Owner
    try {
      const { data: setting } = await supabaseAdmin.from('settings').select('line_admin_user_id').maybeSingle();
      const adminUserId = process.env.LINE_ADMIN_USER_ID || setting?.line_admin_user_id;

      if (adminUserId && adminUserId.startsWith('U')) {
        const adminMessages = createAdminNewBookingMessage({
          queueNumber: result.queue_number,
          customerName: customerName,
          customerPhone: customerPhone,
          serviceName: result.service_name,
          staffName: staffDisplayName,
          bookingDate: bookingDate,
          startTime: startTime,
          price: result.price,
        });

        await lineClient.pushMessage({
          to: adminUserId,
          messages: adminMessages as any,
        });
      }
    } catch (adminErr: any) {
      console.error('Admin LINE push notification failed:', adminErr);
    }

    return NextResponse.json({
      success: true,
      appointmentId: result.appointment_id,
      queueNumber: result.queue_number,
      message: 'จองคิวสำเร็จแล้ว',
    });
  } catch (err: any) {
    console.error('Booking create API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
