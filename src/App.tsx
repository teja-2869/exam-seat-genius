import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminGenerateSeating from "./pages/AdminGenerateSeating";
import AdminBlocks from "./pages/admin/AdminBlocks";
import AdminBranches from "./pages/admin/AdminBranches";
import AdminFacultyControl from "./pages/admin/AdminFacultyControl";
import AdminStudentsControl from "./pages/admin/AdminStudentsControl";
import AdminCreateExam from "./pages/admin/AdminCreateExam";
import AdminExamSchedule from "./pages/admin/AdminExamSchedule";
import AdminSeatingPlans from "./pages/admin/AdminSeatingPlans";
import AdminAttendanceReports from "./pages/admin/AdminAttendanceReports";
import AdminInvigilation from "./pages/admin/AdminInvigilation";
import AdminInstitutionSettings from "./pages/admin/AdminInstitutionSettings";
import AdminAccountSettings from "./pages/admin/AdminAccountSettings";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";

// HOD Pages
import HODDashboard from "./pages/HODDashboard";
import HODLayoutBuilderPage from "./pages/HODLayoutBuilder";
import HODFacultyList from "./pages/hod/HODFacultyList";
import HODStudentList from "./pages/hod/HODStudentList";
import HODStudentUpload from "./pages/hod/HODStudentUpload";
import HODRooms from "./pages/hod/HODRooms";
import HODExamSchedule from "./pages/hod/HODExamSchedule";
import HODSeatingOverview from "./pages/hod/HODSeatingOverview";
import HODInvigilation from "./pages/hod/HODInvigilation";
import HODAttendanceReports from "./pages/hod/HODAttendanceReports";
import HODPerformance from "./pages/hod/HODPerformance";
import HODDepartmentSettings from "./pages/hod/HODDepartmentSettings";
import HODProfileSettings from "./pages/hod/HODProfileSettings";

// Faculty Pages
import FacultyDashboard from "./pages/FacultyDashboard";
import FacultySchedule from "./pages/faculty/FacultySchedule";
import FacultyToday from "./pages/faculty/FacultyToday";
import FacultyAttendancePage from "./pages/faculty/FacultyAttendancePage";
import FacultyPastDuties from "./pages/faculty/FacultyPastDuties";
import FacultyAttendanceLogs from "./pages/faculty/FacultyAttendanceLogs";
import FacultyProfile from "./pages/faculty/FacultyProfile";

// Student Pages
import StudentDashboard from "@/components/student/StudentDashboard";
import StudentExamsPage from "./pages/student/StudentExamsPage";
import StudentSeatViewPage from "./pages/student/StudentSeatViewPage";
import StudentAttendancePage from "./pages/student/StudentAttendancePage";
import StudentProfilePage from "./pages/student/StudentProfilePage";

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
            <Route path="/admin/rooms" element={<AdminBlocks />} />
            <Route path="/admin/branches" element={<AdminBranches />} />
            <Route path="/admin/faculty" element={<AdminFacultyControl />} />
            <Route path="/admin/students" element={<AdminStudentsControl />} />
            <Route path="/admin/exams/create" element={<AdminCreateExam />} />
            <Route path="/admin/exams/schedule" element={<AdminExamSchedule />} />
            <Route path="/admin/exams/seating-plans" element={<AdminSeatingPlans />} />
            <Route path="/admin-generate-seating" element={<AdminGenerateSeating />} />
            <Route path="/admin/operations/attendance" element={<AdminAttendanceReports />} />
            <Route path="/admin/operations/invigilation" element={<AdminInvigilation />} />
            <Route path="/admin/settings/institution" element={<AdminInstitutionSettings />} />
            <Route path="/admin/settings/account" element={<AdminAccountSettings />} />
            <Route path="/admin/settings/audit" element={<AdminAuditLogs />} />

            {/* HOD Routes */}
            <Route path="/hod/auth" element={<HODAuth />} />
            <Route path="/hod/dashboard" element={<HODDashboard />} />
            <Route path="/hod/classrooms/layout" element={<HODLayoutBuilderPage />} />
            <Route path="/hod/faculty" element={<HODFacultyList />} />
            <Route path="/hod/students" element={<HODStudentList />} />
            <Route path="/hod/students/upload" element={<HODStudentUpload />} />
            <Route path="/hod/rooms" element={<HODRooms />} />
            <Route path="/hod/exams/schedule" element={<HODExamSchedule />} />
            <Route path="/hod/exams/seating" element={<HODSeatingOverview />} />
            <Route path="/hod/operations/invigilation" element={<HODInvigilation />} />
            <Route path="/hod/reports/attendance" element={<HODAttendanceReports />} />
            <Route path="/hod/reports/performance" element={<HODPerformance />} />
            <Route path="/hod/settings/department" element={<HODDepartmentSettings />} />
            <Route path="/hod/settings/profile" element={<HODProfileSettings />} />

            {/* Faculty Routes */}
            <Route path="/faculty/verify" element={<FacultyVerify />} />
            <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
            <Route path="/faculty/schedule" element={<FacultySchedule />} />
            <Route path="/faculty/today" element={<FacultyToday />} />
            <Route path="/faculty/attendance" element={<FacultyAttendancePage />} />
            <Route path="/faculty/history/duties" element={<FacultyPastDuties />} />
            <Route path="/faculty/history/logs" element={<FacultyAttendanceLogs />} />
            <Route path="/faculty/profile" element={<FacultyProfile />} />

            {/* Student Routes */}
            <Route path="/student/verify" element={<StudentVerify />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/exams" element={<StudentExamsPage />} />
            <Route path="/student/seat-view" element={<StudentSeatViewPage />} />
            <Route path="/student/attendance" element={<StudentAttendancePage />} />
            <Route path="/student/profile" element={<StudentProfilePage />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
