import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, PawPrint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_PATHS } from '@/routes/paths';

export function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // The dashboard tab stays lit on the screens it leads to.
  const tabs = [
    { id: 'buddy', label: 'Buddy', icon: PawPrint, path: APP_PATHS.home, also: [APP_PATHS.shop] },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: APP_PATHS.dashboard, also: [APP_PATHS.practice, APP_PATHS.badges] },
  ];

  // Onboarding and the exercises themselves get the whole screen.
  const hideTabBar =
    location.pathname === APP_PATHS.start ||
    location.pathname === APP_PATHS.addChild ||
    location.pathname === APP_PATHS.chooseBuddy ||
    location.pathname.startsWith('/app/exercises');

  if (hideTabBar) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none">
      <div className="bg-gradient-to-b from-[#241650]/95 to-[#1a103c]/95 backdrop-blur-md border-t-[3px] border-amber-400/30 shadow-[0_-12px_40px_rgba(251,191,36,0.12)] mx-auto max-w-7xl sm:max-w-md sm:mb-4 sm:rounded-[2.5rem] sm:border-[3px] rounded-t-[2rem] pointer-events-auto overflow-hidden">
        <div className="flex items-center justify-around h-20 md:h-24 px-4 md:px-6 w-full relative z-10">
          {tabs.map((tab) => {
            const isActive = [tab.path, ...tab.also].some(
              (p) => location.pathname === p || location.pathname.startsWith(`${p}/`)
            );
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex flex-col items-center justify-center w-full h-full group outline-none"
              >
                <div className={cn(
                  "flex flex-col items-center gap-1.5 transition-all duration-300 transform-gpu",
                  isActive ? "-translate-y-1" : "group-hover:-translate-y-0.5"
                )}>
                  <div className={cn(
                    "p-2.5 rounded-2xl transition-all duration-300",
                    isActive ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_16px_rgba(251,191,36,0.45)]" : "bg-transparent group-hover:bg-[#0f0828]/60"
                  )}>
                    <Icon className={cn(
                      "w-6 h-6 md:w-7 md:h-7 transition-colors",
                      isActive ? "text-[#1a103c]" : "text-[#9d8bce] group-hover:text-white/80"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[10px] md:text-xs font-bold transition-all duration-300",
                    isActive ? "text-amber-300 drop-shadow-sm scale-110" : "text-[#9d8bce] scale-100"
                  )}>
                    {tab.label}
                  </span>
                </div>
                
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-amber-400"
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Subtle top shine */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}