'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PRESET_SERVICES_DATA } from '@/lib/constants/services';
import { ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ServicesPage() {
  const supabase = createClient();
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadServices() {
      try {
        const { data } = await supabase
          .from('services')
          .select('*')
          .eq('status', true)
          .order('price', { ascending: true });
        setDbServices(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  return (
    <div className="space-y-4 -mx-4 -mt-4 pb-6">
      {/* Luxury Emerald & Gold Header Banner */}
      <div className="bg-gradient-to-b from-[#031c13] via-[#062c1e] to-[#041a12] p-6 text-center border-b-2 border-[#c59e47] relative shadow-2xl overflow-hidden">
        <div className="flex justify-center items-center space-x-2 text-[#d4af37] text-xs font-semibold mb-1">
          <span>❖</span>
          <span className="tracking-widest uppercase text-[10px]">Luxury Spa & Massage</span>
          <span>❖</span>
        </div>

        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffe082] via-[#e6be5a] to-[#d4af37] tracking-wide flex items-center justify-center space-x-2">
          <span>บริการนวดสปา</span>
        </h1>
        <p className="text-[11px] text-[#dfc385] mt-1 italic font-medium">
          ผ่อนคลาย บรรเทาอาการเมื่อยล้า ใส่ใจทุกสัมผัส
        </p>

        <div className="w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mt-3" />
      </div>

      {/* Menu Container */}
      <div className="px-4">
        <div className="bg-[#052317] border-2 border-[#b89542] rounded-3xl p-4 shadow-2xl space-y-4">
          
          {/* Table Header Row */}
          <div className="grid grid-cols-12 gap-2 text-xs font-extrabold text-[#f3cf7a] border-b border-[#8a6d2c] pb-2 text-center items-center px-1">
            <div className="col-span-6 text-left pl-2">รายการบริการนวด</div>
            <div className="col-span-3">ระยะเวลา</div>
            <div className="col-span-3">ราคา</div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#d4af37]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="mt-2 text-xs text-[#dfc385]">กำลังโหลดรายการบริการนวดสปา...</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e4d38]">
              {PRESET_SERVICES_DATA.map((item, idx) => (
                <div key={idx} className="py-3.5 space-y-2.5 first:pt-1 last:pb-1">
                  <div className="grid grid-cols-12 gap-2 items-center text-xs">
                    {/* Column 1: Number + Title + Icon */}
                    <div className="col-span-6 flex items-start space-x-2 text-left">
                      <span className="w-6 h-6 rounded-full bg-[#10402e] border border-[#d4af37] text-[#ffe082] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-[#ffe082] flex items-center">
                          {item.name}
                          <span className="ml-1 text-xs">{item.icon}</span>
                        </h3>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 font-light">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Column 2 & 3: Durations & Prices (Clickable Pills) */}
                    <div className="col-span-6 space-y-2 text-center font-bold">
                      {item.options.map((opt, optIdx) => (
                        <Link
                          key={optIdx}
                          href={`/liff?serviceName=${encodeURIComponent(item.name)}&duration=${opt.duration}&price=${opt.price}`}
                          className="grid grid-cols-6 items-center text-xs bg-[#0b3323] hover:bg-[#104832] p-2 rounded-xl border border-[#b89542]/40 shadow-sm transition-all group cursor-pointer"
                        >
                          <span className="col-span-3 text-slate-200 group-hover:text-white font-semibold">{opt.duration} นาที</span>
                          <span className="col-span-3 text-[#ffe082] group-hover:text-white font-extrabold text-sm">{opt.price}.-</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Luxury Footer Disclaimer */}
          <div className="pt-3 border-t border-[#8a6d2c] text-center space-y-1">
            <p className="text-xs font-semibold text-[#f3cf7a] flex items-center justify-center space-x-1">
              <span>🪷</span>
              <span>ขอบคุณที่ไว้วางใจในบริการของเรา</span>
              <span>🪷</span>
            </p>
            <span className="inline-block bg-[#0b3323] border border-[#d4af37]/40 text-[#ffe082] text-[10px] px-3 py-0.5 rounded-full font-bold">
              ราคานี้รวมค่าบริการแล้ว
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
