import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { Layout } from "@/components/Layout";
import { Auth } from "@/screens/Auth";
import { ResetPassword } from "@/screens/ResetPassword";
import { AvatarSelection } from "@/screens/AvatarSelection";
import { Dashboard } from "@/screens/Dashboard";
import { QuestMap } from "@/screens/QuestMap";
import { Exercise } from "@/screens/Exercise";
import { ExerciseNumberBond } from "@/screens/ExerciseNumberBond";
import { ExerciseLanguage } from "@/screens/ExerciseLanguage";
import { BadgeOverview } from "@/screens/BadgeOverview";
import { BadgeDetail } from "@/screens/BadgeDetail";
import { Progress } from "@/screens/Progress";
import { AddChild } from "@/screens/AddChild";
import { Fluisterbos } from "@/screens/Fluisterbos";
import { ExerciseDotCount } from "@/screens/ExerciseDotCount";
import { ExerciseWriteNumber } from "@/screens/ExerciseWriteNumber";
import { ExerciseNumberLine } from "@/screens/ExerciseNumberLine";
import { ExerciseComparison } from "@/screens/ExerciseComparison";
import { ExerciseWriteDigit } from "@/screens/ExerciseWriteDigit";
import { AdminDashboard } from "@/screens/admin/AdminDashboard";
import { AdminUsers } from "@/screens/admin/AdminUsers";
import { AdminSubscriptions } from "@/screens/admin/AdminSubscriptions";
import { AdminStats } from "@/screens/admin/AdminStats";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
              <Route index element={<Navigate to="/admin/users" replace />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="stats" element={<AdminStats />} />
            </Route>

            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<AvatarSelection />} />
              <Route path="add-child" element={<AddChild />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="map" element={<QuestMap />} />
              <Route path="stage/fluisterbos" element={<Fluisterbos />} />
              <Route path="exercise/:id" element={<Exercise />} />
              <Route path="exercise-bonds/:id" element={<ExerciseNumberBond />} />
              <Route path="exercise-lang/:id" element={<ExerciseLanguage />} />
              <Route path="exercise-dots/:id" element={<ExerciseDotCount />} />
              <Route path="exercise-write/:id" element={<ExerciseWriteNumber />} />
              <Route path="exercise-numline/:id" element={<ExerciseNumberLine />} />
              <Route path="exercise-compare/:id" element={<ExerciseComparison />} />
              <Route path="exercise-write-digit/:digit" element={<ExerciseWriteDigit />} />
              <Route path="badges" element={<BadgeOverview />} />
              <Route path="badges/:id" element={<BadgeDetail />} />
              <Route path="progress" element={<Progress />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
