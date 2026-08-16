import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID คิวนัดหมาย' }, { status: 400 });
    }

    // Delete notification logs first
    await supabaseAdmin.from('notifications').delete().eq('appointment_id', id);

    // Delete appointment
    const { error } = await supabaseAdmin.from('appointments').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
