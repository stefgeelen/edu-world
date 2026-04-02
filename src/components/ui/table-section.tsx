import React from 'react';

interface TableSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export function TableSection({ title, icon: Icon, color }: TableSectionProps) {
  return (
    <div className={`px-6 py-4 bg-gradient-to-r ${color} border-b-2 border-slate-100`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/90 rounded-xl flex items-center justify-center shadow-sm">
          <Icon className="w-5 h-5 text-slate-700" />
        </div>
        <h3 className="text-lg font-black text-slate-800">{title}</h3>
      </div>
    </div>
  );
}
