'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserCheck, Plus, Edit2, Clock, Loader2, Calendar, AlertCircle, Trash2 } from 'lucide-react';

export default function AdminStaffPage() {
  const supabase = createClient();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add/Edit Staff Modal
  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [name, setName] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [status, setStatus] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Schedule / Break / Holiday Modal
  const [activeTabStaff, setActiveTabStaff] = useState<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  
  // Holiday form
  const [holidayDate, setHolidayDate] = useState<string>('');
  const [holidayReason, setHolidayReason] = useState<string>('');

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลได้');
      setStaffList(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingStaff(null);
    setName('');
    setNickname('');
    setPhone('');
    setStatus(true);
    setShowStaffModal(true);
  }

  function openEditModal(st: any) {
    setEditingStaff(st);
    setName(st.name);
    setNickname(st.nickname || '');
    setPhone(st.phone || '');
    setStatus(st.status);
    setShowStaffModal(true);
  }

  async function handleSaveStaff() {
    if (!name.trim()) {
      alert('กรุณาระบุชื่อเทอราพิส');
      return;
    }
    setSaving(true);
    try {
      const method = editingStaff ? 'PUT' : 'POST';
      const body = editingStaff
        ? { id: editingStaff.id, name, nickname, phone, status }
        : { name, nickname, phone, status };

      const res = await fetch('/api/admin/staff', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถบันทึกข้อมูลเทอราพิสได้');

      setShowStaffModal(false);
      fetchStaff();
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถบันทึกข้อมูลเทอราพิสได้');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStaff(id: string, name: string) {
    if (!confirm(`คุณต้องการลบข้อมูลเทอราพิส "${name}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/admin/staff?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถลบข้อมูลเทอราพิสได้');
      fetchStaff();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูลเทอราพิส');
    }
  }

  async function openScheduleManager(st: any) {
    setActiveTabStaff(st);
    setShowScheduleModal(true);
    fetchStaffScheduleDetails(st.id);
  }

  async function fetchStaffScheduleDetails(staffId: string) {
    const { data: sch } = await supabase.from('staff_schedules').select('*').eq('staff_id', staffId).order('day_of_week');
    const { data: brk } = await supabase.from('staff_breaks').select('*').eq('staff_id', staffId).order('day_of_week');
    const { data: hol } = await supabase.from('staff_holidays').select('*').eq('staff_id', staffId).order('holiday_date');

    setSchedules(sch || []);
    setBreaks(brk || []);
    setHolidays(hol || []);
  }

  async function handleToggleWorkingDay(schId: string, currentStatus: boolean) {
    await supabase.from('staff_schedules').update({ is_working: !currentStatus }).eq('id', schId);
    if (activeTabStaff) fetchStaffScheduleDetails(activeTabStaff.id);
  }

  async function handleAddHoliday() {
    if (!holidayDate || !activeTabStaff) return;
    try {
      const { error } = await supabase.from('staff_holidays').insert({
        staff_id: activeTabStaff.id,
        holiday_date: holidayDate,
        reason: holidayReason || 'วันหยุดประจำตัว',
      });
      if (error) throw error;
      setHolidayDate('');
      setHolidayReason('');
      fetchStaffScheduleDetails(activeTabStaff.id);
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถเพิ่มวันหยุดได้');
    }
  }

  async function handleDeleteHoliday(holId: string) {
    await supabase.from('staff_holidays').delete().eq('id', holId);
    if (activeTabStaff) fetchStaffScheduleDetails(activeTabStaff.id);
  }

  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-white">จัดการข้อมูลเทอราพิส (Therapists & Staff)</h1>
          <p className="text-xs text-slate-400">เพิ่ม/แก้ไขผู้ให้บริการนวดสปา กำหนดวันทำงาน เวลาพัก และวันหยุดประจำตัว</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-3.5 py-2 bg-spa-600 hover:bg-spa-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มเทอราพิสใหม่</span>
        </button>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-spa-500" />
          <span className="ml-2 text-xs">กำลังโหลดข้อมูลเทอราพิส...</span>
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-500">
          ยังไม่มีข้อมูลเทอราพิสในระบบ กรุณากดปุ่ม "เพิ่มเทอราพิสใหม่" ด้านบน
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((st) => (
            <div
              key={st.id}
              className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-spa-700/40 text-spa-300 font-black text-xl flex items-center justify-center border border-spa-500/30">
                    {st.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      คุณ{st.name} {st.nickname ? `(${st.nickname})` : ''}
                    </h3>
                    <p className="text-xs text-slate-400">{st.phone || 'ไม่ระบุเบอร์โทร'}</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    st.status
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {st.status ? 'เปิดรับคิว' : 'ปิดรับคิว'}
                </span>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => handleDeleteStaff(st.id, st.name)}
                  className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center space-x-1 border border-rose-500/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบ</span>
                </button>
                <button
                  onClick={() => openEditModal(st)}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded-xl flex items-center justify-center space-x-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>แก้ไข</span>
                </button>
                <button
                  onClick={() => openScheduleManager(st)}
                  className="flex-1 py-2 bg-spa-700/30 hover:bg-spa-700/50 text-spa-300 rounded-xl flex items-center justify-center space-x-1 border border-spa-500/30"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>ตารางงาน</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">
              {editingStaff ? 'แก้ไขข้อมูลเทอราพิส' : 'เพิ่มเทอราพิสใหม่'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">ชื่อเทอราพิส <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  placeholder="เช่น มะลิ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ชื่อเล่น</label>
                <input
                  type="text"
                  placeholder="เช่น ลิ"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  placeholder="08X-XXX-XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-300 font-semibold">สถานะการเปิดรับคิว:</span>
                <button
                  type="button"
                  onClick={() => setStatus(!status)}
                  className={`px-3 py-1.5 rounded-xl font-bold ${
                    status ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {status ? 'เปิดรับคิว' : 'ปิดรับคิว'}
                </button>
              </div>
            </div>

            <div className="flex space-x-2 pt-2 text-xs font-bold">
              <button
                onClick={() => setShowStaffModal(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                disabled={saving}
                onClick={handleSaveStaff}
                className="flex-1 py-2.5 bg-spa-600 text-white rounded-xl shadow-md"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule / Holiday Manager Modal */}
      {showScheduleModal && activeTabStaff && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">
                  ตารางทำงานและวันหยุด: คุณ{activeTabStaff.name}
                </h3>
                <p className="text-xs text-slate-400">กำหนดวันทำงาน 7 วัน และเพิ่มวันหยุดพิเศษเฉพาะวัน</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white text-xs font-bold">
                ✕ ปิด
              </button>
            </div>

            {/* Section 1: Weekly Schedule */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-spa-400 uppercase tracking-wider">
                ตารางทำงานประจำสัปดาห์ (Working Days)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {schedules.map((sc) => (
                  <div key={sc.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">{dayNames[sc.day_of_week]}</span>
                      <p className="text-[11px] text-slate-400">{sc.work_start_time.substring(0, 5)} - {sc.work_end_time.substring(0, 5)} น.</p>
                    </div>
                    <button
                      onClick={() => handleToggleWorkingDay(sc.id, sc.is_working)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        sc.is_working ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {sc.is_working ? 'ทำงาน' : 'หยุดประจำ'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Special Holidays */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-spa-400 uppercase tracking-wider">
                กำหนดวันหยุดพิเศษเฉพาะวัน (Custom Holidays)
              </h4>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-semibold outline-none"
                />
                <input
                  type="text"
                  placeholder="สาเหตุวันหยุด (เช่น ธุระส่วนตัว)"
                  value={holidayReason}
                  onChange={(e) => setHolidayReason(e.target.value)}
                  className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none"
                />
                <button
                  onClick={handleAddHoliday}
                  className="py-2 bg-spa-600 hover:bg-spa-500 text-white font-bold rounded-lg shadow-md"
                >
                  + เพิ่มวันหยุด
                </button>
              </div>

              {holidays.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {holidays.map((h) => (
                    <div key={h.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-rose-400">{h.holiday_date}</span>
                        <span className="text-slate-400 ml-2">({h.reason})</span>
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
