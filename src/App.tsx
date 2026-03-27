import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
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
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
