'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Phone, Clock, ExternalLink, Loader2, Sparkles } from 'lucide-react';

export default function ContactPage() {
  const supabase = createClient();
  const [setting, setSetting] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();
      setSetting(data);
      setLoading(false);
    }
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-spa-600 animate-spin" />
        <p className="mt-2 text-xs text-slate-500">กำลังโหลดข้อมูลร้านสปา...</p>
      </div>
    );
  }

  const salonName = setting?.salon_name || 'Spa & Massage';
  const phone = setting?.phone || 'ยังไม่ได้ระบุ';
  const address = setting?.address || 'ยังไม่ได้ระบุ';
  const mapsUrl = setting?.google_maps_url;
  const openTime = setting?.open_time ? setting.open_time.substring(0, 5) : '09:00';
  const closeTime = setting?.close_time ? setting.close_time.substring(0, 5) : '22:00';

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-slate-800 flex items-center">
        <MapPin className="w-5 h-5 text-spa-600 mr-2" />
        ข้อมูลและการติดต่อร้านนวดสปา (Spa Info)
      </h2>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
          <div className="w-12 h-12 rounded-2xl bg-spa-100 text-spa-700 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6 text-spa-gold" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">{salonName}</h3>
            <p className="text-slate-500">LINE Official Spa Partner</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Clock className="w-4 h-4 text-spa-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">เวลาทำการสปา:</p>
              <p className="text-slate-600">{openTime} น. – {closeTime} น. (เปิดบริการทุกวัน)</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Phone className="w-4 h-4 text-spa-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">เบอร์โทรศัพท์ติดต่อ:</p>
              <p className="text-slate-600">{phone}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <MapPin className="w-4 h-4 text-spa-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">ที่อยู่ร้านนวดสปา:</p>
              <p className="text-slate-600 leading-relaxed">{address}</p>
            </div>
          </div>
        </div>

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-spa-50 hover:bg-spa-100 border border-spa-200 text-spa-800 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all"
          >
            <span>นำทางด้วย Google Maps</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
