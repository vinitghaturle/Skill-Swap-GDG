/**
 * SkillSwap Hub - Main Application
 * Entry point with routing and providers
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConvexProvider } from "convex/react";
import { convex } from "./lib/convex";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminGuard } from "./components/AdminGuard";
import { ModernLayout } from "./components/ModernLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfileSetupPage } from "./pages/ProfileSetupPage";
import { MatchesPage } from "./pages/MatchesPage";
import { MatchDetailPage } from "./pages/MatchDetailPage";
import { ChatListPage } from "./pages/ChatListPage";
import { ChatRoomPage } from "./pages/ChatRoomPage";
import { SessionsPage } from "./pages/SessionsPage";
import { VideoCallPage } from "./pages/VideoCallPage";
import { AdminPage } from "./pages/AdminPage";
import { DataManagementPage } from "./pages/DataManagementPage";

function App() {
  return (
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Pages with Modern Layout */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <ModernLayout>
                    <DashboardPage />
                  </ModernLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches"
              element={
                <ProtectedRoute>
                  <ModernLayout>
                    <MatchesPage />
                  </ModernLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches/:userId"
              element={
                <ProtectedRoute>
                  <ModernLayout>
                    <MatchDetailPage />
                  </ModernLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ModernLayout>
                    <ChatListPage />
                  </ModernLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:conversationId"
              element={
                <ProtectedRoute>
                  <ModernLayout>
                    <ChatRoomPage />
                  </ModernLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions"
              element={
                <ProtectedRoute>
                  <ModernLayout>
                    <SessionsPage />
                  </ModernLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminGuard>
                    <ModernLayout>
                      <AdminPage />
                    </ModernLayout>
                  </AdminGuard>
                </ProtectedRoute>
              }
            />

            {/* Special Pages without Layout */}
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/call/:sessionId"
              element={
                <ProtectedRoute>
                  <VideoCallPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/video-call/:sessionId"
              element={
                <ProtectedRoute>
                  <VideoCallPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/data"
              element={
                <ProtectedRoute>
                  <ModernLayout>
                    <DataManagementPage />
                  </ModernLayout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConvexProvider>
  );
}

export default App;
