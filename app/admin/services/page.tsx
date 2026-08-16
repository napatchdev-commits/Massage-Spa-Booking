'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
import { Flower2, Plus, Edit2, Clock, Loader2, Sparkles } from 'lucide-react';

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
    } catch (err: any) {
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
    if (!name.trim() || !price || !duration) {
      alert('กรุณากรอกข้อมูลบริการสปา ราคา และระยะเวลาให้ครบถ้วน');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingSrv?.id,
        name,
        description,
        price: parseFloat(price),
        duration_minutes: parseInt(duration),
        status,
      };

      const method = editingSrv ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถบันทึกข้อมูลบริการได้');

      setShowModal(false);
      fetchServices();
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถบันทึกข้อมูลบริการได้');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-white">บริการนวดสปาและราคา (Spa Services)</h1>
          <p className="text-xs text-slate-400">เพิ่ม/แก้ไข รายการบริการสปา อัตราค่าบริการ และเวลาเปิด/ปิดจอง</p>
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
          ยังไม่มีรายการบริการในระบบ กรุณากดปุ่ม "เพิ่มบริการนวดสปาใหม่" ด้านบน
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

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => openEditModal(srv)}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-xs flex items-center space-x-1"
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
                  placeholder="เช่น นวดไทยโบราณ / นวดอโรม่าน้ำมัน"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">รายละเอียดบริการ</label>
                <textarea
                  placeholder="อธิบายรายละเอียดบริการ เช่น ช่วยคลายกล้ามเนื้อสลายความเมื่อยล้า"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ราคา (บาท) <span className="text-rose-400">*</span></label>
                  <input
                    type="number"
                    placeholder="550"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ระยะเวลา (นาที) <span className="text-rose-400">*</span></label>
                  <input
                    type="number"
                    step="15"
                    placeholder="60"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-300 font-semibold">สถานะเปิดบริการ:</span>
                <button
                  type="button"
                  onClick={() => setStatus(!status)}
                  className={`px-3 py-1.5 rounded-xl font-bold ${
                    status ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {status ? 'เปิดบริการ' : 'ปิดบริการ'}
                </button>
              </div>
            </div>

            <div className="flex space-x-2 pt-2 text-xs font-bold">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                disabled={saving}
                onClick={handleSaveService}
                className="flex-1 py-2.5 bg-spa-600 text-white rounded-xl shadow-md"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกบริการ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
