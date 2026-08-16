import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .order('price', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, price, duration_minutes, status } = body;

    if (!name || price === undefined || !duration_minutes) {
      return NextResponse.json({ error: 'กรอกข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('services')
      .insert({
        name,
        description: description || '',
        price: parseFloat(price),
        duration_minutes: parseInt(duration_minutes),
        status: status !== undefined ? status : true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, description, price, duration_minutes, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID บริการ' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('services')
      .update({
        name,
        description,
        price: parseFloat(price),
        duration_minutes: parseInt(duration_minutes),
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID บริการ' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('services').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
