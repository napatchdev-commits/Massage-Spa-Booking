'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, getStatusConfig } from '@/lib/utils/formatters';
import { formatThaiDate, formatTimeSlot } from '@/lib/utils/time';
import { Calendar, Clock, DollarSign, Users, XCircle, AlertTriangle, CheckCircle2, Loader2, Flower2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    todayCount: 0,
    tomorrowCount: 0,
    totalCount: 0,
    totalRevenue: 0,
    customerCount: 0,
    cancelledCount: 0,
    noShowCount: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // 1. Today Count
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('booking_date', todayStr);

      // 2. Tomorrow Count
      const { count: tomorrowCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('booking_date', tomorrowStr);

      // 3. Total Appointments Count
      const { count: totalCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      // 4. Cancelled & No-Show Counts
      const { count: cancelledCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled');

      const { count: noShowCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'no_show');

      // 5. Total Customers
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // 6. Revenue from completed appointments
      const { data: completedAppts } = await supabase
        .from('appointments')
        .select('price')
        .eq('status', 'completed');

      const totalRevenue = (completedAppts || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);

      // 7. Recent 5 appointments
      const { data: recents } = await supabase
        .from('appointments')
        .select('*, customers(name, phone), staff(name), services(name)')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        todayCount: todayCount || 0,
        tomorrowCount: tomorrowCount || 0,
        totalCount: totalCount || 0,
        totalRevenue: totalRevenue,
        customerCount: customerCount || 0,
        cancelledCount: cancelledCount || 0,
        noShowCount: noShowCount || 0,
      });

      setRecentAppointments(recents || []);
    } catch (err) {
      console.error('Fetch stats error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-spa-500" />
        <p className="mt-2 text-xs">กำลังโหลดข้อมูลสรุปแดชบอร์ดสปา...</p>
      </div>
    );
  }

  const statCards = [
    { label: 'คิวสปาวันนี้', value: stats.todayCount, icon: Calendar, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { label: 'คิวสปาพรุ่งนี้', value: stats.tomorrowCount, icon: Clock, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { label: 'จำนวนคิวสปาทั้งหมด', value: stats.totalCount, icon: CheckCircle2, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
    { label: 'รายได้รวม (เสร็จสิ้น)', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'จำนวนลูกค้า', value: stats.customerCount, icon: Users, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    { label: 'คิวที่ยกเลิก', value: stats.cancelledCount, icon: XCircle, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { label: 'ไม่มาตามนัด (No-show)', value: stats.noShowCount, icon: AlertTriangle, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">ภาพรวมระบบนวดสปา (Dashboard Metrics)</h1>
        <p className="text-xs text-slate-400">คำนวณสดจากฐานข้อมูล Supabase (ไม่มีข้อมูลตัวอย่าง)</p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`p-4 rounded-2xl border ${card.color} flex items-center justify-between`}>
              <div>
                <p className="text-xs font-medium text-slate-400">{card.label}</p>
                <h3 className="text-xl font-black text-white mt-1">{card.value}</h3>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40">
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Appointments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center">
          <Clock className="w-4 h-4 text-spa-400 mr-2" />
          รายการจองคิวนวดสปาล่าสุด (Recent Bookings)
        </h2>

        {recentAppointments.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            ยังไม่มีรายการจองคิวในระบบ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">คิว</th>
                  <th className="p-3">ลูกค้า</th>
                  <th className="p-3">บริการสปา</th>
                  <th className="p-3">เทอราพิส</th>
                  <th className="p-3">วันที่ & เวลา</th>
                  <th className="p-3">ราคา</th>
                  <th className="p-3 rounded-r-xl">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentAppointments.map((appt) => {
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
