import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBangkokNow } from '@/lib/utils/time';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const serviceId = searchParams.get('serviceId');
    const bookingDate = searchParams.get('bookingDate');

    if (!staffId || !serviceId || !bookingDate) {
      return NextResponse.json({ error: 'Missing staffId, serviceId, or bookingDate' }, { status: 400 });
    }

    const targetDate = new Date(bookingDate);
    const dow = targetDate.getDay(); // 0=Sun, 6=Sat

    // 1. Check if staff has holiday on this date
    const { data: holiday } = await supabaseAdmin
      .from('staff_holidays')
      .select('id')
      .eq('staff_id', staffId)
      .eq('holiday_date', bookingDate)
      .maybeSingle();

    if (holiday) {
      return NextResponse.json({ slots: [] });
    }

    // 2. Fetch staff schedule
    const { data: schedule } = await supabaseAdmin
      .from('staff_schedules')
      .select('*')
      .eq('staff_id', staffId)
      .eq('day_of_week', dow)
      .maybeSingle();

    if (schedule && schedule.is_working === false) {
      return NextResponse.json({ slots: [] });
    }

    // 3. Fetch default salon opening/closing settings
    const { data: setting } = await supabaseAdmin
      .from('settings')
      .select('open_time, close_time')
      .maybeSingle();

    const openTimeStr = schedule?.work_start_time || setting?.open_time || '07:00:00';
    const closeTimeStr = schedule?.work_end_time || setting?.close_time || '21:00:00';

    // 4. Fetch service duration
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('duration_minutes, status')
      .eq('id', serviceId)
      .single();

    if (!service || !service.status) {
      return NextResponse.json({ slots: [] });
    }

    const duration = service.duration_minutes;

    // 5. Fetch staff breaks
    const { data: breaks } = await supabaseAdmin
      .from('staff_breaks')
      .select('break_start_time, break_end_time')
      .eq('staff_id', staffId)
      .eq('day_of_week', dow);

    // 6. Fetch ALL active non-cancelled appointments for this staff on this date
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('start_time, end_time, status')
      .eq('staff_id', staffId)
      .eq('booking_date', bookingDate)
      .neq('status', 'cancelled');

    const timeToMin = (t: string) => {
      if (!t) return 0;
      const parts = t.split(':').map(Number);
      return parts[0] * 60 + (parts[1] || 0);
    };

    const minToTime = (m: number) => {
      const h = Math.floor(m / 60);
      const min = m % 60;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
    };

    let workStartMin = timeToMin(openTimeStr);
    let workEndMin = timeToMin(closeTimeStr);

    if (workStartMin > 420 && !schedule) {
      workStartMin = 420; // Default to 07:00 AM if unconfigured
    }

    const nowBangkok = getBangkokNow();
    const todayStr = nowBangkok.toISOString().split('T')[0];
    const currentMin = nowBangkok.getHours() * 60 + nowBangkok.getMinutes();

    const resultSlots: string[] = [];

    // Loop through candidates in 30-minute intervals
    for (let slotMin = workStartMin; slotMin + duration <= workEndMin; slotMin += 30) {
      const slotEndMin = slotMin + duration;

      // Filter out past time if date is TODAY (15 min grace period)
      if (bookingDate === todayStr && slotMin < currentMin + 15) {
        continue;
      }

      // Check break overlap
      const hasBreak = (breaks || []).some((b) => {
        const bStart = timeToMin(b.break_start_time);
        const bEnd = timeToMin(b.break_end_time);
        return slotMin < bEnd && slotEndMin > bStart;
      });

      if (hasBreak) continue;

      // Check appointment overlap (Strict Range Overlap: candidate slot overlaps if slotMin < apptEnd && slotEndMin > apptStart)
      const hasConflict = (appointments || []).some((a) => {
        const aStart = timeToMin(a.start_time);
        const aEnd = timeToMin(a.end_time);
        return slotMin < aEnd && slotEndMin > aStart;
      });

      if (hasConflict) continue;

      resultSlots.push(minToTime(slotMin));
    }

    return NextResponse.json({ slots: resultSlots });
  } catch (err: any) {
    console.error('Available slots API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
