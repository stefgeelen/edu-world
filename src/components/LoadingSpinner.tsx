import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-semibold">Laden...</p>
      </div>
    </div>
  );
}
