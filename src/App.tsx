import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AuthRedirect from "@/components/auth/AuthRedirect";

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
import AdminBulkImport from "./pages/admin/AdminBulkImport";

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
            {/* Landing - redirects to dashboard if already logged in */}
            <Route path="/" element={<AuthRedirect><Index /></AuthRedirect>} />

            {/* Auth Routes - redirect if already logged in */}
            <Route path="/admin/auth" element={<AuthRedirect><AdminAuth /></AuthRedirect>} />
            <Route path="/hod/auth" element={<AuthRedirect><HODAuth /></AuthRedirect>} />
            <Route path="/faculty/verify" element={<AuthRedirect><FacultyVerify /></AuthRedirect>} />
            <Route path="/student/verify" element={<AuthRedirect><StudentVerify /></AuthRedirect>} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/rooms" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminBlocks /></ProtectedRoute>} />
            <Route path="/admin/branches" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminBranches /></ProtectedRoute>} />
            <Route path="/admin/faculty" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminFacultyControl /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminStudentsControl /></ProtectedRoute>} />
            <Route path="/admin/exams/create" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminCreateExam /></ProtectedRoute>} />
            <Route path="/admin/exams/schedule" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminExamSchedule /></ProtectedRoute>} />
            <Route path="/admin/exams/seating-plans" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminSeatingPlans /></ProtectedRoute>} />
            <Route path="/admin-generate-seating" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminGenerateSeating /></ProtectedRoute>} />
            <Route path="/admin/operations/attendance" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminAttendanceReports /></ProtectedRoute>} />
            <Route path="/admin/operations/invigilation" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminInvigilation /></ProtectedRoute>} />
            <Route path="/admin/settings/institution" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminInstitutionSettings /></ProtectedRoute>} />
            <Route path="/admin/settings/account" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminAccountSettings /></ProtectedRoute>} />
            <Route path="/admin/settings/audit" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminAuditLogs /></ProtectedRoute>} />
            <Route path="/admin/bulk-import" element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']}><AdminBulkImport /></ProtectedRoute>} />

            {/* HOD Routes */}
            <Route path="/hod/dashboard" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODDashboard /></ProtectedRoute>} />
            <Route path="/hod/classrooms/layout" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODLayoutBuilderPage /></ProtectedRoute>} />
            <Route path="/hod/faculty" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODFacultyList /></ProtectedRoute>} />
            <Route path="/hod/students" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODStudentList /></ProtectedRoute>} />
            <Route path="/hod/students/upload" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODStudentUpload /></ProtectedRoute>} />
            <Route path="/hod/rooms" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODRooms /></ProtectedRoute>} />
            <Route path="/hod/exams/schedule" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODExamSchedule /></ProtectedRoute>} />
            <Route path="/hod/exams/seating" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODSeatingOverview /></ProtectedRoute>} />
            <Route path="/hod/operations/invigilation" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODInvigilation /></ProtectedRoute>} />
            <Route path="/hod/reports/attendance" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODAttendanceReports /></ProtectedRoute>} />
            <Route path="/hod/reports/performance" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODPerformance /></ProtectedRoute>} />
            <Route path="/hod/settings/department" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODDepartmentSettings /></ProtectedRoute>} />
            <Route path="/hod/settings/profile" element={<ProtectedRoute allowedRoles={['hod', 'HOD']}><HODProfileSettings /></ProtectedRoute>} />

            {/* Faculty Routes */}
            <Route path="/faculty/dashboard" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyDashboard /></ProtectedRoute>} />
            <Route path="/faculty/schedule" element={<ProtectedRoute allowedRoles={['faculty']}><FacultySchedule /></ProtectedRoute>} />
            <Route path="/faculty/today" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyToday /></ProtectedRoute>} />
            <Route path="/faculty/attendance" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyAttendancePage /></ProtectedRoute>} />
            <Route path="/faculty/history/duties" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyPastDuties /></ProtectedRoute>} />
            <Route path="/faculty/history/logs" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyAttendanceLogs /></ProtectedRoute>} />
            <Route path="/faculty/profile" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyProfile /></ProtectedRoute>} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/exams" element={<ProtectedRoute allowedRoles={['student']}><StudentExamsPage /></ProtectedRoute>} />
            <Route path="/student/seat-view" element={<ProtectedRoute allowedRoles={['student']}><StudentSeatViewPage /></ProtectedRoute>} />
            <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><StudentAttendancePage /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfilePage /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
