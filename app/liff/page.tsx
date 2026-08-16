'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatters';
import { formatThaiDate, formatTimeSlot } from '@/lib/utils/time';
import { Flower2, UserCheck, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, ChevronRight, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

export default function LiffBookingPage() {
  const supabase = createClient();

  // LIFF & Line User State
  const [lineUserId, setLineUserId] = useState<string>('');
  const [lineDisplayName, setLineDisplayName] = useState<string>('');

  // Wizard Step (1: Service, 2: Staff, 3: Date, 4: Time, 5: Customer Details, 6: Success)
  const [step, setStep] = useState<number>(1);

  // Form State
  const [services, setServices] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Customer Info
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // UI States
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [bookingResult, setBookingResult] = useState<any>(null);

  // 1. Initialize LIFF SDK & Fetch Services / Staff
  useEffect(() => {
    async function initLiff() {
      try {
        const liff = (await import('@line/liff')).default;
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (liffId) {
          await liff.init({ liffId });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setLineUserId(profile.userId);
            setLineDisplayName(profile.displayName);
            if (profile.displayName) setName(profile.displayName);
            
            // Check if customer exists in DB to prefill phone/email
            const { data: cust } = await supabase
              .from('customers')
              .select('*')
              .eq('line_user_id', profile.userId)
              .maybeSingle();

            if (cust) {
              if (cust.name) setName(cust.name);
              if (cust.phone) setPhone(cust.phone);
              if (cust.email) setEmail(cust.email);
            }
          }
        }
      } catch (err) {
        console.warn('LIFF init warning (browser mode):', err);
      }
    }

    fetchInitialData();
    initLiff();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const { data: serviceData } = await supabase
        .from('services')
        .select('*')
        .eq('status', true)
        .order('price', { ascending: true });

      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('status', true);

      setServices(serviceData || []);
      setStaffList(staffData || []);

      // Default date to today formatted YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      setBookingDate(today);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // 2. Fetch Available Slots when Staff, Service, or Date changes
  useEffect(() => {
    if (selectedStaff && selectedService && bookingDate) {
      fetchSlots();
    }
  }, [selectedStaff, selectedService, bookingDate]);

  async function fetchSlots() {
    setLoadingSlots(true);
    setSelectedTime('');
    try {
      const res = await fetch(
        `/api/booking/available-slots?staffId=${selectedStaff.id}&serviceId=${selectedService.id}&bookingDate=${bookingDate}`
      );
      const data = await res.json();
      if (res.ok) {
        setAvailableSlots(data.slots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error(err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  // Handle Submission
  async function handleSubmitBooking() {
    // Generate fallback line_user_id for browser testing if LIFF not logged in
    const effectiveLineId = lineUserId || `browser_${phone.replace(/\D/g, '') || Date.now()}`;

    if (!name.trim() || !phone.trim()) {
      setErrorMsg('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: effectiveLineId,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          staffId: selectedStaff.id,
          serviceId: selectedService.id,
          bookingDate: bookingDate,
          startTime: selectedTime,
          note: note,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการจอง');
      }

      setBookingResult(data);
      setStep(6); // Move to Success Step
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถทำการจองได้ กรุณาลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  if (loading && step === 1 && services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-spa-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">กำลังโหลดข้อมูลบริการนวดสปา...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Wizard Progress Bar */}
      {step <= 5 && (
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <span className="font-bold text-sm text-spa-900">
              {step === 1 && 'ขั้นตอนที่ 1/5: เลือกบริการสปา'}
              {step === 2 && 'ขั้นตอนที่ 2/5: เลือกเทอราพิส'}
              {step === 3 && 'ขั้นตอนที่ 3/5: เลือกวันที่'}
              {step === 4 && 'ขั้นตอนที่ 4/5: เลือกเวลา'}
              {step === 5 && 'ขั้นตอนที่ 5/5: ยืนยันข้อมูล'}
            </span>
          </div>
          <span className="text-xs font-semibold text-spa-600 bg-spa-50 px-2.5 py-1 rounded-full">
            {step} / 5
          </span>
        </div>
      )}

      {/* Error Notice Banner */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-start space-x-2 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ================= STEP 1: SELECT SERVICE ================= */}
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center">
            <Flower2 className="w-5 h-5 text-spa-600 mr-2" />
            เลือกบริการนวดสปาที่ต้องการ
          </h2>

          {services.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center text-xs text-amber-800">
              ยังไม่มีบริการที่เปิดให้จองในขณะนี้
            </div>
          ) : (
            <div className="space-y-2.5">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => {
                    setSelectedService(srv);
                    setStep(2);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-sm hover:shadow-md ${
                    selectedService?.id === srv.id
                      ? 'border-spa-600 bg-spa-50/50 ring-2 ring-spa-500/20'
                      : 'border-slate-200 bg-white hover:border-spa-300'
                  }`}
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-900">{srv.name}</h3>
                    {srv.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{srv.description}</p>
                    )}
                    <div className="flex items-center space-x-3 pt-1 text-xs text-slate-600">
                      <span className="font-semibold text-spa-700">{formatCurrency(srv.price)}</span>
                      <span>•</span>
                      <span>⏱ {srv.duration_minutes} นาที</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= STEP 2: SELECT STAFF ================= */}
      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center">
            <UserCheck className="w-5 h-5 text-spa-600 mr-2" />
            เลือกเทอราพิส (หมอนวด)
          </h2>

          {staffList.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center text-xs text-amber-800">
              ยังไม่มีข้อมูลเทอราพิสในระบบ
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {staffList.map((st) => (
                <div
                  key={st.id}
                  onClick={() => {
                    setSelectedStaff(st);
                    setStep(3);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-sm hover:shadow-md ${
                    selectedStaff?.id === st.id
                      ? 'border-spa-600 bg-spa-50/50 ring-2 ring-spa-500/20'
                      : 'border-slate-200 bg-white hover:border-spa-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-spa-100 text-spa-700 flex items-center justify-center font-bold text-lg border border-spa-200">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        คุณ{st.name} {st.nickname ? `(${st.nickname})` : ''}
                      </h3>
                      <p className="text-xs text-slate-500">{st.phone || 'เทอราพิสผู้เชี่ยวชาญ'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= STEP 3: SELECT DATE ================= */}
      {step === 3 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center">
            <CalendarIcon className="w-5 h-5 text-spa-600 mr-2" />
            เลือกวันที่จอง
          </h2>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="block text-xs font-semibold text-slate-700">วันที่ต้องการรับบริการสปา:</label>
            <input
              type="date"
              value={bookingDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-spa-500 outline-none"
            />
            <p className="text-[11px] text-slate-500">
              วันที่เลือก: <span className="font-bold text-spa-700">{formatThaiDate(bookingDate)}</span>
            </p>
          </div>

          <button
            disabled={!bookingDate}
            onClick={() => setStep(4)}
            className="w-full py-3.5 bg-spa-700 hover:bg-spa-800 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <span>ดำเนินการต่อ (เลือกเวลา)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= STEP 4: SELECT TIME SLOT ================= */}
      {step === 4 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center">
            <Clock className="w-5 h-5 text-spa-600 mr-2" />
            เวลาที่เปิดให้จอง
          </h2>

          <div className="bg-spa-50/70 border border-spa-200/60 p-3 rounded-xl text-xs space-y-1 text-spa-900">
            <p>💆‍♀️ บริการ: <span className="font-bold">{selectedService?.name}</span> ({selectedService?.duration_minutes} นาที)</p>
            <p>👩‍⚕️ เทอราพิส: <span className="font-bold">คุณ{selectedStaff?.name}</span></p>
            <p>📅 วันที่: <span className="font-bold">{formatThaiDate(bookingDate)}</span></p>
          </div>

          {loadingSlots ? (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="w-6 h-6 text-spa-600 animate-spin" />
              <p className="mt-2 text-xs text-slate-500">กำลังตรวจสอบเวลาที่ว่าง...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center space-y-2">
              <p className="text-xs text-amber-800 font-semibold">
                ไม่มีรอบเวลาว่างสำหรับเทอราพิสและวันที่เลือก
              </p>
              <p className="text-[11px] text-amber-700">
                (เทอราพิสอาจจะหยุดงาน ตรงกับเวลาพัก หรือมีคิวจองเต็มแล้ว)
              </p>
              <button
                onClick={() => setStep(3)}
                className="mt-2 text-xs text-spa-700 underline font-bold"
              >
                เปลี่ยนวันที่จอง
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slotTime) => (
                <button
                  key={slotTime}
                  onClick={() => setSelectedTime(slotTime)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedTime === slotTime
                      ? 'bg-spa-700 text-white border-spa-800 shadow-md ring-2 ring-spa-400/40'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-spa-300'
                  }`}
                >
                  {formatTimeSlot(slotTime)}
                </button>
              ))}
            </div>
          )}

          <button
            disabled={!selectedTime}
            onClick={() => setStep(5)}
            className={`w-full py-3.5 font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2 ${
              selectedTime
                ? 'bg-spa-700 hover:bg-spa-800 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>ดำเนินการต่อ (กรอกข้อมูลลูกค้า)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= STEP 5: CUSTOMER DETAILS & CONFIRM ================= */}
      {step === 5 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center">
            <CheckCircle2 className="w-5 h-5 text-spa-600 mr-2" />
            ข้อมูลผู้จอง & สรุปคิวนวดสปา
          </h2>

          {/* Booking Summary Card */}
          <div className="bg-gradient-to-br from-spa-900 to-spa-800 text-white p-4 rounded-2xl shadow-md space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-spa-200 font-medium">บริการสปา</span>
              <span className="font-bold text-sm text-white">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-spa-200 font-medium">เทอราพิส</span>
              <span className="font-bold text-white">คุณ{selectedStaff?.name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-spa-200 font-medium">วันที่ & เวลา</span>
              <span className="font-bold text-spa-gold">{formatThaiDate(bookingDate)} @ {formatTimeSlot(selectedTime)}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-spa-200 font-medium">ยอดรวมทั้งสิ้น</span>
              <span className="font-extrabold text-base text-emerald-400">{formatCurrency(selectedService?.price || 0)}</span>
            </div>
          </div>

          {/* Form inputs */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุลลูกค้า <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="ระบุชื่อของคุณ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-spa-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
              <input
                type="tel"
                placeholder="08X-XXX-XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-spa-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">อีเมล (ถ้ามี)</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-spa-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
              <textarea
                placeholder="เช่น เน้นนวดบริเวณคอบ่าไหล่ หรือระบุอาการเฉพาะ"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-spa-500 font-medium"
              />
            </div>
          </div>

          <button
            disabled={loading || !name || !phone}
            onClick={handleSubmitBooking}
            className={`w-full py-4 font-bold rounded-xl text-sm shadow-lg transition-all flex items-center justify-center space-x-2 ${
              loading || !name || !phone
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังบันทึกคิวในระบบ...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>ยืนยันการจองคิวทันที</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ================= STEP 6: SUCCESS SCREEN ================= */}
      {step === 6 && bookingResult && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4 my-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900">จองคิวนวดสปาสำเร็จแล้ว!</h2>
            <p className="text-xs text-slate-500">ระบบได้บันทึกคิวและแจ้งเตือนผ่าน LINE เรียบร้อยแล้ว</p>
          </div>

          <div className="bg-spa-50 border border-spa-200 p-4 rounded-2xl text-spa-900 space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">หมายเลขคิวของคุณ</p>
            <p className="text-2xl font-black text-spa-700 tracking-wider">{bookingResult.queueNumber}</p>
          </div>

          <div className="text-left text-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p><span className="text-slate-500">บริการ:</span> <strong className="text-slate-900">{selectedService?.name}</strong></p>
            <p><span className="text-slate-500">เทอราพิส:</span> <strong className="text-slate-900">คุณ{selectedStaff?.name}</strong></p>
            <p><span className="text-slate-500">วันที่:</span> <strong className="text-slate-900">{formatThaiDate(bookingDate)}</strong></p>
            <p><span className="text-slate-500">เวลา:</span> <strong className="text-slate-900">{formatTimeSlot(selectedTime)}</strong></p>
          </div>

          <a
            href="/liff/my-queue"
            className="block w-full py-3 bg-spa-700 hover:bg-spa-800 text-white font-bold rounded-xl text-xs shadow-md transition-all"
          >
            ดูรายการคิวของฉัน
          </a>
        </div>
      )}
    </div>
  );
}
