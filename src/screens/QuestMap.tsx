import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Star, Check, ChevronLeft } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

export function QuestMap() {
  const navigate = useNavigate();
  const { selectedAvatar } = useGame();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll roughly to the current level on mount
  useEffect(() => {
    if (containerRef.current) {
      const targetScroll = containerRef.current.scrollHeight * 0.3;
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, []);

  const checkpoints = [
    { 
      id: 4, 
      name: 'Uilenkasteel', 
      status: 'locked', 
      yPos: 12, 
      xPos: 65, 
      icon: '🏰', 
      btnClass: 'bg-slate-700 border-b-8 border-slate-900 shadow-xl ring-4 ring-slate-600 opacity-90' 
    },
    { 
      id: 3, 
      name: 'Woordenwoud', 
      status: 'completed', 
      yPos: 35, 
      xPos: 25, 
      icon: '🦊', 
      btnClass: 'bg-emerald-400 border-b-8 border-emerald-600 shadow-xl ring-4 ring-emerald-300' 
    },
    { 
      id: 2, 
      name: 'Borrelende Beek', 
      status: 'current', 
      yPos: 60, 
      xPos: 50, 
      icon: '🌊', 
      btnClass: 'bg-cyan-400 border-b-8 border-cyan-600 shadow-xl ring-4 ring-white' 
    },
    { 
      id: 1, 
      name: 'Fluisterbomen', 
      status: 'completed', 
      yPos: 85, 
      xPos: 30, 
      icon: '🌳', 
      btnClass: 'bg-emerald-400 border-b-8 border-emerald-600 shadow-xl ring-4 ring-emerald-300' 
    },
  ];

  const decorativeElements = [
    { icon: '🌲', top: '15%', left: '10%', size: 'text-6xl', rotate: '-rotate-6', opacity: 'opacity-40' },
    { icon: '🍄', top: '28%', left: '80%', size: 'text-5xl', rotate: 'rotate-12', opacity: 'opacity-50' },
    { icon: '🌲', top: '48%', left: '88%', size: 'text-7xl', rotate: 'rotate-6', opacity: 'opacity-30' },
    { icon: '✨', top: '35%', left: '15%', size: 'text-3xl', rotate: 'rotate-0', opacity: 'opacity-60 animate-pulse' },
    { icon: '🦉', top: '5%', left: '78%', size: 'text-4xl', rotate: '-rotate-12', opacity: 'opacity-40' },
    { icon: '🌲', top: '78%', left: '12%', size: 'text-6xl', rotate: 'rotate-3', opacity: 'opacity-40' },
    { icon: '🌺', top: '88%', left: '85%', size: 'text-4xl', rotate: 'rotate-45', opacity: 'opacity-50' },
    { icon: '🦋', top: '68%', left: '20%', size: 'text-3xl', rotate: '-rotate-12', opacity: 'opacity-50' },
    { icon: '🌲', top: '10%', left: '30%', size: 'text-5xl', rotate: '-rotate-3', opacity: 'opacity-30' },
    { icon: '✨', top: '65%', left: '85%', size: 'text-2xl', rotate: 'rotate-0', opacity: 'opacity-60 animate-pulse' },
    { icon: '🍄', top: '92%', left: '25%', size: 'text-3xl', rotate: '-rotate-12', opacity: 'opacity-40' },
  ];

  return (
    <div className="h-full w-full bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] flex flex-col relative overflow-hidden font-sans">
      
      {/* Dynamic Starry Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              animation: `pulse ${Math.random() * 2 + 2}s infinite ${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Floating Background Decorations */}
      {decorativeElements.map((el, i) => (
        <div 
          key={`deco-${i}`} 
          className={`absolute pointer-events-none select-none ${el.size} ${el.rotate} ${el.opacity}`}
          style={{ top: el.top, left: el.left }}
        >
          {el.icon}
        </div>
      ))}

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-50 pointer-events-none w-full max-w-2xl mx-auto">
        <div className="flex flex-col gap-3 pointer-events-auto bg-[#1a103c]/80 backdrop-blur-xl rounded-3xl p-4 border-[3px] border-[#3b2d71] shadow-xl">
          
          {/* Top Row: Back button, Title, Avatar */}
          <div className="flex items-center justify-between gap-3">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="w-12 h-12 bg-[#2d1b54] rounded-full flex items-center justify-center border-b-[4px] border-[#1c1134] active:border-b-0 active:translate-y-1 transition-all flex-shrink-0 shadow-lg"
            >
              <ChevronLeft className="w-7 h-7 text-[#9d8bce]" />
            </button>
            
            <div className="flex-1 flex flex-col items-center text-center px-1">
              <p className="text-[#a78bfa] text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-0.5 shadow-sm">Level</p>
              <h1 className="text-[15px] md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-md uppercase tracking-wide leading-tight">
                Het Magische Letterbos
              </h1>
            </div>

            <div className="w-14 h-14 rounded-full border-[3px] border-amber-400 overflow-hidden shadow-lg bg-[#2d1b54] flex-shrink-0 relative">
              <ImageWithFallback 
                src={selectedAvatar?.imageUrl || "https://images.unsplash.com/photo-1561229474-1f22e022dfd4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwY2FydG9vbiUyMGF2YXRhciUyMGtpZCUyMDNkfGVufDF8fHx8MTc3NDE4OTA4MHww&ixlib=rb-4.1.0&q=80&w=1080"} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Shiny Progress Bar */}
          <div className="px-1">
            <div className="w-full bg-[#1c1134] rounded-full h-5 border-2 border-[#3b2d71] overflow-hidden relative shadow-inner">
              {/* Progress Fill */}
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '25%' }}
                transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full overflow-hidden"
              >
                {/* Shiny reflection on top half */}
                <div className="absolute top-0 left-0 right-0 h-[40%] bg-white/40 rounded-t-full" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Scroll Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-10"
      >
        <div className="h-[140vh] md:h-[130vh] w-full relative pt-48 pb-40 max-w-2xl mx-auto">
          
          {/* Winding Glowing Path SVG */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
            <motion.path 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              d="M 30 85 C 30 70, 50 75, 50 60 C 50 45, 25 50, 25 35 C 25 20, 65 25, 65 12" 
              fill="none" 
              stroke="url(#glowPath)" 
              strokeWidth="4" 
              strokeLinecap="round"
              strokeDasharray="2 6"
              className="drop-shadow-md"
            />
            <defs>
              <linearGradient id="glowPath" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="30%" stopColor="#06b6d4" />
                <stop offset="65%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>

          {/* Checkpoints */}
          {checkpoints.map((cp, index) => (
            <motion.div
              key={cp.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
              style={{ top: `${cp.yPos}%`, left: `${cp.xPos}%` }}
              initial={{ scale: 0, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2, type: 'spring', bounce: 0.5 }}
            >
              {/* Label */}
              <div className={cn(
                "mb-3 px-4 py-1.5 rounded-2xl shadow-xl whitespace-nowrap border-2",
                cp.status === 'locked' 
                  ? "bg-[#1c1134]/90 border-[#3b2d71]" 
                  : "bg-[#2d1b54]/90 border-[#a78bfa]/50 backdrop-blur-sm"
              )}>
                <h3 className={cn(
                  "text-sm md:text-base font-black tracking-wide",
                  cp.status === 'locked' ? 'text-[#64568f]' : 'text-white drop-shadow-md'
                )}>
                  {cp.name}
                </h3>
              </div>

              {/* Button */}
              <button
                onClick={() => {
                  if (cp.status !== 'locked') {
                    // Navigate to different exercise types based on ID for demo purposes
                    if (cp.id === 1) {
                      navigate(`/stage/fluisterbos`);
                    } else if (cp.id === 2) {
                      navigate(`/exercise-bonds/${cp.id}`);
                    } else if (cp.id === 3) {
                      navigate(`/exercise-lang/${cp.id}`);
                    } else {
                      navigate(`/exercise/${cp.id}`);
                    }
                  }
                }}
                className={cn(
                  "relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-200 transform-gpu",
                  cp.status !== 'locked' && "hover:scale-105 active:scale-95 active:translate-y-2",
                  cp.btnClass,
                  cp.status === 'current' && "animate-[bounce_3s_infinite]"
                )}
              >
                <span className="text-4xl md:text-5xl drop-shadow-md z-10">{cp.icon}</span>
                
                {/* Inner button shadow for 3D effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

                {/* Status Indicator */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 md:w-10 md:h-10 rounded-full border-[3px] border-white flex items-center justify-center shadow-lg bg-[#2d1b54] z-20">
                  {cp.status === 'completed' && <Check className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" strokeWidth={4} />}
                  {cp.status === 'current' && <Star className="w-5 h-5 md:w-6 md:h-6 text-amber-400 fill-amber-400" />}
                  {cp.status === 'locked' && <Lock className="w-4 h-4 md:w-5 md:h-5 text-slate-400" strokeWidth={3} />}
                </div>

                {/* "You are here" tooltip */}
                {cp.status === 'current' && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 1 }}
                     className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none"
                   >
                      <div className="bg-amber-400 text-amber-900 text-[10px] md:text-xs font-black px-3 py-1.5 rounded-full shadow-lg border-2 border-white uppercase tracking-wider whitespace-nowrap">
                         Jij bent hier!
                      </div>
                      <div className="w-3 h-3 bg-amber-400 rotate-45 -mt-2 border-r-2 border-b-2 border-white shadow-sm" />
                   </motion.div>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}