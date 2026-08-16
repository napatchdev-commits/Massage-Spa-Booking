'use client';

import React, { useState, useEffect } from 'react';
import { Save, Store, ShieldAlert, Bell, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [settingId, setSettingId] = useState<string>('');

  // Form fields
  const [salonName, setSalonName] = useState<string>('Spa & Massage');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>('');
  const [openTime, setOpenTime] = useState<string>('09:00');
  const [closeTime, setCloseTime] = useState<string>('22:00');
  const [minCancelHours, setMinCancelHours] = useState<number>(2);
  const [advanceBookingDays, setAdvanceBookingDays] = useState<number>(30);
  const [reminder24h, setReminder24h] = useState<boolean>(true);
  const [reminder1h, setReminder1h] = useState<boolean>(true);
  const [lineAdminUserId, setLineAdminUserId] = useState<string>('');

  const [successNotice, setSuccessNotice] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      const data = json.setting;

      if (data) {
        setSettingId(data.id);
        setSalonName(data.salon_name || 'Spa & Massage');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setGoogleMapsUrl(data.google_maps_url || '');
        setOpenTime(data.open_time ? data.open_time.substring(0, 5) : '09:00');
        setCloseTime(data.close_time ? data.close_time.substring(0, 5) : '22:00');
        setMinCancelHours(data.min_cancel_hours ?? 2);
        setAdvanceBookingDays(data.advance_booking_days ?? 30);
        setReminder24h(data.reminder_24h_active ?? true);
        setReminder1h(data.reminder_1h_active ?? true);
        setLineAdminUserId(data.line_admin_user_id || '');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('ไม่สามารถโหลดการตั้งค่าได้');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessNotice(false);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: settingId,
          salonName,
          phone,
          address,
          googleMapsUrl,
          openTime,
          closeTime,
          minCancelHours,
          advanceBookingDays,
          reminder24h,
          reminder1h,
          lineAdminUserId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'ไม่สามารถบันทึกการตั้งค่าได้');
      }

      if (json.setting) {
        const s = json.setting;
        setSettingId(s.id);
        setSalonName(s.salon_name || 'Spa & Massage');
        setPhone(s.phone || '');
        setAddress(s.address || '');
        setGoogleMapsUrl(s.google_maps_url || '');
        setOpenTime(s.open_time ? s.open_time.substring(0, 5) : '09:00');
        setCloseTime(s.close_time ? s.close_time.substring(0, 5) : '22:00');
        setMinCancelHours(s.min_cancel_hours ?? 2);
        setAdvanceBookingDays(s.advance_booking_days ?? 30);
        setReminder24h(s.reminder_24h_active ?? true);
        setReminder1h(s.reminder_1h_active ?? true);
        setLineAdminUserId(s.line_admin_user_id || '');
      }

      setSuccessNotice(true);
      setTimeout(() => setSuccessNotice(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-spa-500" />
        <p className="mt-2 text-xs">กำลังโหลดข้อมูลการตั้งค่า...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-white">ตั้งค่าร้านและกฎการจองสปา (Spa Settings)</h1>
          <p className="text-xs text-slate-400">กำหนดชื่อร้านสปา เบอร์โทร เวลาเปิด/ปิด เงื่อนไขการยกเลิก และการแจ้งเตือน</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2.5 bg-spa-600 hover:bg-spa-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-lg"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </>
          )}
        </button>
      </div>

      {successNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3.5 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>บันทึกข้อมูลการตั้งค่าร้านสปาสำเร็จแล้ว (ข้อมูลได้รับการอัปเดตลงฐานข้อมูลแล้ว)</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Spa General Profile */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center">
          <Store className="w-4 h-4 text-spa-400 mr-2" />
          ข้อมูลทั่วไปของร้านนวดสปา (General Info)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">ชื่อร้านนวดสปา <span className="text-rose-400">*</span></label>
            <input
              type="text"
              required
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">เบอร์โทรศัพท์ติดต่อร้าน</label>
            <input
              type="tel"
              placeholder="02-XXX-XXXX หรือ 08X-XXX-XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-300 font-semibold mb-1">ที่อยู่ร้านนวดสปา</label>
            <textarea
              rows={2}
              placeholder="ระบุที่อยู่ของร้านอย่างละเอียด"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-300 font-semibold mb-1">ลิงก์ Google Maps</label>
            <input
              type="url"
              placeholder="https://maps.google.com/..."
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Working Hours & Booking Rules */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center">
          <ShieldAlert className="w-4 h-4 text-spa-400 mr-2" />
          เวลาเปิด/ปิด & กฎการจองคิวนวดสปา (Operating Hours & Rules)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">เวลาเปิดร้าน</label>
            <input
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">เวลาปิดร้าน</label>
            <input
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">เปิดให้จองล่วงหน้าได้ไม่เกิน (วัน)</label>
            <input
              type="number"
              min="1"
              max="180"
              value={advanceBookingDays}
              onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">ห้ามยกเลิก/เลื่อนนัดก่อนถึงเวลา (ชั่วโมง)</label>
            <input
              type="number"
              min="0"
              max="72"
              value={minCancelHours}
              onChange={(e) => setMinCancelHours(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Notification Settings */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center">
          <Bell className="w-4 h-4 text-spa-400 mr-2" />
          การแจ้งเตือนอัตโนมัติผ่าน LINE (LINE Automated Reminders)
        </h2>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white">แจ้งเตือนเตือนคิวก่อน 24 ชั่วโมง</p>
              <p className="text-slate-400 text-[11px]">ส่ง Push message ทาง LINE แจ้งเตือนลูกค้าล่วงหน้า 1 วัน</p>
            </div>
            <button
              type="button"
              onClick={() => setReminder24h(!reminder24h)}
              className={`px-3 py-1.5 rounded-xl font-bold ${
                reminder24h ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {reminder24h ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white">แจ้งเตือนเตือนคิวก่อน 1 ชั่วโมง</p>
              <p className="text-slate-400 text-[11px]">ส่ง Push message ทาง LINE แจ้งเตือนเมื่อใกล้ถึงเวลานัดหมาย</p>
            </div>
            <button
              type="button"
              onClick={() => setReminder1h(!reminder1h)}
              className={`px-3 py-1.5 rounded-xl font-bold ${
                reminder1h ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {reminder1h ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
            </button>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <label className="block font-bold text-white">LINE Admin User ID (สำหรับรับการแจ้งเตือนเจ้าของร้านเมื่อมีคิวสปาใหม่)</label>
            <p className="text-slate-400 text-[11px]">พิมพ์คำว่า <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">myid</code> ส่งเข้าไปในแชท LINE Official ของร้าน เพื่อรับ ID แล้วนำมาวางในช่องนี้</p>
            <input
              type="text"
              placeholder="เช่น U1234567890abcdef1234567890abcdef"
              value={lineAdminUserId}
              onChange={(e) => setLineAdminUserId(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs outline-none focus:border-spa-500"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
