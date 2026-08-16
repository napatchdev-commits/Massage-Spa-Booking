'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatters';
import { formatThaiDate, formatTimeSlot } from '@/lib/utils/time';
import { PRESET_SERVICES_DATA } from '@/lib/constants/services';
import { Flower2, UserCheck, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, ChevronRight, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

function BookingWizardContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();

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
        if (liffId && liffId !== 'placeholder-liff-id') {
          await liff.init({ liffId });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setLineUserId(profile.userId);
            setLineDisplayName(profile.displayName);
            if (profile.displayName) setName(profile.displayName);
            
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

      const loadedServices = serviceData || [];
      setServices(loadedServices);
      setStaffList(staffData || []);

      // Default date to today formatted YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      setBookingDate(today);

      // Check URL parameters for preselected service
      const paramName = searchParams.get('serviceName');
      const paramDuration = searchParams.get('duration');
      const paramPrice = searchParams.get('price');

      if (paramName && paramDuration) {
        const durNum = parseInt(paramDuration);
        const priceNum = paramPrice ? parseFloat(paramPrice) : 0;
        
        // Find matching DB service
        const matched = loadedServices.find(
          (s) => s.name.includes(paramName) && s.duration_minutes === durNum
        ) || {
          id: `preset_${paramName}_${durNum}`,
          name: `${paramName} (${durNum} นาที)`,
          price: priceNum,
          duration_minutes: durNum,
        };

        setSelectedService(matched);
        setStep(2); // Auto advance to Step 2
      }
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
      setStep(6);
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถทำการจองได้ กรุณาลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectServiceOption(item: any, opt: { duration: number; price: number }) {
    const fullName = `${item.name} (${opt.duration} นาที)`;
    
    // Find matching DB service if available
    const matched = services.find(
      (s) => s.name.includes(item.name) && s.duration_minutes === opt.duration
    ) || {
      id: `preset_${item.name}_${opt.duration}`,
      name: fullName,
      price: opt.price,
      duration_minutes: opt.duration,
    };

    setSelectedService(matched);
    setStep(2); // Advance to Step 2 (Select Staff)
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
              {step === 1 && 'ขั้นตอนที่ 1/5: เลือกบริการสปา & ระยะเวลา'}
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

      {/* ================= STEP 1: SELECT SERVICE & DURATION ================= */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#052317] via-[#083322] to-[#052317] p-4 rounded-2xl border border-[#b89542] text-center shadow-lg">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffe082] via-[#e6be5a] to-[#d4af37]">
              เลือกบริการนวดสปาและระยะเวลา
            </h2>
            <p className="text-[11px] text-[#dfc385] mt-0.5 italic">
              กดเลือกระยะเวลา (นาที) และราคาที่ต้องการจองคิว
            </p>
          </div>

          {/* Luxury 6-Service Cards Table */}
          <div className="bg-[#052317] border-2 border-[#b89542] rounded-3xl p-3.5 shadow-2xl space-y-3">
            {/* Table Header Row */}
            <div className="grid grid-cols-12 gap-2 text-xs font-extrabold text-[#f3cf7a] border-b border-[#8a6d2c] pb-2 text-center items-center px-1">
              <div className="col-span-6 text-left pl-2">รายการบริการนวด</div>
              <div className="col-span-3">ระยะเวลา</div>
              <div className="col-span-3">ราคา</div>
            </div>

            <div className="divide-y divide-[#1e4d38]">
              {PRESET_SERVICES_DATA.map((item, idx) => (
                <div key={idx} className="py-3 space-y-2 first:pt-1 last:pb-1">
                  <div className="grid grid-cols-12 gap-2 items-center text-xs">
                    {/* Column 1: Number + Title + Description */}
                    <div className="col-span-6 flex items-start space-x-2 text-left">
                      <span className="w-5 h-5 rounded-full bg-[#10402e] border border-[#d4af37] text-[#ffe082] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h3 className="font-bold text-xs text-[#ffe082] flex items-center">
                          {item.name}
                          <span className="ml-1 text-[11px]">{item.icon}</span>
                        </h3>
                        <p className="text-[10px] text-slate-300 leading-tight mt-0.5 font-light">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Column 2 & 3: Clickable Duration Options */}
                    <div className="col-span-6 space-y-1.5 text-center font-bold">
                      {item.options.map((opt, optIdx) => {
                        const isSelected =
                          selectedService?.name?.includes(item.name) &&
                          selectedService?.duration_minutes === opt.duration;

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectServiceOption(item, opt)}
                            className={`grid grid-cols-6 items-center text-xs p-1.5 rounded-xl border shadow-sm transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#b89542] to-[#d4af37] text-[#052317] border-white ring-2 ring-[#ffe082]'
                                : 'bg-[#0b3323] hover:bg-[#104832] border-[#b89542]/40 text-slate-200 hover:text-white'
                            }`}
                          >
                            <span className="col-span-3 text-[11px] font-semibold">{opt.duration} นาที</span>
                            <span className="col-span-3 text-sm font-black">{opt.price}.-</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Notice */}
            <div className="pt-2 border-t border-[#8a6d2c] text-center">
              <span className="text-[10px] text-[#f3cf7a] font-medium">
                🪷 เลือกนาทีที่ต้องการนวดสปาแล้วกดเพื่อไปยังขั้นตอนต่อไป 🪷
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: SELECT STAFF ================= */}
      {step === 2 && (
        <div className="space-y-3">
          {/* Selected Service Pill Summary */}
          {selectedService && (
            <div className="bg-spa-50 border border-spa-200 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-spa-600 uppercase tracking-wider block">บริการที่เลือก:</span>
                <span className="font-bold text-xs text-spa-900">{selectedService.name}</span>
              </div>
              <span className="font-extrabold text-sm text-spa-700 bg-white px-3 py-1 rounded-xl border border-spa-200 shadow-sm">
                {formatCurrency(selectedService.price)} • {selectedService.duration_minutes} นาที
              </span>
            </div>
          )}

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
                      <p className="text-xs text-slate-500">พร้อมให้บริการนวดสปา</p>
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
            เลือกวันที่ต้องการจองคิว
          </h2>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="block text-xs font-semibold text-slate-700">วันที่นัดหมาย:</label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-spa-500 focus:ring-2 focus:ring-spa-200"
            />
            {bookingDate && (
              <p className="text-xs text-spa-700 font-semibold text-center bg-spa-50 py-2 rounded-xl">
                📅 วันที่เลือก: {formatThaiDate(bookingDate)}
              </p>
            )}

            <button
              disabled={!bookingDate}
              onClick={() => setStep(4)}
              className="w-full py-3 bg-spa-600 hover:bg-spa-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-1"
            >
              <span>ถัดไป: เลือกเวลานัดหมาย</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: SELECT TIME SLOT ================= */}
      {step === 4 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center">
            <Clock className="w-5 h-5 text-spa-600 mr-2" />
            เลือกรอบเวลาที่ต้องการ
          </h2>

          <div className="bg-slate-100 p-3 rounded-xl text-xs space-y-1 text-slate-700">
            <p><strong>เทอราพิส:</strong> คุณ{selectedStaff?.name}</p>
            <p><strong>บริการ:</strong> {selectedService?.name} ({selectedService?.duration_minutes} นาที)</p>
            <p><strong>วันที่:</strong> {formatThaiDate(bookingDate)}</p>
          </div>

          {loadingSlots ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-spa-600 animate-spin" />
              <p className="mt-2 text-xs text-slate-500">กำลังคำนวณรอบเวลาที่ว่างจริง...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center text-xs text-amber-800 space-y-2">
              <p className="font-bold">ไม่มีรอบเวลาว่างในวันที่เลือก</p>
              <p className="text-[11px] text-amber-700">กรุณาย้อนกลับไปเปลี่ยนวันที่ หรือเลือกเทอราพิสท่านอื่น</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => {
                    setSelectedTime(slot);
                    setStep(5);
                  }}
                  className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                    selectedTime === slot
                      ? 'bg-spa-600 text-white border-spa-700 ring-2 ring-spa-400'
                      : 'bg-white text-slate-800 hover:border-spa-400 border-slate-200'
                  }`}
                >
                  {formatTimeSlot(slot)} น.
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= STEP 5: CONFIRMATION & DETAILS ================= */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center">
            <CheckCircle2 className="w-5 h-5 text-spa-600 mr-2" />
            กรอกข้อมูลผู้จองและยืนยันนัดหมาย
          </h2>

          {/* Booking Summary Box */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 text-xs shadow-lg border border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-slate-400">บริการ:</span>
              <span className="font-bold text-spa-400 text-sm">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-slate-400">เทอราพิส:</span>
              <span className="font-bold">คุณ{selectedStaff?.name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-slate-400">วันและเวลานัดหมาย:</span>
              <span className="font-bold text-emerald-400">
                {formatThaiDate(bookingDate)} เวลา {formatTimeSlot(selectedTime)} น.
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 text-sm font-extrabold">
              <span className="text-slate-300">ค่าบริการรวม:</span>
              <span className="text-spa-gold text-base">{formatCurrency(selectedService?.price)}</span>
            </div>
          </div>

          {/* Customer Info Form */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อ-นามสกุล <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="กรอกชื่อผู้รับบริการ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:border-spa-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="08X-XXX-XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:border-spa-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
              <textarea
                placeholder="เช่น ปวดเน้นบริเวณบ่าไหล่ หรือระบุน้ำหนักการนวด"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-spa-500"
              />
            </div>

            <button
              disabled={loading || !name.trim() || !phone.trim()}
              onClick={handleSubmitBooking}
              className="w-full py-3.5 bg-spa-600 hover:bg-spa-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-xl transition-all flex items-center justify-center space-x-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>กำลังยืนยันคิว...</span>
                </>
              ) : (
                <span>ยืนยันการจองคิวออนไลน์</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 6: SUCCESS RESULT ================= */}
      {step === 6 && bookingResult && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl text-center space-y-5 my-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900">จองคิวนวดสปาสำเร็จ!</h2>
            <p className="text-xs text-slate-500">ระบบได้บันทึกคิวนัดหมายเรียบร้อยแล้ว</p>
          </div>

          <div className="bg-spa-50/70 border border-spa-200 p-4 rounded-2xl text-left space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-spa-200/60 pb-2">
              <span className="text-slate-600">หมายเลขคิว:</span>
              <span className="font-black text-base text-spa-800">
                {bookingResult.queue_number || bookingResult.queueNumber || 'Q-CONFIRMED'}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-spa-200/60 pb-2">
              <span className="text-slate-600">บริการ:</span>
              <span className="font-bold text-slate-900">
                {bookingResult.service_name || selectedService?.name}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-spa-200/60 pb-2">
              <span className="text-slate-600">วันที่นัดหมาย:</span>
              <span className="font-bold text-slate-900">
                {formatThaiDate(bookingResult.booking_date || bookingDate)}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-spa-200/60 pb-2">
              <span className="text-slate-600">เวลาที่นัดหมาย:</span>
              <span className="font-bold text-emerald-700">
                {formatTimeSlot(bookingResult.start_time || selectedTime)} น.
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 font-extrabold text-sm">
              <span className="text-slate-700">ยอดชำระหน้างาน:</span>
              <span className="text-spa-700 text-base">
                {formatCurrency(bookingResult.price !== undefined ? bookingResult.price : selectedService?.price)}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <a
              href="/liff/my-queue"
              className="block w-full py-3 bg-spa-600 hover:bg-spa-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
            >
              ดูรายการคิวของฉัน
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiffBookingPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-7 h-7 animate-spin text-spa-600" />
        <span className="mt-2 text-xs">กำลังโหลด...</span>
      </div>
    }>
      <BookingWizardContent />
    </Suspense>
  );
}
