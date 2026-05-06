import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Gift, CreditCard, LogOut, ChevronRight, Shield, KeyRound, Lock, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { parentPinSession } from '@/hooks/useParentPin';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { path: '/app/parent', label: 'Kinderen', icon: Users, exact: true },
  { path: '/app/parent/rewards', label: 'Beloningen', icon: Gift },
  { path: '/app/parent/subscription', label: 'Abonnement', icon: CreditCard },
  { path: '/app/parent/account', label: 'Account', icon: UserCog },
];

export function ParentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 pt-10 pb-4 flex-shrink-0 shadow-sm">
        <div className="max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Ouderportaal</p>
              <h1 className="font-black text-xl text-slate-900">EduWorld</h1>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="p-2.5 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200"
                  title="Admin panel"
                >
                  <Shield className="w-5 h-5 text-indigo-600" />
                </button>
              )}
              <button
                onClick={() => navigate('/auth/setup-pin?change=1&redirect=/app/parent')}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
                title="Toegangscode wijzigen"
              >
                <KeyRound className="w-5 h-5 text-blue-600" />
              </button>
              <button
                onClick={() => {
                  parentPinSession.lock();
                  toast.success('Ouderportaal vergrendeld');
                  navigate('/app/dashboard');
                }}
                className="p-2.5 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200"
                title="Vergrendelen"
              >
                <Lock className="w-5 h-5 text-amber-600" />
              </button>
              <button
                onClick={async () => {
                  parentPinSession.lock();
                  await supabase.auth.signOut();
                  navigate('/auth');
                }}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                title="Uitloggen"
              >
                <LogOut className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
                    active
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
