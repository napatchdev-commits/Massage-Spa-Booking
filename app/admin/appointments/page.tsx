'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, getStatusConfig } from '@/lib/utils/formatters';
import { formatThaiDate, formatTimeSlot } from '@/lib/utils/time';
import { Clock, Search, Edit3, XCircle, CheckCircle2, Loader2, RefreshCw, Trash2 } from 'lucide-react';

export default function AdminAppointmentsPage() {
  const supabase = createClient();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Status Change Modal
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const { data: stData } = await supabase.from('staff').select('id, name');
      setStaffList(stData || []);
      await fetchAppointments();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAppointments() {
    try {
      let query = supabase
        .from('appointments')
        .select('*, customers(name, phone, line_user_id), staff(name), services(name)')
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (staffFilter !== 'all') {
        query = query.eq('staff_id', staffFilter);
      }
      if (dateFilter) {
        query = query.eq('booking_date', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.queue_number?.toLowerCase().includes(q) ||
            a.customers?.name?.toLowerCase().includes(q) ||
            a.customers?.phone?.includes(q)
        );
      }

      setAppointments(filtered);
    } catch (err) {
      console.error('Fetch appointments error:', err);
    }
  }

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, staffFilter, dateFilter, search]);

  async function handleUpdateStatus() {
    if (!selectedAppt || !newStatus) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', selectedAppt.id);

      if (error) throw error;
      alert('อัปเดตสถานะคิวนวดสปาเรียบร้อยแล้ว');
      setSelectedAppt(null);
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถอัปเดตสถานะได้');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAppointment(id: string, queueNum: string) {
    if (!confirm(`คุณต้องการลบคิวนัดหมาย #${queueNum} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/admin/appointments?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถลบคิวนัดหมายได้');
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบคิวนัดหมาย');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-white">จัดการรายการคิวสปา (Spa Appointments)</h1>
          <p className="text-xs text-slate-400">ค้นหา กรองข้อมูล เปลี่ยนสถานะ แก้ไขเวลา หรือลบคิวนัดหมายสปา</p>
        </div>
        <button
          onClick={fetchAppointments}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, เบอร์โทร, เลขคิว..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-spa-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-spa-500 font-medium"
        >
          <option value="all">-- สถานะทั้งหมด --</option>
          <option value="pending">รอรอยืนยัน (Pending)</option>
          <option value="confirmed">ยืนยันแล้ว (Confirmed)</option>
          <option value="completed">เสร็จสิ้นบริการ (Completed)</option>
          <option value="cancelled">ยกเลิกแล้ว (Cancelled)</option>
          <option value="no_show">ไม่มาตามนัด (No-Show)</option>
        </select>

        {/* Staff Filter */}
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-spa-500 font-medium"
        >
          <option value="all">-- เทอราพิสทุกคน --</option>
          {staffList.map((st) => (
            <option key={st.id} value={st.id}>
              คุณ{st.name}
            </option>
          ))}
        </select>

        {/* Date Filter */}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-spa-500 font-medium"
        />
      </div>

      {/* Appointments List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-spa-500" />
            <span className="ml-2 text-xs">กำลังค้นหารายการคิวนวดสปา...</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-500">
            ไม่พบรายการคิวที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">คิว</th>
                  <th className="p-3">ลูกค้า</th>
                  <th className="p-3">บริการสปา</th>
                  <th className="p-3">เทอราพิส</th>
                  <th className="p-3">วันที่ & เวลา</th>
                  <th className="p-3">ราคา</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {appointments.map((appt) => {
                  const statusCfg = getStatusConfig(appt.status);
                  return (
                    <tr key={appt.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-spa-400">#{appt.queue_number}</td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{appt.customers?.name || '-'}</div>
                        <div className="text-[10px] text-slate-500">{appt.customers?.phone}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-200">{appt.services?.name}</td>
                      <td className="p-3">คุณ{appt.staff?.name}</td>
                      <td className="p-3">
                        <div>{formatThaiDate(appt.booking_date)}</div>
                        <div className="text-spa-400 font-bold">{formatTimeSlot(appt.start_time)}</div>
                      </td>
                      <td className="p-3 font-bold text-emerald-400">{formatCurrency(appt.price)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.badgeClass}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedAppt(appt);
                              setNewStatus(appt.status);
                            }}
                            className="px-2.5 py-1 bg-spa-700 hover:bg-spa-600 text-white font-semibold rounded-lg text-[11px]"
                          >
                            เปลี่ยนสถานะ
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(appt.id, appt.queue_number)}
                            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-lg text-[11px] flex items-center space-x-1 border border-rose-500/30"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>ลบ</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Change Status Modal */}
      {selectedAppt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">
              อัปเดตสถานะคิว #{selectedAppt.queue_number}
            </h3>

            <div className="text-xs text-slate-400 space-y-1">
              <p>ลูกค้า: <span className="text-white font-semibold">{selectedAppt.customers?.name}</span></p>
              <p>บริการสปา: <span className="text-white font-semibold">{selectedAppt.services?.name}</span></p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-semibold">เลือกสถานะใหม่:</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold outline-none"
              >
                <option value="pending">รอรอยืนยัน (Pending)</option>
                <option value="confirmed">ยืนยันแล้ว (Confirmed)</option>
                <option value="completed">เสร็จสิ้นบริการ (Completed)</option>
                <option value="cancelled">ยกเลิกคิว (Cancelled)</option>
                <option value="no_show">ไม่มาตามนัด (No-Show)</option>
              </select>
            </div>

            <div className="flex space-x-2 pt-2 text-xs font-bold">
              <button
                onClick={() => setSelectedAppt(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                disabled={saving}
                onClick={handleUpdateStatus}
                className="flex-1 py-2.5 bg-spa-600 hover:bg-spa-500 text-white rounded-xl shadow-md"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
