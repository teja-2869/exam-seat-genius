import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminGenerateSeating from "./pages/AdminGenerateSeating";
import HODDashboard from "./pages/HODDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import StudentDashboard from "@/components/student/StudentDashboard";
import StudentSeatView from "@/components/student/StudentSeatView";
import StudentAttendance from "@/components/student/StudentAttendance";
import StudentProfile from "@/components/student/StudentProfile";

// Auth Components
import { AdminAuth } from "@/components/auth/AdminAuth";
import { HODAuth } from "@/components/auth/HODAuth";
import { FacultyVerify } from "@/components/auth/FacultyVerify";
import { StudentVerify } from "@/components/auth/StudentVerify";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Landing */}
            <Route path="/" element={<Index />} />

            {/* Admin Routes */}
            <Route path="/admin/auth" element={<AdminAuth />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin-generate-seating" element={<AdminGenerateSeating />} />

            {/* HOD Routes */}
            <Route path="/hod/auth" element={<HODAuth />} />
            <Route path="/hod/dashboard" element={<HODDashboard />} />

            {/* Faculty Routes */}
            <Route path="/faculty/verify" element={<FacultyVerify />} />
            <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
            <Route path="/faculty/schedule" element={<FacultyDashboard />} />
            <Route path="/faculty/today" element={<FacultyDashboard />} />
            <Route path="/faculty/attendance" element={<FacultyDashboard />} />
            <Route path="/faculty/history/duties" element={<FacultyDashboard />} />
            <Route path="/faculty/history/logs" element={<FacultyDashboard />} />
            <Route path="/faculty/profile" element={<FacultyDashboard />} />

            {/* Student Routes */}
            <Route path="/student/verify" element={<StudentVerify />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/exams" element={<StudentDashboard />} />
            <Route path="/student/seat-view" element={<StudentSeatView />} />
            <Route path="/student/attendance" element={<StudentAttendance />} />
            <Route path="/student/profile" element={<StudentProfile />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
