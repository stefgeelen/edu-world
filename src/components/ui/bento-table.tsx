import React from 'react';

interface BentoTableProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoTable({ children, className = '' }: BentoTableProps) {
  return (
    <div className={`bg-white rounded-3xl shadow-lg border-2 border-slate-100 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
