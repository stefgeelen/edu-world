import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, CreditCard, BarChart3, Shield, ChevronLeft, LogOut, Sparkles, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const NAV_ITEMS = [
  { path: '/admin/users', label: 'Gebruikers', icon: Users },
  { path: '/admin/subscriptions', label: 'Abonnementen', icon: CreditCard },
  { path: '/admin/stats', label: 'Statistieken', icon: BarChart3 },
  { path: '/admin/exercises', label: 'Oefeningen', icon: BookOpen },
  { path: '/admin/beta', label: 'Beta', icon: Sparkles },
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-black text-slate-900">EduWorld Admin</h1>
          </div>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Uitloggen
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-56 bg-white border-r border-slate-200 p-4 flex-shrink-0 hidden md:block">
          <div className="space-y-1">
            {NAV_ITEMS.map(item => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-2 flex gap-2 flex-shrink-0">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
