import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Map, Trophy, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Home, path: '/app/dashboard' },
    { id: 'map', label: 'Kaart', icon: Map, path: '/app/map' },
    { id: 'progress', label: 'Voortgang', icon: TrendingUp, path: '/app/progress' },
    { id: 'badges', label: 'Badges', icon: Trophy, path: '/app/badges' },
  ];

  // Don't show tabbar on certain pages
  const hideTabBar =
    location.pathname === '/app' ||
    location.pathname === '/app/add-child' ||
    location.pathname.startsWith('/app/exercise') ||
    location.pathname.startsWith('/app/stage/');

  if (hideTabBar) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none">
      <div className="bg-white/95 backdrop-blur-md border-t border-slate-200/50 shadow-[0_-20px_40px_rgba(0,0,0,0.08)] mx-auto max-w-7xl sm:max-w-md sm:mb-4 sm:rounded-[2.5rem] rounded-t-[2rem] pointer-events-auto overflow-hidden ring-1 ring-slate-900/5">
        <div className="flex items-center justify-around h-20 md:h-24 px-4 md:px-6 w-full relative z-10">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center justify-center w-full h-full group outline-none"
              >
                <div className={cn(
                  "flex flex-col items-center gap-1.5 transition-all duration-300 transform-gpu",
                  isActive ? "-translate-y-1" : "group-hover:-translate-y-0.5"
                )}>
                  <div className={cn(
                    "p-2.5 rounded-2xl transition-all duration-300",
                    isActive ? "bg-blue-500 shadow-md shadow-blue-500/30" : "bg-transparent group-hover:bg-slate-50"
                  )}>
                    <Icon className={cn(
                      "w-6 h-6 md:w-7 md:h-7 transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[10px] md:text-xs font-bold transition-all duration-300",
                    isActive ? "text-blue-600 drop-shadow-sm scale-110" : "text-slate-400 scale-100"
                  )}>
                    {tab.label}
                  </span>
                </div>
                
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-blue-500"
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Subtle top shine */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}