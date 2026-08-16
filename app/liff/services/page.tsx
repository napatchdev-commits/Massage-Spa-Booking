'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatters';
import { Flower2, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ServicesPage() {
  const supabase = createClient();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadServices() {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('status', true)
        .order('price', { ascending: true });
      setServices(data || []);
      setLoading(false);
    }
    loadServices();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-slate-800 flex items-center">
        <Flower2 className="w-5 h-5 text-spa-600 mr-2" />
        บริการและแพ็กเกจนวดสปา (Spa Services)
      </h2>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-spa-600 animate-spin" />
          <p className="mt-2 text-xs text-slate-500">กำลังโหลดรายการบริการนวดสปา...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl border text-center text-xs text-slate-500">
          ยังไม่มีรายการบริการในระบบ
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((srv) => (
            <div key={srv.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{srv.name}</h3>
                  {srv.description && <p className="text-xs text-slate-500 mt-0.5">{srv.description}</p>}
                </div>
                <span className="font-extrabold text-sm text-spa-700 bg-spa-50 px-2.5 py-1 rounded-lg border border-spa-200">
                  {formatCurrency(srv.price)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 flex items-center">
                  <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  ระยะเวลา {srv.duration_minutes} นาที
                </span>
                <Link
                  href="/liff"
                  className="text-xs font-bold text-spa-700 hover:text-spa-800 underline"
                >
                  จองบริการนี้
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
