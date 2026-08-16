'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, Calendar as CalendarIcon, Clock, Users, UserCheck, Flower2, Settings, LogOut, Sparkles } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  const menuItems = [
    { href: '/admin', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
    { href: '/admin/appointments', label: 'จัดการรายการคิวสปา', icon: Clock },
    { href: '/admin/calendar', label: 'ปฏิทินตารางคิว', icon: CalendarIcon },
    { href: '/admin/customers', label: 'ข้อมูลลูกค้า', icon: Users },
    { href: '/admin/staff', label: 'การจัดการเทอราพิส', icon: UserCheck },
    { href: '/admin/services', label: 'บริการนวดสปา & ราคา', icon: Flower2 },
    { href: '/admin/settings', label: 'ตั้งค่าระบบและร้านสปา', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar for Desktop / Header for Mobile */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center space-x-3 px-2 py-1">
            <div className="w-9 h-9 bg-spa-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 text-spa-gold" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white tracking-wide">SPA ADMIN</h2>
              <p className="text-[10px] text-slate-400">LINE Official Control Panel</p>
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-spa-700 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 mt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ (Logout)</span>
          </button>
        </div>
      </aside>

      {/* Main Admin View Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
