'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatThaiDate, formatTimeSlot } from '@/lib/utils/time';
import { getStatusConfig } from '@/lib/utils/formatters';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, UserCheck, Loader2 } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export default function AdminCalendarPage() {
  const supabase = createClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchCalendarAppointments();
  }, [selectedDate, viewMode, selectedStaffId]);

  async function fetchStaff() {
    const { data } = await supabase.from('staff').select('id, name, nickname');
    setStaffList(data || []);
  }

  async function fetchCalendarAppointments() {
    setLoading(true);
    try {
      let startDateStr = '';
      let endDateStr = '';

      if (viewMode === 'day') {
        startDateStr = format(selectedDate, 'yyyy-MM-dd');
        endDateStr = startDateStr;
      } else {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        startDateStr = format(start, 'yyyy-MM-dd');
        endDateStr = format(end, 'yyyy-MM-dd');
      }

      let query = supabase
        .from('appointments')
        .select('*, customers(name, phone), staff(name), services(name)')
        .gte('booking_date', startDateStr)
        .lte('booking_date', endDateStr)
        .order('start_time', { ascending: true });

      if (selectedStaffId !== 'all') {
        query = query.eq('staff_id', selectedStaffId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
    end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-white">ปฏิทินตารางคิวนวดสปา (Calendar View)</h1>
          <p className="text-xs text-slate-400">แสดงผังตารางเวลานัดหมายแบบรายวันและรายสัปดาห์</p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === 'day' ? 'bg-spa-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            รายวัน (Day)
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === 'week' ? 'bg-spa-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            รายสัปดาห์ (Week)
          </button>
        </div>
      </div>

      {/* Date Navigation & Staff Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSelectedDate(subDays(selectedDate, viewMode === 'day' ? 1 : 7))}
            className="p-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-extrabold text-sm text-white min-w-44 text-center">
            {viewMode === 'day'
              ? formatThaiDate(currentDateStr)
              : `${formatThaiDate(format(weekDays[0], 'yyyy-MM-dd'))} – ${formatThaiDate(format(weekDays[6], 'yyyy-MM-dd'))}`}
          </span>

          <button
            onClick={() => setSelectedDate(addDays(selectedDate, viewMode === 'day' ? 1 : 7))}
            className="p-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-2 bg-slate-800 text-slate-200 font-bold rounded-xl hover:bg-slate-700"
          >
            วันนี้
          </button>
        </div>

        {/* Staff Filter Dropdown */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <UserCheck className="w-4 h-4 text-spa-400" />
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-medium text-xs w-full sm:w-48"
          >
            <option value="all">เทอราพิสทุกคน</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                คุณ{st.name} {st.nickname ? `(${st.nickname})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar Grid Body */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-spa-500" />
          <span className="ml-2 text-xs">กำลังโหลดข้อมูลปฏิทิน...</span>
        </div>
      ) : viewMode === 'day' ? (
        /* DAY VIEW GRID */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center">
            <CalendarIcon className="w-4 h-4 text-spa-400 mr-2" />
            ตารางคิวสปาประจำวันที่ {formatThaiDate(currentDateStr)}
          </h2>

          {appointments.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              ไม่มีการจองคิวในวันนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {appointments.map((appt) => {
                const statusCfg = getStatusConfig(appt.status);
                return (
                  <div
                    key={appt.id}
                    className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="font-bold text-spa-400 text-sm">#{appt.queue_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.badgeClass}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-300">
                      <p><span className="text-slate-500">เวลา:</span> <strong className="text-white">{formatTimeSlot(appt.start_time)}</strong></p>
                      <p><span className="text-slate-500">ลูกค้า:</span> <strong className="text-white">{appt.customers?.name}</strong> ({appt.customers?.phone})</p>
                      <p><span className="text-slate-500">บริการสปา:</span> <strong className="text-slate-200">{appt.services?.name}</strong></p>
                      <p><span className="text-slate-500">เทอราพิส:</span> <strong className="text-slate-200">คุณ{appt.staff?.name}</strong></p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* WEEK VIEW GRID */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((dayDate) => {
            const dayStr = format(dayDate, 'yyyy-MM-dd');
            const dayAppts = appointments.filter((a) => a.booking_date === dayStr);
            const isToday = dayStr === format(new Date(), 'yyyy-MM-dd');

            return (
              <div
                key={dayStr}
                className={`bg-slate-900 border rounded-2xl p-3 flex flex-col min-h-64 space-y-2 ${
                  isToday ? 'border-spa-500 ring-1 ring-spa-500/50' : 'border-slate-800'
                }`}
              >
                <div className="border-b border-slate-800 pb-2 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {format(dayDate, 'EEE')}
                  </p>
                  <p className={`text-sm font-extrabold ${isToday ? 'text-spa-400' : 'text-white'}`}>
                    {format(dayDate, 'd MMM')}
                  </p>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto max-h-96">
                  {dayAppts.length === 0 ? (
                    <p className="text-[10px] text-slate-500 text-center py-4">- ไม่มีคิว -</p>
                  ) : (
                    dayAppts.map((appt) => (
                      <div
                        key={appt.id}
                        className="bg-slate-950 border border-slate-800 p-2 rounded-lg text-[11px] space-y-0.5"
                      >
                        <div className="font-bold text-spa-400">{formatTimeSlot(appt.start_time)}</div>
                        <div className="font-semibold text-white truncate">{appt.customers?.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{appt.services?.name}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
