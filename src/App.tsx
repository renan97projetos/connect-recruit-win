import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import { BackofficeAuthProvider } from "@/contexts/BackofficeAuthContext";
import { UpgradeModalProvider } from "@/contexts/UpgradeModalContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProRouteGuard } from "@/components/ProRouteGuard";
import { BackofficeProtectedRoute } from "@/components/backoffice/BackofficeProtectedRoute";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import Home from "./pages/Home";
import Features from "./pages/Features";
import Login from "./pages/Login";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import JobDetails from "./pages/JobDetails";
import Contact from "./pages/Contact";
import CandidateDashboard from "./pages/candidate/Dashboard";
import CandidateProfile from "./pages/candidate/Profile";
import CandidateJobs from "./pages/candidate/Jobs";
import CompanyDashboard from "./pages/company/Dashboard";
import CompanyHub from "./pages/company/Hub";
import JobForm from "./pages/company/JobForm";
import JobPipeline from "./pages/company/JobPipeline";
import CandidateView from "./pages/company/CandidateView";

// SelectionProcess removed — replaced by Dashboard pipeline
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
import Permissions from "./pages/company/Permissions";
import AuditLog from "./pages/company/AuditLog";
import UploadDocuments from "./pages/UploadDocuments";

import AdminDashboard from "./pages/admin/AdminDashboard";
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
import Register from "./pages/Register";
import RegisterCompany from "./pages/RegisterCompany";
import CompanyLogin from "./pages/company/CompanyLogin";
import CompanyRegister from "./pages/company/CompanyRegister";
import CareerPage from "./pages/careers/CareerPage";
import CareerPageConfig from "./pages/company/CareerPageConfig";
import EmailTemplates from "./pages/company/EmailTemplates";

// Backoffice pages
import BackofficeLogin from "./pages/backoffice/Login";
import BackofficeDashboard from "./pages/backoffice/Dashboard";
import BackofficeTenants from "./pages/backoffice/Tenants";
import BackofficePlans from "./pages/backoffice/Plans";
import BackofficeUsers from "./pages/backoffice/Users";
import BackofficeMetrics from "./pages/backoffice/Metrics";
import BackofficeAuditLogs from "./pages/backoffice/AuditLogs";
import BackofficeSettings from "./pages/backoffice/Settings";
import Unsubscribe from "./pages/Unsubscribe";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseAuthProvider>
        <BackofficeAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <FloatingWhatsAppButton />
            <BrowserRouter>
              <UpgradeModalProvider>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/empresa/acesso" element={<CompanyLogin />} />
              <Route path="/funcionalidades" element={<Features />} />
              
              <Route path="/register" element={<Register />} />
              <Route path="/cadastro-empresa" element={<CompanyRegister />} />
              <Route path="/register-invitation" element={<RegisterInvitation />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/upload-documents/:applicationId" element={<UploadDocuments />} />
              <Route path="/candidate" element={<ProtectedRoute requiredRole="candidate"><CandidateDashboard /></ProtectedRoute>} />
              <Route path="/candidate/jobs" element={<ProtectedRoute requiredRole="candidate"><CandidateJobs /></ProtectedRoute>} />
              <Route path="/candidate/profile" element={<ProtectedRoute requiredRole="candidate"><CandidateProfile /></ProtectedRoute>} />
              <Route path="/company" element={<ProtectedRoute requiredRole="company"><CompanyHub /></ProtectedRoute>} />
              <Route path="/company/dashboard" element={<ProtectedRoute requiredRole="company"><CompanyDashboard /></ProtectedRoute>} />
              <Route path="/company/jobs/new" element={<ProtectedRoute requiredRole="company"><JobForm /></ProtectedRoute>} />
              <Route path="/company/jobs/:id/edit" element={<ProtectedRoute requiredRole="company"><JobForm /></ProtectedRoute>} />
              <Route path="/company/jobs/:id" element={<ProtectedRoute requiredRole="company"><JobPipeline /></ProtectedRoute>} />
              <Route path="/company/candidates/:id" element={<ProtectedRoute requiredRole="company"><CandidateView /></ProtectedRoute>} />
              <Route path="/company/selection-process" element={<Navigate to="/company" replace />} />
              <Route path="/company/workflow/:id" element={<ProtectedRoute requiredRole="company"><WorkflowConfiguration /></ProtectedRoute>} />
              <Route path="/company/assessments" element={<ProtectedRoute requiredRole="company"><Assessments /></ProtectedRoute>} />
              <Route path="/company/job-history" element={<ProtectedRoute requiredRole="company"><JobHistory /></ProtectedRoute>} />
              <Route path="/company/talent-pool" element={<ProtectedRoute requiredRole="company"><TalentPool /></ProtectedRoute>} />
              <Route path="/company/employees" element={<ProtectedRoute requiredRole="company"><ProRouteGuard><CompanyEmployeeManagement /></ProRouteGuard></ProtectedRoute>} />
              <Route path="/company/employees/new" element={<ProtectedRoute requiredRole="company"><ProRouteGuard><CompanyEmployeeForm /></ProRouteGuard></ProtectedRoute>} />
              <Route path="/company/employees/:id" element={<ProtectedRoute requiredRole="company"><ProRouteGuard><CompanyEmployeeDetails /></ProRouteGuard></ProtectedRoute>} />
              <Route path="/company/employees/:id/edit" element={<ProtectedRoute requiredRole="company"><ProRouteGuard><CompanyEmployeeForm /></ProRouteGuard></ProtectedRoute>} />
              <Route path="/company/employee-dashboard" element={<ProtectedRoute requiredRole="company"><ProRouteGuard><EmployeeDashboard /></ProRouteGuard></ProtectedRoute>} />
              <Route path="/company/employee-requests" element={<ProtectedRoute requiredRole="company"><ProRouteGuard><EmployeeRequests /></ProRouteGuard></ProtectedRoute>} />
              <Route path="/company/permissions" element={<ProtectedRoute requiredRole="company"><Permissions /></ProtectedRoute>} />
              <Route path="/company/audit-log" element={<ProtectedRoute requiredRole="company"><AuditLog /></ProtectedRoute>} />
              <Route path="/company/profile" element={<ProtectedRoute requiredRole="company"><CompanyProfile /></ProtectedRoute>} />
              <Route path="/company/career-page" element={<ProtectedRoute requiredRole="company"><CareerPageConfig /></ProtectedRoute>} />
              <Route path="/company/email-templates" element={<ProtectedRoute requiredRole="company"><EmailTemplates /></ProtectedRoute>} />
              <Route path="/careers/:slug" element={<CareerPage />} />
              
              <Route path="/about" element={<About />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-use" element={<TermsOfUse />} />
              <Route path="/api-docs" element={<ApiDocumentation />} />
              <Route path="/prospect-funnel" element={<ProspectFunnel />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              
              {/* Backoffice Routes */}
              <Route path="/backoffice/login" element={<BackofficeLogin />} />
              <Route path="/backoffice" element={<BackofficeProtectedRoute><BackofficeDashboard /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/dashboard" element={<BackofficeProtectedRoute><BackofficeDashboard /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/tenants" element={<BackofficeProtectedRoute><BackofficeTenants /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/plans" element={<BackofficeProtectedRoute><BackofficePlans /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/users" element={<BackofficeProtectedRoute><BackofficeUsers /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/metrics" element={<BackofficeProtectedRoute><BackofficeMetrics /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/audit-logs" element={<BackofficeProtectedRoute><BackofficeAuditLogs /></BackofficeProtectedRoute>} />
              <Route path="/backoffice/settings" element={<BackofficeProtectedRoute><BackofficeSettings /></BackofficeProtectedRoute>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </UpgradeModalProvider>
          </BrowserRouter>
        </TooltipProvider>
      </BackofficeAuthProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
  );
};

export default App;
