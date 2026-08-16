'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Clock, Flower2, UserCheck, MapPin, Sparkles } from 'lucide-react';

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/liff', label: 'จองคิว', icon: Calendar },
    { href: '/liff/my-queue', label: 'คิวของฉัน', icon: Clock },
    { href: '/liff/services', label: 'บริการ', icon: Flower2 },
    { href: '/liff/staff', label: 'เทอราพิส', icon: UserCheck },
    { href: '/liff/contact', label: 'ติดต่อร้าน', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between max-w-md mx-auto shadow-2xl relative border-x border-slate-200 font-sans">
      {/* Mobile App Top Header */}
      <header className="bg-gradient-to-r from-spa-900 via-spa-800 to-spa-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-2">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
            <Sparkles className="w-5 h-5 text-spa-gold" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wide text-white">SPA & MASSAGE</h1>
            <p className="text-[10px] text-spa-200">LINE Spa Booking & Queue System</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 p-4">{children}</main>

      {/* Mobile App Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex justify-around items-center z-40 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/liff' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-spa-700 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-spa-100' : 'bg-transparent'}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-spa-700' : 'text-slate-500'}`} />
              </div>
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
