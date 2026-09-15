import React, { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Neither is needed for first paint, and both pull in framer-motion — importing
// them eagerly dragged the whole animation library into the main bundle.
const InstallPrompt = lazy(() =>
  import("@/components/InstallPrompt").then((m) => ({ default: m.InstallPrompt }))
);
const OfflineBanner = lazy(() =>
  import("@/components/OfflineBanner").then((m) => ({ default: m.OfflineBanner }))
);

import { publicRoutes } from "@/routes/publicRoutes";
import { adminRoutes } from "@/routes/adminRoutes";
import { parentRoutes } from "@/routes/parentRoutes";
import { appRoutes } from "@/routes/appRoutes";

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Read-mostly data (children, subscriptions, progress) was refetched on
      // every mount because React Query's default staleTime is 0. Mutations
      // still invalidate explicitly, so this only suppresses redundant
      // round-trips while navigating between screens.
      staleTime: 30_000,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={null}>
              <OfflineBanner />
            </Suspense>
            <Routes>
              {publicRoutes}
              {adminRoutes}
              {parentRoutes}
              {appRoutes}
              <Route path="*" element={<Suspense fallback={<LoadingSpinner />}><NotFound /></Suspense>} />
            </Routes>
            <Suspense fallback={null}>
              <InstallPrompt />
            </Suspense>
            <SpeedInsights />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
