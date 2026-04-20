import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, UserPlus, BookOpen, GraduationCap, Globe, Map, Code, Loader2 } from 'lucide-react';
import { Drawer } from 'vaul';
import { useGame, avatars } from '@/context/GameContext';
import type { Avatar } from '@/context/GameContext';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function AvatarSelection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setSelectedAvatar, selectedAvatar } = useGame();
  const { data: child, isLoading: childLoading } = useCurrentChild();
  const [selectedForDetails, setSelectedForDetails] = useState<Avatar | null>(null);

  // Auto-redirect to dashboard if child already has avatar
  useEffect(() => {
    if (!childLoading && child?.avatar_id) {
      navigate('/app/dashboard', { replace: true });
    }
    // No child at all → send to add-child
    if (!childLoading && !child) {
      navigate('/app/add-child', { replace: true });
    }
  }, [child, childLoading, navigate]);

  const saveAvatarMutation = useMutation({
    mutationFn: async (avatar: Avatar) => {
      if (!child?.id) throw new Error('No child');
      const { error } = await supabase
        .from('children')
        .update({ avatar_id: avatar.id, avatar_url: avatar.imageUrl })
        .eq('id', child.id);
      if (error) throw error;
      return avatar;
    },
    onSuccess: (avatar) => {
      setSelectedAvatar(avatar);
      queryClient.invalidateQueries({ queryKey: ['my-child'] });
      queryClient.invalidateQueries({ queryKey: ['parent-children'] });
      navigate('/app/dashboard');
    },
    onError: () => toast.error('Kon studiemaatje niet opslaan.'),
  });

  const handleSelect = (avatar: Avatar) => {
    saveAvatarMutation.mutate(avatar);
  };

  const getSubjectIcon = (subject: string) => {
    switch (subject.toLowerCase()) {
      case 'wiskunde': return <Code className="w-5 h-5" />;
      case 'wetenschap': return <Sparkles className="w-5 h-5" />;
      case 'taal': return <BookOpen className="w-5 h-5" />;
      case 'geschiedenis': return <Map className="w-5 h-5" />;
      case 'aardrijkskunde': return <Globe className="w-5 h-5" />;
      default: return <GraduationCap className="w-5 h-5" />;
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-900 flex flex-col p-6 md:p-12 overflow-hidden relative">
      {/* Background with futuristic/dark theme matching the characters */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
      <div className="absolute inset-0 bg-[url(https://www.transparenttextures.com/patterns/cubes.png)] opacity-5 mix-blend-overlay pointer-events-none" />
      
      {/* Animated background glowing orbs */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" 
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" 
      />

      {/* Parent Area Button */}
      <button 
        onClick={() => navigate('/app/add-child')}
        className="absolute top-6 right-6 md:top-8 md:right-8 z-50 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 text-white transition-all duration-300 flex items-center gap-2 group"
      >
        <UserPlus className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-bold hidden sm:inline-block">Ouders</span>
      </button>

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="mt-8 md:mt-12 text-center relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md shadow-sm border border-white/20 mb-4">
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
          <span className="text-xs md:text-sm font-bold text-white tracking-wide uppercase">Welkom bij EduWorld</span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          Kies je <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
            Studiemaatje
          </span>
        </h1>
      </motion.div>

      {/* Desktop/Tablet: Grid layout */}
      <div className="hidden md:flex flex-1 mt-12 items-center justify-center relative z-10 pb-12">
        <div className="flex flex-wrap justify-center gap-6 lg:gap-8 max-w-7xl px-4">
          {avatars.map((avatar, index) => {
            const isSelected = selectedAvatar?.id === avatar.id;
            return (
              <motion.div
                key={avatar.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedForDetails(avatar)}
                className={cn(
                  "w-[220px] h-[320px] rounded-[2.5rem] relative cursor-pointer group transition-all duration-300",
                  isSelected ? "shadow-2xl shadow-blue-500/40 ring-4 ring-blue-500 ring-offset-4 ring-offset-slate-900" : "shadow-xl bg-slate-800/80 hover:shadow-2xl hover:shadow-blue-500/20"
                )}
              >
                <div className={cn(
                  "absolute inset-0 rounded-[2.5rem] overflow-hidden transition-opacity duration-300 bg-gradient-to-br",
                  avatar.bgGradient
                )}>
                  <div className="absolute inset-0 bg-black/20 mix-blend-overlay z-10" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-20" />
                  <img 
                    src={avatar.imageUrl} 
                    alt={avatar.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                
                <div className="absolute inset-x-0 bottom-0 p-6 z-30 flex flex-col items-center">
                  <span className={cn("text-xs font-bold uppercase tracking-wider mb-1 drop-shadow-md", avatar.accentColor)}>
                    {avatar.subject}
                  </span>
                  <h3 className="text-2xl font-black text-center text-white drop-shadow-lg">
                    {avatar.name}
                  </h3>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Horizontal scroll layout */}
      <div className="md:hidden flex-1 mt-8 mb-4 overflow-x-auto overflow-y-visible snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative z-10">
        <div className="flex gap-6 px-6 pb-12 w-max h-full items-center">
          {avatars.map((avatar, index) => {
            const isSelected = selectedAvatar?.id === avatar.id;
            return (
              <motion.div
                key={avatar.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedForDetails(avatar)}
                className={cn(
                  "snap-center shrink-0 w-[260px] h-[380px] rounded-[2.5rem] relative cursor-pointer group transition-all duration-300",
                  isSelected ? "shadow-2xl shadow-blue-500/40 ring-4 ring-blue-500 ring-offset-4 ring-offset-slate-900" : "shadow-xl"
                )}
              >
                <div className={cn(
                  "absolute inset-0 rounded-[2.5rem] overflow-hidden bg-gradient-to-br",
                  avatar.bgGradient
                )}>
                  <div className="absolute inset-0 bg-black/20 mix-blend-overlay z-10" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-20" />
                  <img 
                    src={avatar.imageUrl} 
                    alt={avatar.name} 
                    className="w-full h-full object-cover transition-transform duration-700"
                  />
                </div>
                
                <div className="absolute inset-x-0 bottom-0 p-6 z-30 flex flex-col items-center">
                  <span className={cn("text-sm font-bold uppercase tracking-wider mb-2 drop-shadow-md", avatar.accentColor)}>
                    {avatar.subject}
                  </span>
                  <h3 className="text-3xl font-black text-center text-white drop-shadow-lg">
                    {avatar.name}
                  </h3>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Vaul Drawer for Character Details */}
      <Drawer.Root open={!!selectedForDetails} onOpenChange={(open) => !open && setSelectedForDetails(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
          <Drawer.Content className="bg-slate-900 flex flex-col rounded-t-[2.5rem] mt-24 fixed bottom-0 left-0 right-0 z-[101] max-h-[90dvh] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] border-t border-slate-800 focus:outline-none">
            {selectedForDetails && (
              <div className="flex-1 overflow-y-auto bg-slate-900 rounded-t-[2.5rem]">
                <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 my-4" />
                
                <div className="px-6 pb-6 max-w-md mx-auto">
                  {/* Hero Image */}
                  <div className={cn(
                    "w-full h-64 rounded-[2rem] overflow-hidden relative mb-6 bg-gradient-to-br shadow-xl",
                    selectedForDetails.bgGradient
                  )}>
                    <div className="absolute inset-0 bg-black/20 mix-blend-overlay z-10" />
                    <img 
                      src={selectedForDetails.imageUrl} 
                      alt={selectedForDetails.name}
                      className="w-full h-full object-cover relative z-20"
                    />
                  </div>

                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 mb-3",
                      selectedForDetails.accentColor
                    )}>
                      {getSubjectIcon(selectedForDetails.subject)}
                      <span className="text-sm font-bold uppercase tracking-wide">{selectedForDetails.subject}</span>
                    </div>
                    <Drawer.Title className="text-4xl font-black text-white mb-2">
                      {selectedForDetails.name}
                    </Drawer.Title>
                    <Drawer.Description className="text-slate-400 text-lg font-medium leading-relaxed">
                      {selectedForDetails.description}
                    </Drawer.Description>
                  </div>

                  {/* Stats/Info Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
                      <div className="text-2xl font-black text-white mb-1">XP Bonus</div>
                      <div className={cn("text-sm font-bold", selectedForDetails.accentColor)}>+20% in {selectedForDetails.subject}</div>
                    </div>
                    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
                      <div className="text-2xl font-black text-white mb-1">Niveau</div>
                      <div className={cn("text-sm font-bold", selectedForDetails.accentColor)}>Beginner</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleSelect(selectedForDetails)}
                    disabled={saveAvatarMutation.isPending}
                    className={cn(
                      "w-full h-[4.5rem] rounded-[2rem] font-extrabold text-xl flex items-center justify-center gap-3 transition-all duration-300 text-white shadow-lg active:scale-95 border-b-[6px] active:border-b-0 active:translate-y-[6px] disabled:opacity-60 disabled:cursor-wait",
                      selectedForDetails.id === 'pixel' && "bg-blue-600 hover:bg-blue-500 border-blue-800 shadow-blue-500/40",
                      selectedForDetails.id === 'zaza' && "bg-purple-600 hover:bg-purple-500 border-purple-800 shadow-purple-500/40",
                      selectedForDetails.id === 'riff' && "bg-orange-600 hover:bg-orange-500 border-orange-800 shadow-orange-500/40",
                      selectedForDetails.id === 'rocco' && "bg-green-600 hover:bg-green-500 border-green-800 shadow-green-500/40",
                      selectedForDetails.id === 'sparky' && "bg-teal-600 hover:bg-teal-500 border-teal-800 shadow-teal-500/40",
                    )}
                  >
                    {saveAvatarMutation.isPending ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        Kies {selectedForDetails.name}
                        <ArrowRight className="w-6 h-6" strokeWidth={3} />
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setSelectedForDetails(null)}
                    className="w-full mt-4 py-3 text-slate-400 font-bold hover:text-white transition-colors"
                  >
                    Terug naar overzicht
                  </button>
                </div>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
