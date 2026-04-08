import React, { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { InstallPrompt } from "@/components/InstallPrompt";

import { publicRoutes } from "@/routes/publicRoutes";
import { adminRoutes } from "@/routes/adminRoutes";
import { parentRoutes } from "@/routes/parentRoutes";
import { appRoutes } from "@/routes/appRoutes";

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {publicRoutes}
            {adminRoutes}
            {parentRoutes}
            {appRoutes}
            <Route path="*" element={<Suspense fallback={<LoadingSpinner />}><NotFound /></Suspense>} />
          </Routes>
          <InstallPrompt />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
