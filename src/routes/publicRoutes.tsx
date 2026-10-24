import React, { lazy, Suspense } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { LOGIN_PATH } from '@/routes/paths';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const Index = lazy(() => import('@/pages/Index'));
const Auth = lazy(() => import('@/screens/Auth').then(m => ({ default: m.Auth })));
const ResetPassword = lazy(() => import('@/screens/ResetPassword').then(m => ({ default: m.ResetPassword })));
const SetupParentPin = lazy(() => import('@/screens/SetupParentPin').then(m => ({ default: m.SetupParentPin })));
const SetupNotifications = lazy(() => import('@/screens/SetupNotifications').then(m => ({ default: m.SetupNotifications })));
const BetaLanding = lazy(() => import('@/screens/BetaLanding'));
const Privacy = lazy(() => import('@/screens/Privacy'));
const Terms = lazy(() => import('@/screens/Terms'));
const AuthCallback = lazy(() => import('@/screens/AuthCallback').then(m => ({ default: m.AuthCallback })));

export const publicRoutes = (
  <>
    <Route path="/" element={<Suspense fallback={<LoadingSpinner />}><Index /></Suspense>} />
    <Route path="/beta" element={<Suspense fallback={<LoadingSpinner />}><BetaLanding /></Suspense>} />
    <Route path="/privacy" element={<Suspense fallback={<LoadingSpinner />}><Privacy /></Suspense>} />
    <Route path="/voorwaarden" element={<Suspense fallback={<LoadingSpinner />}><Terms /></Suspense>} />
    <Route path={LOGIN_PATH} element={<Suspense fallback={<LoadingSpinner tone="dark" />}><Auth /></Suspense>} />
    {/* The login is not public during the beta: the old address shows the landing page. */}
    <Route path="/auth" element={<Navigate to="/" replace />} />
    <Route path="/auth/setup-pin" element={<Suspense fallback={<LoadingSpinner tone="dark" />}><SetupParentPin /></Suspense>} />
    <Route path="/auth/meldingen" element={<ProtectedRoute><Suspense fallback={<LoadingSpinner tone="dark" />}><SetupNotifications /></Suspense></ProtectedRoute>} />
    <Route path="/auth/callback" element={<Suspense fallback={<LoadingSpinner tone="dark" />}><AuthCallback /></Suspense>} />
    <Route path="/reset-password" element={<Suspense fallback={<LoadingSpinner tone="dark" />}><ResetPassword /></Suspense>} />
  </>
);
