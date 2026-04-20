import React from 'react';
import { Outlet } from 'react-router-dom';
import { TabBar } from './TabBar';
import { GameProvider } from '@/context/GameContext';
import { CelebrationProvider } from '@/context/CelebrationContext';

export function Layout() {
  return (
    <GameProvider>
      <CelebrationProvider>
      <div 
        className="flex flex-col bg-slate-50 relative overflow-hidden h-[100dvh]" 
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Safe Area Top */}
        <div className="flex-1 overflow-hidden relative">
          <Outlet />
        </div>

        {/* Tab Bar Navigation */}
        <TabBar />
      </div>
      </CelebrationProvider>
    </GameProvider>
  );
}