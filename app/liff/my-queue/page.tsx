'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getStatusConfig, formatCurrency } from '@/lib/utils/formatters';
import { formatThaiDate, formatTimeSlot } from '@/lib/utils/time';
import { Clock, Calendar, Flower2, UserCheck, XCircle, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

export default function MyQueuePage() {
  const supabase = createClient();
  const [lineUserId, setLineUserId] = useState<string>('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Reschedule Modal State
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);
  const [newDate, setNewDate] = useState<string>('');
  const [newTime, setNewTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    async function initAndFetch() {
      let lUserId = '';
      try {
        const liff = (await import('@line/liff')).default;
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (liffId) {
          await liff.init({ liffId });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            lUserId = profile.userId;
            setLineUserId(lUserId);
          }
        }
      } catch (err) {
        console.warn('LIFF init warning:', err);
      }

      fetchMyQueue(lUserId);
    }

    initAndFetch();
  }, []);

  async function fetchMyQueue(lUserId: string) {
    setLoading(true);
    try {
      // Query appointments for this line_user_id or general active list
      let query = supabase
        .from('appointments')
        .select('*, customers!inner(line_user_id, name, phone), staff(name, nickname), services(name)')
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (lUserId) {
        query = query.eq('customers.line_user_id', lUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAppointments(data || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'ไม่สามารถโหลดรายการคิวได้');
    } finally {
      setLoading(false);
    }
  }

  // Handle Cancel
  async function handleCancel(apptId: string) {
    if (!confirm('คุณต้องการยกเลิกนัดหมายนี้ใช่หรือไม่?')) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: apptId, lineUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถยกเลิกคิวได้');
      alert('ยกเลิกคิวเรียบร้อยแล้ว');
      fetchMyQueue(lineUserId);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการยกเลิกคิว');
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Fetch Reschedule Slots
  async function handleFetchNewSlots(dateStr: string) {
    setNewDate(dateStr);
    if (!selectedAppt || !dateStr) return;
    setLoadingSlots(true);
    setNewTime('');
    try {
      const res = await fetch(
        `/api/booking/available-slots?staffId=${selectedAppt.staff_id}&serviceId=${selectedAppt.service_id}&bookingDate=${dateStr}`
      );
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  }

  // Submit Reschedule
  async function handleExecuteReschedule() {
    if (!selectedAppt || !newDate || !newTime) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/booking/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selectedAppt.id,
          newBookingDate: newDate,
          newStartTime: newTime,
          lineUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถเลื่อนนัดได้');
      alert(`เลื่อนนัดสำเร็จแล้ว คิวใหม่: #${data.newQueueNumber}`);
      setShowRescheduleModal(false);
      setSelectedAppt(null);
      fetchMyQueue(lineUserId);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเลื่อนนัด');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 flex items-center">
          <Clock className="w-5 h-5 text-spa-600 mr-2" />
          คิวนวดสปาของฉัน (My Spa Queue)
        </h2>
        <button
          onClick={() => fetchMyQueue(lineUserId)}
          className="p-2 text-slate-500 hover:text-spa-700 rounded-full"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-start space-x-2 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-spa-600 animate-spin" />
          <p className="mt-2 text-xs text-slate-500">กำลังดึงข้อมูลคิวนวดสปา...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 bg-spa-50 text-spa-600 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-800">ยังไม่มีรายการคิว</h3>
          <p className="text-xs text-slate-500">คุณยังไม่ได้ทำการจองคิวนวดสปา สามารถกดจองได้เลย</p>
          <a
            href="/liff"
            className="inline-block px-5 py-2.5 bg-spa-700 hover:bg-spa-800 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            + จองคิวนวดสปาตอนนี้
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const statusCfg = getStatusConfig(appt.status);
            const isCanAction = appt.status === 'pending' || appt.status === 'confirmed';

            return (
              <div
                key={appt.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 transition-all hover:shadow-md"
              >
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <span className="font-black text-sm text-spa-900 tracking-wider">
                    #{appt.queue_number}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.badgeClass}`}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-700">
                    <Flower2 className="w-3.5 h-3.5 text-spa-600 shrink-0" />
                    <span className="font-semibold line-clamp-1">{appt.services?.name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-700">
                    <UserCheck className="w-3.5 h-3.5 text-spa-600 shrink-0" />
                    <span>คุณ{appt.staff?.name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-spa-600 shrink-0" />
                    <span>{formatThaiDate(appt.booking_date)}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-spa-600 shrink-0" />
                    <span className="font-bold text-spa-700">{formatTimeSlot(appt.start_time)}</span>
                  </div>
                </div>

                {/* Price */}
                <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">ยอดรวม:</span>
                  <span className="font-bold text-emerald-600 text-sm">{formatCurrency(appt.price)}</span>
                </div>

                {/* Action buttons if status is active */}
                {isCanAction && (
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => {
                        setSelectedAppt(appt);
                        setNewDate(appt.booking_date);
                        setShowRescheduleModal(true);
                        handleFetchNewSlots(appt.booking_date);
                      }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>เลื่อนนัด</span>
                    </button>
                    <button
                      onClick={() => handleCancel(appt.id)}
                      className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>ยกเลิกคิว</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 flex items-center">
              <RefreshCw className="w-4 h-4 text-spa-600 mr-2" />
              เลื่อนนัดหมายสปา (#{selectedAppt.queue_number})
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลือกวันที่ใหม่:</label>
                <input
                  type="date"
                  value={newDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleFetchNewSlots(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลือกเวลาใหม่:</label>
                {loadingSlots ? (
                  <p className="text-slate-500 py-2 text-center">กำลังโหลดเวลา...</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-amber-600 py-2 text-center font-medium">ไม่มีรอบเวลาว่างในวันที่นี้</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1">
                    {availableSlots.map((st) => (
                      <button
                        key={st}
                        onClick={() => setNewTime(st)}
                        className={`py-2 rounded-lg text-xs font-bold border ${
                          newTime === st
                            ? 'bg-spa-700 text-white border-spa-800'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {formatTimeSlot(st)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                ยกเลิก
              </button>
              <button
                disabled={!newDate || !newTime || actionLoading}
                onClick={handleExecuteReschedule}
                className="flex-1 py-2.5 bg-spa-700 text-white font-bold rounded-xl text-xs shadow-md disabled:bg-slate-300"
              >
                {actionLoading ? 'กำลังบันทึก...' : 'ยืนยันเลื่อนนัด'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
