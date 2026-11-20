import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
// @ts-ignore
import { NotificationProvider } from '@/contexts/NotificationContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import ExploreSitesPage from '@/pages/ExploreSitesPage';
import AITripPlannerPage from '@/pages/AITripPlannerPage';
import ImmersiveExperiencesPage from '@/pages/ImmersiveExperiencesPage';
import SmartUtilitiesPage from '@/pages/SmartUtilitiesPage';
import CrowdManagementPage from '@/pages/CrowdManagementPage';
import PartnershipsPage from '@/pages/PartnershipsPage';
import DigitalArchivesPage from '@/pages/DigitalArchivesPage';
import ActivityTicketingPage from '@/pages/ActivityTicketingPage';
import TripPlannerPage from '@/pages/TripPlannerPage';
import SmartStayPage from '@/pages/SmartStayPage';
import ConservationPage from '@/pages/ConservationPage';
import WellnessPage from '@/pages/WellnessPage';
import FoodHeritagePage from '@/pages/FoodHeritagePage';
import ArtisanMarketplacePage from '@/pages/ArtisanMarketplacePage';
import CommunityPage from '@/pages/CommunityPage';
import StaffPortalPage from '@/pages/StaffPortalPage';
import TicketVerificationPage from '@/pages/TicketVerificationPage';
import ExperiencesPage from '@/pages/ExperiencesPage';
import RouteCompanion from '@/components/RouteCompanion';
import AIChatBot from '@/components/AIChatBot';
import MobileNav from '@/components/MobileNav';
// Phase 5: Post-Trip Reflection (research)
import PostTripReflectionPage from '@/pages/PostTripReflectionPage';
// Phase 17: Research Evaluation Dashboard
import EvaluationDashboardPage from '@/pages/EvaluationDashboardPage';

// AI Trip Planner Layout & Pages (from AI-TripPlanner-main)
// @ts-ignore
import Layout from '@/components/layout/Layout';
// @ts-ignore
import TripPlanner from '@/pages/TripPlanner';
// @ts-ignore
import Trips from '@/pages/Trips';
// @ts-ignore
import TripDetail from '@/pages/TripDetail';
// @ts-ignore
import AiMaps from '@/pages/AiMaps';
// @ts-ignore
import AiDashboard from '@/pages/AiDashboard';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <Routes>
                {/* Root → landing page */}
                <Route path="/" element={<LandingPage />} />

                {/* Auth pages (redirect to dashboard if already logged in) */}
                <Route path="/auth/login"    element={<AuthPage />} />
                <Route path="/auth/register" element={<AuthPage />} />
                <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/verify-email" element={<VerifyEmailPage />} />

                {/* AI Trip Planner Routes — exact UI from AI-TripPlanner-main */}
                <Route path="/trip-planner" element={<Layout showSidebar><TripPlanner /></Layout>} />
                <Route path="/trips" element={<Layout showSidebar><Trips /></Layout>} />
                <Route path="/trips/:id" element={<Layout showSidebar><TripDetail /></Layout>} />
                <Route path="/maps" element={<Layout showNavbarOnly><AiMaps /></Layout>} />
                <Route path="/explore/ai-trip-planner" element={<Layout showSidebar><TripPlanner /></Layout>} />

                {/* Protected pages */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/explore" element={<ExploreSitesPage />} />
                  <Route path="/immersive" element={<ImmersiveExperiencesPage />} />
                  <Route path="/smart-utilities" element={<SmartUtilitiesPage />} />
                  <Route path="/crowd-safety" element={<CrowdManagementPage />} />
                  <Route path="/partnerships" element={<PartnershipsPage />} />
                  <Route path="/archives" element={<DigitalArchivesPage />} />
                  <Route path="/experiences" element={<ExperiencesPage />} />
                  <Route path="/bookings" element={<ActivityTicketingPage />} />
                  <Route path="/activity" element={<ActivityTicketingPage />} />
                  <Route path="/journal-planner" element={<TripPlannerPage />} />
                  <Route path="/stay" element={<SmartStayPage />} />
                  <Route path="/conservation" element={<ConservationPage />} />
                  <Route path="/wellness" element={<WellnessPage />} />
                  <Route path="/food" element={<FoodHeritagePage />} />
                  <Route path="/artisan" element={<ArtisanMarketplacePage />} />
                  <Route path="/community" element={<CommunityPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  {/* Phase 5: Post-trip reflection (research feature) */}
                  <Route path="/reflection/:tripId" element={<PostTripReflectionPage />} />
                  {/* Phase 17: Research evaluation dashboard */}
                  <Route path="/evaluation" element={<EvaluationDashboardPage />} />
                </Route>

                {/* Staff Portal - Separate auth inside */}
                <Route path="/staff/portal" element={<StaffPortalPage />} />

                {/* Public Ticket Verification page */}
                <Route path="/verify/:ticketId" element={<TicketVerificationPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <RouteCompanion />
              <AIChatBot />
              <MobileNav />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: { background: "#1F2937", color: "#fff" },
                  success: { duration: 3000, iconTheme: { primary: "#22c55e", secondary: "#fff" } },
                  error: { duration: 5000, iconTheme: { primary: "#ef4444", secondary: "#fff" } },
                }}
              />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
  );
}
