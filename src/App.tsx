import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import TeacherLayout from "./layouts/TeacherLayout";
import AdminLayout from "./layouts/AdminLayout";
import Grades from "./pages/teacher/Grades";
import Schedule from "./pages/teacher/Schedule";
import Homework from "./pages/teacher/Homework";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import AdminSubjects from "./pages/admin/Subjects";
import AdminWorkTypes from "./pages/admin/WorkTypes";
import AdminReports from "./pages/admin/Reports";
import AdminClasses from "./pages/admin/Classes";
import AdminClassDetail from "./pages/admin/ClassDetail";
import AdminAcademicCalendar from "./pages/admin/AcademicCalendar";
import AdminAccessControl from "./pages/admin/AccessControl";
import DisplaySettings from "./pages/admin/DisplaySettings";
import AdminTeachers from "./pages/admin/Teachers";
import AdminAdmins from "./pages/admin/Admins";
import AdminStudents from "./pages/admin/Students";
import NotFound from "./pages/NotFound";
import AdminRequests from "./pages/admin/Requests";
import AdminClassAccounts from "./pages/admin/ClassAccounts";
import DiaryLayout from "./layouts/DiaryLayout";
import DiaryStudentLayout from "./layouts/DiaryStudentLayout";
import DiaryLogin from "./pages/diary/Login";
import DiarySelectStudent from "./pages/diary/SelectStudent";
import DiaryGrades from "./pages/diary/Grades";
import DiaryProfile from "./pages/diary/Profile";
import DiarySchool from "./pages/diary/School";
import DiarySubject from "./pages/diary/Subject";
import DiaryGradeDetail from "./pages/diary/GradeDetail";
import DiaryComingSoon from "./pages/diary/ComingSoon";
import DiarySchedule from "./pages/diary/Schedule";
import DiaryDaybook from "./pages/diary/Daybook";
import DiaryTasks from "./pages/diary/Tasks";
import DiaryHomeworkDetail from "./pages/diary/HomeworkDetail";
import { LayoutGrid } from "lucide-react";
import Maintenance from "./pages/Maintenance";

const queryClient = new QueryClient();

const isDiaryHost = (() => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host.startsWith("diary.") || host.startsWith("diary-");
})();


const DiaryOnlyRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/diary" replace />} />
    <Route path="/login" element={<Navigate to="/diary/login" replace />} />
    <Route path="/diary/login" element={<DiaryLogin />} />
    <Route path="/diary" element={<DiaryLayout />}>
      <Route index element={<Navigate to="/diary/select" replace />} />
      <Route path="select" element={<DiarySelectStudent />} />
      <Route path="student" element={<DiaryStudentLayout />}>
        <Route index element={<Navigate to="/diary/student/schedule" replace />} />
        <Route path="schedule" element={<DiarySchedule />} />
        <Route path="daybook" element={<DiaryDaybook />} />
        <Route path="grades" element={<DiaryGrades />} />
        <Route path="profile" element={<DiaryProfile />} />
        <Route path="subject/:subjectId" element={<DiarySubject />} />
        <Route path="grade/:gradeId" element={<DiaryGradeDetail />} />
        <Route path="tasks" element={<DiaryTasks />} />
        <Route path="homework/:homeworkId" element={<DiaryHomeworkDetail />} />
        <Route path="school" element={<DiarySchool />} />
      </Route>
    </Route>
    <Route path="/teacher/*" element={<Navigate to="/diary" replace />} />
    <Route path="/admin/*" element={<Navigate to="/diary" replace />} />
    <Route path="*" element={<Navigate to="/diary" replace />} />
  </Routes>
);

const MainRoutes = () => (
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/login" element={<Login />} />

    <Route path="/teacher" element={<TeacherLayout />}>
      <Route index element={<Navigate to="/teacher/grades" replace />} />
      <Route path="grades" element={<Grades />} />
      <Route path="schedule" element={<Schedule />} />
      <Route path="homework" element={<Homework />} />
      <Route path="profile" element={<TeacherProfile />} />
    </Route>

    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<Navigate to="/admin/classes" replace />} />
      <Route path="classes" element={<AdminClasses />} />
      <Route path="classes/:id" element={<AdminClassDetail />} />
      <Route path="students" element={<AdminStudents />} />
      <Route path="teachers" element={<AdminTeachers />} />
      <Route path="admins" element={<AdminAdmins />} />
      <Route path="subjects" element={<AdminSubjects />} />
      <Route path="work-types" element={<AdminWorkTypes />} />
      <Route path="calendar" element={<AdminAcademicCalendar />} />
      <Route path="access" element={<AdminAccessControl />} />
      <Route path="display" element={<DisplaySettings />} />
      <Route path="reports" element={<AdminReports />} />
      <Route path="requests" element={<AdminRequests />} />
      <Route path="class-accounts" element={<AdminClassAccounts />} />
    </Route>

    <Route path="/diary/login" element={<DiaryLogin />} />
    <Route path="/diary" element={<DiaryLayout />}>
      <Route index element={<Navigate to="/diary/select" replace />} />
      <Route path="select" element={<DiarySelectStudent />} />
      <Route path="student" element={<DiaryStudentLayout />}>
        <Route index element={<Navigate to="/diary/student/schedule" replace />} />
        <Route path="schedule" element={<DiarySchedule />} />
        <Route path="daybook" element={<DiaryDaybook />} />
        <Route path="grades" element={<DiaryGrades />} />
        <Route path="profile" element={<DiaryProfile />} />
        <Route path="subject/:subjectId" element={<DiarySubject />} />
        <Route path="grade/:gradeId" element={<DiaryGradeDetail />} />
        <Route path="tasks" element={<DiaryTasks />} />
        <Route path="homework/:homeworkId" element={<DiaryHomeworkDetail />} />
        <Route path="school" element={<DiarySchool />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

// Временная мера отключена: сайт снова открыт для всех
const MAINTENANCE_MODE = false;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {MAINTENANCE_MODE ? (
        <Maintenance>
          <BrowserRouter>
            {isDiaryHost ? <DiaryOnlyRoutes /> : <MainRoutes />}
          </BrowserRouter>
        </Maintenance>
      ) : (
        <BrowserRouter>
          {isDiaryHost ? <DiaryOnlyRoutes /> : <MainRoutes />}
        </BrowserRouter>
      )}
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
