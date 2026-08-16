'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, getStatusConfig } from '@/lib/utils/formatters';
import { formatThaiDate, formatTimeSlot } from '@/lib/utils/time';
import { Search, History, Loader2, MessageSquare, Trash2 } from 'lucide-react';

export default function AdminCustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // History Modal
  const [selectedCust, setSelectedCust] = useState<any>(null);
  const [custHistory, setCustHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลได้');
      setCustomers(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCustomer(id: string, name: string) {
    if (!confirm(`คุณต้องการลบข้อมูลลูกค้า "${name}" และประวัติการจองทั้งหมดใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/admin/customers?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถลบข้อมูลลูกค้าได้');
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูลลูกค้า');
    }
  }

  async function openHistoryModal(cust: any) {
    setSelectedCust(cust);
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('appointments')
        .select('*, staff(name), services(name)')
        .eq('customer_id', cust.id)
        .order('booking_date', { ascending: false });

      setCustHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.line_user_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">จัดการข้อมูลลูกค้าสปา (Customers)</h1>
        <p className="text-xs text-slate-400">รายชื่อลูกค้า การเชื่อมต่อ LINE User ID ประวัติการจองคิวนวดสปา และการลบข้อมูล</p>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center space-x-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า, เบอร์โทรศัพท์, LINE User ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-spa-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-spa-500" />
            <span className="ml-2 text-xs">กำลังโหลดข้อมูลลูกค้า...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-500">
            ยังไม่มีข้อมูลลูกค้าในระบบ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">ชื่อลูกค้า</th>
                  <th className="p-3">เบอร์โทรศัพท์</th>
                  <th className="p-3">LINE ID</th>
                  <th className="p-3">อีเมล</th>
                  <th className="p-3">จำนวนครั้งที่จอง</th>
                  <th className="p-3">ยอดรวมการใช้บริการ</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCustomers.map((cust) => {
                  const appts = cust.appointments || [];
                  const totalCount = appts.length;
                  const completedAppts = appts.filter((a: any) => a.status === 'completed');
                  const totalSpent = completedAppts.reduce((sum: number, a: any) => sum + (Number(a.price) || 0), 0);

                  return (
                    <tr key={cust.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{cust.name}</td>
                      <td className="p-3 text-slate-300 font-mono">{cust.phone || '-'}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          เชื่อมต่อแล้ว
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{cust.email || '-'}</td>
                      <td className="p-3 font-bold text-spa-400">{totalCount} ครั้ง</td>
                      <td className="p-3 font-extrabold text-emerald-400">{formatCurrency(totalSpent)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openHistoryModal(cust)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-[11px] flex items-center space-x-1"
                          >
                            <History className="w-3 h-3" />
                            <span>ดูประวัติ</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(cust.id, cust.name)}
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

      {/* History Modal */}
      {selectedCust && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">ประวัติการจองคิวนวดสปา: {selectedCust.name}</h3>
                <p className="text-xs text-slate-400">เบอร์โทร: {selectedCust.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCust(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ ปิด
              </button>
            </div>

            {loadingHistory ? (
              <p className="text-xs text-slate-400 py-6 text-center">กำลังดึงประวัติการจอง...</p>
            ) : custHistory.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">ไม่มีประวัติการจองคิว</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {custHistory.map((h) => {
                  const statusCfg = getStatusConfig(h.status);
                  return (
                    <div key={h.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-spa-400">#{h.queue_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.badgeClass}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="text-slate-300">
                        <span>บริการสปา: {h.services?.name}</span> • <span>เทอราพิส: คุณ{h.staff?.name}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                        <span>{formatThaiDate(h.booking_date)} @ {formatTimeSlot(h.start_time)}</span>
                        <span className="font-bold text-emerald-400">{formatCurrency(h.price)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
