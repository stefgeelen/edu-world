import React, { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const Index = lazy(() => import('@/pages/Index'));
const Auth = lazy(() => import('@/screens/Auth').then(m => ({ default: m.Auth })));
const ResetPassword = lazy(() => import('@/screens/ResetPassword').then(m => ({ default: m.ResetPassword })));

export const publicRoutes = (
  <>
    <Route path="/" element={<Suspense fallback={<LoadingSpinner />}><Index /></Suspense>} />
    <Route path="/auth" element={<Suspense fallback={<LoadingSpinner />}><Auth /></Suspense>} />
    <Route path="/reset-password" element={<Suspense fallback={<LoadingSpinner />}><ResetPassword /></Suspense>} />
  </>
);
