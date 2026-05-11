import React, { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ParentPinGate } from '@/components/ParentPinGate';
import { ParentErrorBoundary } from '@/components/ParentErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const ParentLayout = lazy(() => import('@/screens/parent/ParentLayout').then(m => ({ default: m.ParentLayout })));
const ParentChildren = lazy(() => import('@/screens/parent/ParentChildren').then(m => ({ default: m.ParentChildren })));
const ParentChildDetail = lazy(() => import('@/screens/parent/ParentChildDetail').then(m => ({ default: m.ParentChildDetail })));
const ParentRewards = lazy(() => import('@/screens/parent/ParentRewards').then(m => ({ default: m.ParentRewards })));
const ParentSubscription = lazy(() => import('@/screens/parent/ParentSubscription').then(m => ({ default: m.ParentSubscription })));
const ParentAddChild = lazy(() => import('@/screens/parent/ParentAddChild').then(m => ({ default: m.ParentAddChild })));
const ParentAccount = lazy(() => import('@/screens/parent/ParentAccount').then(m => ({ default: m.ParentAccount })));
const ParentFeedback = lazy(() => import('@/screens/parent/ParentFeedback').then(m => ({ default: m.ParentFeedback })));

export const parentRoutes = (
  <Route
    path="/app/parent"
    element={
      <ProtectedRoute>
        <ParentPinGate>
          <ParentErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}><ParentLayout /></Suspense>
          </ParentErrorBoundary>
        </ParentPinGate>
      </ProtectedRoute>
    }
  >
    <Route index element={<Suspense fallback={<LoadingSpinner />}><ParentChildren /></Suspense>} />
    <Route path="child/:childId" element={<Suspense fallback={<LoadingSpinner />}><ParentChildDetail /></Suspense>} />
    <Route path="rewards" element={<Suspense fallback={<LoadingSpinner />}><ParentRewards /></Suspense>} />
    <Route path="subscription" element={<Suspense fallback={<LoadingSpinner />}><ParentSubscription /></Suspense>} />
    <Route path="add-child" element={<Suspense fallback={<LoadingSpinner />}><ParentAddChild /></Suspense>} />
    <Route path="account" element={<Suspense fallback={<LoadingSpinner />}><ParentAccount /></Suspense>} />
    <Route path="feedback" element={<Suspense fallback={<LoadingSpinner />}><ParentFeedback /></Suspense>} />
  </Route>
);
