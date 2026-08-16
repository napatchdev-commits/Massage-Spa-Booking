'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
import { Flower2, Plus, Edit2, Clock, Loader2, Sparkles, Trash2 } from 'lucide-react';

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Service Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingSrv, setEditingSrv] = useState<any>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [duration, setDuration] = useState<string>('60');
  const [status, setStatus] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices(seed: boolean = false) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services${seed ? '?seed=true' : ''}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลได้');
      setServices(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingSrv(null);
    setName('');
    setDescription('');
    setPrice('');
    setDuration('60');
    setStatus(true);
    setShowModal(true);
  }

  function openEditModal(srv: any) {
    setEditingSrv(srv);
    setName(srv.name);
    setDescription(srv.description || '');
    setPrice(srv.price.toString());
    setDuration(srv.duration_minutes.toString());
    setStatus(srv.status);
    setShowModal(true);
  }

  async function handleSaveService() {
    if (!name.trim() || !price) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setSaving(true);
    try {
      const method = editingSrv ? 'PUT' : 'POST';
      const body = editingSrv
        ? { id: editingSrv.id, name, description, price, duration_minutes: duration, status }
        : { name, description, price, duration_minutes: duration, status };

      const res = await fetch('/api/admin/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถบันทึกข้อมูลได้');

      setShowModal(false);
      fetchServices();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกบริการ');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteService(id: string, srvName: string) {
    if (!confirm(`คุณต้องการลบบริการ "${srvName}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/admin/services?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถลบบริการได้');
      fetchServices();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบบริการ');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-white">บริการนวดสปาและราคา (Spa Services)</h1>
          <p className="text-xs text-slate-400">เพิ่ม/แก้ไข/ลบ รายการบริการสปา อัตราค่าบริการ และเวลาเปิด/ปิดจอง</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => fetchServices(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-spa-400 font-bold rounded-xl text-xs flex items-center space-x-1 border border-slate-700 shadow-md"
          >
            <Sparkles className="w-4 h-4 text-spa-gold" />
            <span>ดึงบริการตั้งต้น 6 รายการ</span>
          </button>
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-spa-600 hover:bg-spa-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มบริการนวดสปาใหม่</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-spa-500" />
          <span className="ml-2 text-xs">กำลังโหลดรายการบริการนวดสปา...</span>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-500">
          ยังไม่มีรายการบริการในระบบ กรุณากดปุ่ม "เพิ่มบริการนวดสปาใหม่" หรือ "ดึงบริการตั้งต้น 6 รายการ" ด้านบน
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((srv) => (
            <div
              key={srv.id}
              className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-extrabold text-base text-white flex items-center">
                    <Flower2 className="w-4 h-4 text-spa-400 mr-1.5 shrink-0" />
                    {srv.name}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      srv.status
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {srv.status ? 'เปิดบริการ' : 'ปิดบริการ'}
                  </span>
                </div>
                {srv.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">{srv.description}</p>
                )}
                <div className="flex items-center space-x-4 pt-1 text-xs">
                  <span className="font-extrabold text-spa-400 text-sm">
                    {formatCurrency(srv.price)}
                  </span>
                  <span className="text-slate-500 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {srv.duration_minutes} นาที
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => handleDeleteService(srv.id, srv.name)}
                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl text-xs flex items-center space-x-1 border border-rose-500/30 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>ลบ</span>
                </button>
                <button
                  onClick={() => openEditModal(srv)}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-xs flex items-center space-x-1 border border-slate-800"
                >
                  <Edit2 className="w-3.5 h-3.5 text-spa-400" />
                  <span>แก้ไขบริการ</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">
              {editingSrv ? 'แก้ไขข้อมูลบริการนวดสปา' : 'เพิ่มบริการนวดสปาใหม่'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">ชื่อบริการสปา <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  placeholder="เช่น นวดแผนไทย, นวดเท้า..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-spa-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">คำอธิบายบริการ</label>
                <textarea
                  placeholder="รายละเอียด เช่น ช่วยผ่อนคลายกล้ามเนื้อ..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-spa-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ราคา (บาท) <span className="text-rose-400">*</span></label>
                  <input
                    type="number"
                    placeholder="400"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-spa-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ระยะเวลา (นาที)</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-spa-500"
                  >
                    <option value="30">30 นาที</option>
                    <option value="45">45 นาที</option>
                    <option value="60">60 นาที</option>
                    <option value="90">90 นาที</option>
                    <option value="120">120 นาที</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="status"
                  checked={status}
                  onChange={(e) => setStatus(e.target.checked)}
                  className="w-4 h-4 accent-spa-500 rounded"
                />
                <label htmlFor="status" className="text-slate-300 font-semibold cursor-pointer">
                  เปิดให้บริการจอง
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                ยกเลิก
              </button>
              <button
                disabled={saving}
                onClick={handleSaveService}
                className="px-4 py-2 bg-spa-600 hover:bg-spa-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg flex items-center space-x-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>บันทึกข้อมูล</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
