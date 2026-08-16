import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, nickname, phone, status } = body;

    if (!name) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อเทอราพิส' }, { status: 400 });
    }

    const { data: newSt, error: insErr } = await supabaseAdmin
      .from('staff')
      .insert({ name, nickname, phone, status: status !== undefined ? status : true })
      .select()
      .single();

    if (insErr) throw insErr;

    // Auto-generate default 7 days working schedule
    const defaultSchedules = Array.from({ length: 7 }, (_, i) => ({
      staff_id: newSt.id,
      day_of_week: i,
      work_start_time: '09:00:00',
      work_end_time: '22:00:00',
      is_working: true,
    }));

    await supabaseAdmin.from('staff_schedules').insert(defaultSchedules);

    return NextResponse.json({ success: true, data: newSt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, nickname, phone, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID เทอราพิส' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('staff')
      .update({ name, nickname, phone, status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
