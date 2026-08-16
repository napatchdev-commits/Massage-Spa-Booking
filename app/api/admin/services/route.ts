import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const DEFAULT_SPA_SERVICES = [
  {
    name: 'นวดแผนไทย (60 นาที)',
    description: 'นวดผ่อนคลายกล้ามเนื้อ คลายเส้น ดัดเส้นจุด บรรเทาอาการปวดเมื่อย',
    price: 400,
    duration_minutes: 60,
    status: true,
  },
  {
    name: 'นวดแผนไทย (90 นาที)',
    description: 'นวดผ่อนคลายกล้ามเนื้อ คลายเส้น ดัดเส้นจุด บรรเทาอาการปวดเมื่อย',
    price: 600,
    duration_minutes: 90,
    status: true,
  },
  {
    name: 'นวดเท้า (60 นาที)',
    description: 'นวดกดจุดฝ่าเท้า ช่วยกระตุ้นการไหลเวียนโลหิต ลดอาการปวดเมื่อยเท้า ผ่อนคลายความเครียด',
    price: 400,
    duration_minutes: 60,
    status: true,
  },
  {
    name: 'นวดเท้า (90 นาที)',
    description: 'นวดกดจุดฝ่าเท้า ช่วยกระตุ้นการไหลเวียนโลหิต ลดอาการปวดเมื่อยเท้า ผ่อนคลายความเครียด',
    price: 600,
    duration_minutes: 90,
    status: true,
  },
  {
    name: 'นวดน้ำมันอโรม่า (60 นาที)',
    description: 'นวดด้วยน้ำมันหอมระเหย กลิ่นบำบัด ช่วยผ่อนคลายกล้ามเนื้อ และลดความเครียด',
    price: 600,
    duration_minutes: 60,
    status: true,
  },
  {
    name: 'นวดน้ำมันอโรม่า (90 นาที)',
    description: 'นวดด้วยน้ำมันหอมระเหย กลิ่นบำบัด ช่วยผ่อนคลายกล้ามเนื้อ และลดความเครียด',
    price: 900,
    duration_minutes: 90,
    status: true,
  },
  {
    name: 'นวดประคบสมุนไพร (60 นาที)',
    description: 'นวดด้วยลูกประคบสมุนไพรอุ่น ช่วยลดอาการปวดเมื่อย คลายกล้ามเนื้อ บำรุงผิวพรรณ',
    price: 600,
    duration_minutes: 60,
    status: true,
  },
  {
    name: 'นวดประคบสมุนไพร (90 นาที)',
    description: 'นวดด้วยลูกประคบสมุนไพรอุ่น ช่วยลดอาการปวดเมื่อย คลายกล้ามเนื้อ บำรุงผิวพรรณ',
    price: 900,
    duration_minutes: 90,
    status: true,
  },
  {
    name: 'นวดคอบ่าไหล่ (45 นาที)',
    description: 'เน้นบรรเทาอาการปวดตึง บริเวณคอ บ่า ไหล่ เหมาะสำหรับคนทำงาน ออฟฟิศซินโดรม',
    price: 350,
    duration_minutes: 45,
    status: true,
  },
  {
    name: 'นวดคอบ่าไหล่ (60 นาที)',
    description: 'เน้นบรรเทาอาการปวดตึง บริเวณคอ บ่า ไหล่ เหมาะสำหรับคนทำงาน ออฟฟิศซินโดรม',
    price: 450,
    duration_minutes: 60,
    status: true,
  },
  {
    name: 'นวดศีรษะ (45 นาที)',
    description: 'นวดศีรษะ ไหล่ ต้นคอ ช่วยลดอาการปวดศีรษะ ผ่อนคลายความเครียด นอนหลับสบาย',
    price: 350,
    duration_minutes: 45,
    status: true,
  },
  {
    name: 'นวดศีรษะ (60 นาที)',
    description: 'นวดศีรษะ ไหล่ ต้นคอ ช่วยลดอาการปวดศีรษะ ผ่อนคลายความเครียด นอนหลับสบาย',
    price: 450,
    duration_minutes: 60,
    status: true,
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceSeed = searchParams.get('seed') === 'true';

    let { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .order('price', { ascending: true });

    if (error) throw error;

    // Auto-seed default 6 spa services if empty or fewer than 6 items or forceSeed is true
    if (!data || data.length < 5 || forceSeed) {
      for (const service of DEFAULT_SPA_SERVICES) {
        // Check if service name already exists
        const exists = data?.some((s) => s.name === service.name);
        if (!exists) {
          await supabaseAdmin.from('services').insert(service);
        }
      }

      // Re-fetch updated list
      const res = await supabaseAdmin
        .from('services')
        .select('*')
        .order('price', { ascending: true });
      data = res.data || [];
    }

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
