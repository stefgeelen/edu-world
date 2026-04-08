import React, { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const AvatarSelection = lazy(() => import('@/screens/AvatarSelection').then(m => ({ default: m.AvatarSelection })));
const AddChild = lazy(() => import('@/screens/AddChild').then(m => ({ default: m.AddChild })));
const Dashboard = lazy(() => import('@/screens/Dashboard').then(m => ({ default: m.Dashboard })));
const QuestMap = lazy(() => import('@/screens/QuestMap').then(m => ({ default: m.QuestMap })));
const Fluisterbos = lazy(() => import('@/screens/Fluisterbos').then(m => ({ default: m.Fluisterbos })));
const Exercise = lazy(() => import('@/screens/Exercise').then(m => ({ default: m.Exercise })));
const ExerciseNumberBond = lazy(() => import('@/screens/ExerciseNumberBond').then(m => ({ default: m.ExerciseNumberBond })));
const ExerciseLanguage = lazy(() => import('@/screens/ExerciseLanguage').then(m => ({ default: m.ExerciseLanguage })));
const ExerciseDotCount = lazy(() => import('@/screens/ExerciseDotCount').then(m => ({ default: m.ExerciseDotCount })));
const ExerciseWriteNumber = lazy(() => import('@/screens/ExerciseWriteNumber').then(m => ({ default: m.ExerciseWriteNumber })));
const ExerciseNumberLine = lazy(() => import('@/screens/ExerciseNumberLine').then(m => ({ default: m.ExerciseNumberLine })));
const ExerciseComparison = lazy(() => import('@/screens/ExerciseComparison').then(m => ({ default: m.ExerciseComparison })));
const ExerciseWriteDigit = lazy(() => import('@/screens/ExerciseWriteDigit').then(m => ({ default: m.ExerciseWriteDigit })));
const ExerciseMoney = lazy(() => import('@/screens/ExerciseMoney').then(m => ({ default: m.ExerciseMoney })));
const ExerciseClock = lazy(() => import('@/screens/ExerciseClock').then(m => ({ default: m.ExerciseClock })));
const ExerciseSentenceDoctor = lazy(() => import('@/screens/ExerciseSentenceDoctor').then(m => ({ default: m.ExerciseSentenceDoctor })));
const ExerciseWriteLetter = lazy(() => import('@/screens/ExerciseWriteLetter').then(m => ({ default: m.ExerciseWriteLetter })));
const BadgeOverview = lazy(() => import('@/screens/BadgeOverview').then(m => ({ default: m.BadgeOverview })));
const BadgeDetail = lazy(() => import('@/screens/BadgeDetail').then(m => ({ default: m.BadgeDetail })));
const Progress = lazy(() => import('@/screens/Progress').then(m => ({ default: m.Progress })));

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
);

export const appRoutes = (
  <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
    <Route index element={<S><AvatarSelection /></S>} />
    <Route path="add-child" element={<S><AddChild /></S>} />
    <Route path="dashboard" element={<S><Dashboard /></S>} />
    <Route path="map" element={<S><QuestMap /></S>} />
    <Route path="stage/fluisterbos" element={<S><Fluisterbos /></S>} />
    <Route path="exercises/math/:id" element={<S><Exercise /></S>} />
    <Route path="exercises/bonds/:id" element={<S><ExerciseNumberBond /></S>} />
    <Route path="exercises/language/:id" element={<S><ExerciseLanguage /></S>} />
    <Route path="exercises/dots/:id" element={<S><ExerciseDotCount /></S>} />
    <Route path="exercises/write-number/:id" element={<S><ExerciseWriteNumber /></S>} />
    <Route path="exercises/number-line/:id" element={<S><ExerciseNumberLine /></S>} />
    <Route path="exercises/comparison/:id" element={<S><ExerciseComparison /></S>} />
    <Route path="exercises/write-digit/:id" element={<S><ExerciseWriteDigit /></S>} />
    <Route path="exercises/money/:id" element={<S><ExerciseMoney /></S>} />
    <Route path="exercises/clock/:id" element={<S><ExerciseClock /></S>} />
    <Route path="exercises/sentence-doctor/:id" element={<S><ExerciseSentenceDoctor /></S>} />
    <Route path="exercises/write-letter/:id" element={<S><ExerciseWriteLetter /></S>} />
    <Route path="badges" element={<S><BadgeOverview /></S>} />
    <Route path="badges/:id" element={<S><BadgeDetail /></S>} />
    <Route path="progress" element={<S><Progress /></S>} />
  </Route>
);
