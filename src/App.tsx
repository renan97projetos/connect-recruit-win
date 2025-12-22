import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import { BackofficeAuthProvider } from "@/contexts/BackofficeAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BackofficeProtectedRoute } from "@/components/backoffice/BackofficeProtectedRoute";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { initializeDemoData } from "./lib/storage";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import JobDetails from "./pages/JobDetails";
import Contact from "./pages/Contact";
import CandidateDashboard from "./pages/candidate/Dashboard";
import CandidateProfile from "./pages/candidate/Profile";
import CompanyDashboard from "./pages/company/Dashboard";
import JobForm from "./pages/company/JobForm";
import JobCandidates from "./pages/company/JobCandidates";
import SelectionProcess from "./pages/company/SelectionProcess";
import SelectionProcessDetails from "./pages/company/SelectionProcessDetails";
import WorkflowConfiguration from "./pages/company/WorkflowConfiguration";
import JobHistory from "./pages/company/JobHistory";
import Assessments from "./pages/company/Assessments";
import TalentPool from "./pages/company/TalentPool";
import CompanyEmployeeManagement from "./pages/company/EmployeeManagement";
import CompanyEmployeeForm from "./pages/company/EmployeeForm";
import CompanyEmployeeDetails from "./pages/company/EmployeeDetails";
import EmployeeDashboard from "./pages/company/EmployeeDashboard";
import EmployeeRequests from "./pages/company/EmployeeRequests";
import CompanyProfile from "./pages/company/Profile";
import JobRequests from "./pages/company/JobRequests";
import JobRequestForm from "./pages/company/JobRequestForm";
import JobRequestDetails from "./pages/company/JobRequestDetails";
import Permissions from "./pages/company/Permissions";
import UploadDocuments from "./pages/UploadDocuments";
import AdminAuth from "./pages/admin/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateJob from "./pages/admin/CreateJob";
import EmployeeManagement from "./pages/admin/EmployeeManagement";
import EmployeeForm from "./pages/admin/EmployeeForm";
import EmployeeDetails from "./pages/admin/EmployeeDetails";
import SystemSettings from "./pages/admin/SystemSettings";
import ContentManagement from "./pages/admin/ContentManagement";
import TeamManagement from "./pages/admin/TeamManagement";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import ApiDocumentation from "./pages/ApiDocumentation";
import NotFound from "./pages/NotFound";
import ProspectFunnel from "./pages/ProspectFunnel";
import RegisterInvitation from "./pages/RegisterInvitation";

// Backoffice pages
import BackofficeLogin from "./pages/backoffice/Login";
import BackofficeDashboard from "./pages/backoffice/Dashboard";
import BackofficeTenants from "./pages/backoffice/Tenants";
import BackofficePlans from "./pages/backoffice/Plans";
import BackofficeUsers from "./pages/backoffice/Users";
import BackofficeMetrics from "./pages/backoffice/Metrics";
import BackofficeAuditLogs from "./pages/backoffice/AuditLogs";
import BackofficeSettings from "./pages/backoffice/Settings";
import BackofficeJobs from "./pages/backoffice/Jobs";
import BackofficeJobForm from "./pages/backoffice/JobForm";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initializeDemoData();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseAuthProvider>
        <BackofficeAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <FloatingWhatsAppButton />
            <BrowserRouter>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-invitation" element={<RegisterInvitation />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/upload-documents/:applicationId" element={<UploadDocuments />} />
              <Route path="/candidate" element={<ProtectedRoute requiredRole="candidate"><CandidateDashboard /></ProtectedRoute>} />
              <Route path="/candidate/profile" element={<ProtectedRoute requiredRole="candidate"><CandidateProfile /></ProtectedRoute>} />
              <Route path="/company" element={<ProtectedRoute requiredRole="company"><CompanyDashboard /></ProtectedRoute>} />
              <Route path="/company/jobs/new" element={<ProtectedRoute requiredRole="company"><JobForm /></ProtectedRoute>} />
              <Route path="/company/jobs/:id/edit" element={<ProtectedRoute requiredRole="company"><JobForm /></ProtectedRoute>} />
              <Route path="/company/jobs/:id" element={<ProtectedRoute requiredRole="company"><JobCandidates /></ProtectedRoute>} />
              <Route path="/company/selection-process" element={<ProtectedRoute requiredRole="company"><SelectionProcess /></ProtectedRoute>} />
              <Route path="/company/selection-process/:id" element={<ProtectedRoute requiredRole="company"><SelectionProcessDetails /></ProtectedRoute>} />
              <Route path="/company/workflow/:id" element={<ProtectedRoute requiredRole="company"><WorkflowConfiguration /></ProtectedRoute>} />
              <Route path="/company/assessments" element={<ProtectedRoute requiredRole="company"><Assessments /></ProtectedRoute>} />
              <Route path="/company/job-history" element={<ProtectedRoute requiredRole="company"><JobHistory /></ProtectedRoute>} />
              <Route path="/company/talent-pool" element={<ProtectedRoute requiredRole="company"><TalentPool /></ProtectedRoute>} />
              <Route path="/company/employees" element={<ProtectedRoute requiredRole="company"><CompanyEmployeeManagement /></ProtectedRoute>} />
              <Route path="/company/employees/new" element={<ProtectedRoute requiredRole="company"><CompanyEmployeeForm /></ProtectedRoute>} />
              <Route path="/company/employees/:id" element={<ProtectedRoute requiredRole="company"><CompanyEmployeeDetails /></ProtectedRoute>} />
              <Route path="/company/employees/:id/edit" element={<ProtectedRoute requiredRole="company"><CompanyEmployeeForm /></ProtectedRoute>} />
              <Route path="/company/employee-dashboard" element={<ProtectedRoute requiredRole="company"><EmployeeDashboard /></ProtectedRoute>} />
              <Route path="/company/employee-requests" element={<ProtectedRoute requiredRole="company"><EmployeeRequests /></ProtectedRoute>} />
              <Route path="/company/job-requests" element={<ProtectedRoute requiredRole="company"><JobRequests /></ProtectedRoute>} />
              <Route path="/company/job-requests/new" element={<ProtectedRoute requiredRole="company"><JobRequestForm /></ProtectedRoute>} />
              <Route path="/company/job-requests/:id" element={<ProtectedRoute requiredRole="company"><JobRequestDetails /></ProtectedRoute>} />
              <Route path="/company/permissions" element={<ProtectedRoute requiredRole="company"><Permissions /></ProtectedRoute>} />
              <Route path="/company/profile" element={<ProtectedRoute requiredRole="company"><CompanyProfile /></ProtectedRoute>} />
              <Route path="/admin/auth" element={<AdminAuth />} />
              <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/jobs/new" element={<ProtectedRoute requiredRole="admin"><CreateJob /></ProtectedRoute>} />
              <Route path="/admin/employees" element={<ProtectedRoute requiredRole="admin"><EmployeeManagement /></ProtectedRoute>} />
              <Route path="/admin/employees/new" element={<ProtectedRoute requiredRole="admin"><EmployeeForm /></ProtectedRoute>} />
              <Route path="/admin/employees/:id" element={<ProtectedRoute requiredRole="admin"><EmployeeDetails /></ProtectedRoute>} />
              <Route path="/admin/employees/:id/edit" element={<ProtectedRoute requiredRole="admin"><EmployeeForm /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><SystemSettings /></ProtectedRoute>} />
              <Route path="/admin/content" element={<ProtectedRoute requiredRole="admin"><ContentManagement /></ProtectedRoute>} />
              <Route path="/admin/team" element={<ProtectedRoute requiredRole="admin"><TeamManagement /></ProtectedRoute>} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-use" element={<TermsOfUse />} />
              <Route path="/api-docs" element={<ApiDocumentation />} />
              <Route path="/prospect-funnel" element={<ProspectFunnel />} />
              
              {/* Backoffice Routes */}
              <Route path="/backoffice/login" element={<BackofficeLogin />} />
              <Route path="/backoffice/dashboard" element={<BackofficeProtectedRoute><BackofficeDashboard /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/jobs" element={<BackofficeProtectedRoute><BackofficeJobs /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/jobs/new" element={<BackofficeProtectedRoute><BackofficeJobForm /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/jobs/:id/edit" element={<BackofficeProtectedRoute><BackofficeJobForm /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/tenants" element={<BackofficeProtectedRoute><BackofficeTenants /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/plans" element={<BackofficeProtectedRoute><BackofficePlans /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/users" element={<BackofficeProtectedRoute><BackofficeUsers /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/metrics" element={<BackofficeProtectedRoute><BackofficeMetrics /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/audit-logs" element={<BackofficeProtectedRoute><BackofficeAuditLogs /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/settings" element={<BackofficeProtectedRoute><BackofficeSettings /></BackofficeProtectedRoute>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </BackofficeAuthProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
  );
};

export default App;
