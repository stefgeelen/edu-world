import React, { lazy, Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { AdminRoute } from '@/components/AdminRoute';
import { ParentErrorBoundary } from '@/components/ParentErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const AdminDashboard = lazy(() => import('@/screens/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import('@/screens/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminSubscriptions = lazy(() => import('@/screens/admin/AdminSubscriptions').then(m => ({ default: m.AdminSubscriptions })));
const AdminStats = lazy(() => import('@/screens/admin/AdminStats').then(m => ({ default: m.AdminStats })));
const AdminBetaSignups = lazy(() => import('@/screens/admin/AdminBetaSignups').then(m => ({ default: m.AdminBetaSignups })));
const AdminFeedback = lazy(() => import('@/screens/admin/AdminFeedback').then(m => ({ default: m.AdminFeedback })));

export const adminRoutes = (
  <Route
    path="/admin"
    element={
      <AdminRoute>
        <ParentErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}><AdminDashboard /></Suspense>
        </ParentErrorBoundary>
      </AdminRoute>
    }
  >
    <Route index element={<Navigate to="/admin/users" replace />} />
    <Route path="users" element={<Suspense fallback={<LoadingSpinner />}><AdminUsers /></Suspense>} />
    <Route path="subscriptions" element={<Suspense fallback={<LoadingSpinner />}><AdminSubscriptions /></Suspense>} />
    <Route path="stats" element={<Suspense fallback={<LoadingSpinner />}><AdminStats /></Suspense>} />
    <Route path="beta" element={<Suspense fallback={<LoadingSpinner />}><AdminBetaSignups /></Suspense>} />
    <Route path="feedback" element={<Suspense fallback={<LoadingSpinner />}><AdminFeedback /></Suspense>} />
  </Route>
);
