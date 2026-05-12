import React, { useRef, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Star, Check, ChevronLeft } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { cn } from "@/lib/utils";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { useStageMastery, STAGE_NAMES } from "@/hooks/useStageMastery";
import { BuddyBubble } from "@/components/BuddyBubble";
import { useBuddyMessage } from "@/hooks/useBuddyMessage";
import { BuddyCompanion } from "@/components/BuddyCompanion";
import { useChildGreeting } from "@/hooks/useChildGreeting";
const TRIMESTER_CONFIG = [
  { id: 1, name: STAGE_NAMES[1], icon: "🌳", yPos: 78, xPos: 40 },
  { id: 2, name: STAGE_NAMES[2], icon: "🌊", yPos: 48, xPos: 65 },
  { id: 3, name: STAGE_NAMES[3], icon: "🦊", yPos: 18, xPos: 30 },
];

const DECORATIVE_ELEMENTS = [
  { icon: "🌲", top: "15%", left: "10%", size: "text-6xl", rotate: "-rotate-6", opacity: "opacity-40" },
  { icon: "🍄", top: "28%", left: "80%", size: "text-5xl", rotate: "rotate-12", opacity: "opacity-50" },
  { icon: "🌲", top: "48%", left: "88%", size: "text-7xl", rotate: "rotate-6", opacity: "opacity-30" },
  { icon: "✨", top: "35%", left: "15%", size: "text-3xl", rotate: "rotate-0", opacity: "opacity-60 animate-pulse" },
  { icon: "🦉", top: "5%", left: "78%", size: "text-4xl", rotate: "-rotate-12", opacity: "opacity-40" },
  { icon: "🌲", top: "78%", left: "12%", size: "text-6xl", rotate: "rotate-3", opacity: "opacity-40" },
  { icon: "🌺", top: "88%", left: "85%", size: "text-4xl", rotate: "rotate-45", opacity: "opacity-50" },
  { icon: "🦋", top: "68%", left: "20%", size: "text-3xl", rotate: "-rotate-12", opacity: "opacity-50" },
  { icon: "🌲", top: "10%", left: "30%", size: "text-5xl", rotate: "-rotate-3", opacity: "opacity-30" },
  { icon: "✨", top: "65%", left: "85%", size: "text-2xl", rotate: "rotate-0", opacity: "opacity-60 animate-pulse" },
  { icon: "🍄", top: "92%", left: "25%", size: "text-3xl", rotate: "-rotate-12", opacity: "opacity-40" },
];

function getCheckpointStatus(
  stage: number,
  stages: { stage: number; isCompleted: boolean; isCurrent: boolean; isLocked: boolean }[]
): "completed" | "current" | "locked" {
  const s = stages.find((x) => x.stage === stage);
  if (!s || s.isLocked) return "locked";
  if (s.isCompleted) return "completed";
  return "current";
}

function getButtonClass(status: "completed" | "current" | "locked") {
  if (status === "locked") return "bg-slate-700 border-b-8 border-slate-900 shadow-xl ring-4 ring-slate-600 opacity-90";
  if (status === "completed") return "bg-emerald-400 border-b-8 border-emerald-600 shadow-xl ring-4 ring-emerald-300";
  return "bg-cyan-400 border-b-8 border-cyan-600 shadow-xl ring-4 ring-white";
}


export function QuestMap() {
  const navigate = useNavigate();
  const { selectedAvatar } = useGame();
  const containerRef = useRef<HTMLDivElement>(null);
  const { stages, overallPct, child } = useStageMastery();
  const { getMessage, hasAvatar } = useBuddyMessage();
  const { childName } = useChildGreeting();

  // Buddy encouragement on mount
  const [buddyData, setBuddyData] = useState<{ message: string; mood: any; avatarUrl: string; avatarName: string } | null>(null);
  useEffect(() => {
    if (hasAvatar) {
      const result = getMessage('map_encourage');
      if (result) {
        setBuddyData({ message: result.message, mood: result.mood, avatarUrl: result.avatarUrl!, avatarName: result.avatarName });
      }
    }
  }, [hasAvatar]);

  useEffect(() => {
    if (containerRef.current) {
      const targetScroll = containerRef.current.scrollHeight * 0.3;
      setTimeout(() => {
        containerRef.current?.scrollTo({ top: targetScroll, behavior: "smooth" });
      }, 100);
    }
  }, []);

  // Build checkpoints from config + real stage mastery data
  const checkpoints = TRIMESTER_CONFIG.map((cfg) => {
    const status = getCheckpointStatus(cfg.id, stages);
    return { ...cfg, status, btnClass: getButtonClass(status), stagePath: `/app/stage/fluisterbos/${cfg.id}` };
  }).reverse(); // Render top-to-bottom (highest stage first)

  return (
    <div className="h-full w-full bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] flex flex-col relative overflow-hidden font-sans">
      {/* Starry Background (memoized) */}
      {useMemo(() => (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {[...Array(60)].map((_, i) => {
            const top = `${Math.random() * 100}%`;
            const left = `${Math.random() * 100}%`;
            const size = `${Math.random() * 4 + 1}px`;
            const anim = `pulse ${Math.random() * 2 + 2}s infinite ${Math.random() * 3}s`;
            return (
              <div key={i} className="absolute rounded-full bg-white opacity-20" style={{ top, left, width: size, height: size, animation: anim }} />
            );
          })}
        </div>
      ), [])}

      {/* Decorations */}
      {DECORATIVE_ELEMENTS.map((el, i) => (
        <div key={`deco-${i}`} className={`absolute pointer-events-none select-none ${el.size} ${el.rotate} ${el.opacity}`} style={{ top: el.top, left: el.left }}>
          {el.icon}
        </div>
      ))}

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-50 pointer-events-none w-full max-w-2xl mx-auto">
        <div className="flex flex-col gap-3 pointer-events-auto bg-[#1a103c]/80 backdrop-blur-xl rounded-3xl p-4 border-[3px] border-[#3b2d71] shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => navigate("/app/dashboard")} className="w-12 h-12 bg-[#2d1b54] rounded-full flex items-center justify-center border-b-[4px] border-[#1c1134] active:border-b-0 active:translate-y-1 transition-all flex-shrink-0 shadow-lg">
              <ChevronLeft className="w-7 h-7 text-[#9d8bce]" />
            </button>
            <div className="flex-1 flex flex-col items-center text-center px-1">
              <p className="text-[#a78bfa] text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-0.5 shadow-sm">Leerjaar {child?.grade ?? 1}</p>
              <h1 className="text-[15px] md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-md uppercase tracking-wide leading-tight">
                Het Magische Letterbos
              </h1>
            </div>
            <div className="w-14 h-14 rounded-full border-[3px] border-amber-400 overflow-hidden shadow-lg bg-[#2d1b54] flex-shrink-0 relative">
              <ImageWithFallback
                src={selectedAvatar?.imageUrlHead || "/avatars/fia_head.png"}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Progress Bar - real data */}
          <div className="px-1">
            <div className="w-full bg-[#1c1134] rounded-full h-5 border-2 border-[#3b2d71] overflow-hidden relative shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[40%] bg-white/40 rounded-t-full" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Scroll Container */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-10 pb-[110px] md:pb-[126px]">
        <div className="h-[140vh] md:h-[130vh] w-full relative pt-48 pb-32 max-w-2xl mx-auto">
          {/* Path SVG */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              d="M 40 78 C 40 65, 65 58, 65 48 C 65 38, 30 28, 30 18"
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
              transition={{ delay: index * 0.2, type: "spring", bounce: 0.5 }}
            >
              {/* Label */}
              <div className={cn("mb-3 px-4 py-1.5 rounded-2xl shadow-xl whitespace-nowrap border-2", cp.status === "locked" ? "bg-[#1c1134]/90 border-[#3b2d71]" : "bg-[#2d1b54]/90 border-[#a78bfa]/50 backdrop-blur-sm")}>
                <h3 className={cn("text-sm md:text-base font-black tracking-wide", cp.status === "locked" ? "text-[#64568f]" : "text-white drop-shadow-md")}>{cp.name}</h3>
              </div>

              {/* Button */}
              <button
                onClick={() => { if (cp.status !== "locked") navigate(cp.stagePath); }}
                className={cn(
                  "relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-200 transform-gpu",
                  cp.status !== "locked" && "hover:scale-105 active:scale-95 active:translate-y-2",
                  cp.btnClass,
                  cp.status === "current" && "animate-[bounce_3s_infinite]",
                )}
              >
                <span className="text-4xl md:text-5xl drop-shadow-md z-10">{cp.icon}</span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

                {/* Status Indicator */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 md:w-10 md:h-10 rounded-full border-[3px] border-white flex items-center justify-center shadow-lg bg-[#2d1b54] z-20">
                  {cp.status === "completed" && <Check className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" strokeWidth={4} />}
                  {cp.status === "current" && <Star className="w-5 h-5 md:w-6 md:h-6 text-amber-400 fill-amber-400" />}
                  {cp.status === "locked" && <Lock className="w-4 h-4 md:w-5 md:h-5 text-slate-400" strokeWidth={3} />}
                </div>

                {/* "You are here" tooltip */}
                {cp.status === "current" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="absolute -top-14 flex flex-col items-center z-30 pointer-events-none">
                    <div className="bg-amber-400 text-amber-900 text-[10px] md:text-xs font-black px-3 py-1.5 rounded-full shadow-lg border-2 border-white uppercase tracking-wider">Jij bent hier!</div>
                    <div className="w-3 h-3 bg-amber-400 rotate-45 -mt-2 border-r-2 border-b-2 border-white shadow-sm" />
                  </motion.div>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Buddy Encouragement */}
      {buddyData && (
        <BuddyBubble
          message={buddyData.message}
          mood={buddyData.mood}
          avatarUrl={buddyData.avatarUrl}
          avatarName={buddyData.avatarName}
          onDismiss={() => setBuddyData(null)}
        />
      )}

      {/* Persistent buddy companion */}
      <BuddyCompanion situation="quest_map_idle" position="floating-br" size={56} />
    </div>
  );
}
