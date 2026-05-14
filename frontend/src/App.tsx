import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TaskDashboard from "./features/task-management/components/TaskDashboard";
import CategoriesPage from "./features/task-management/components/CategoriesPage";
import LoginPage from "./features/user-administration/pages/LoginPage";
import SignupPage from "./features/user-administration/pages/SignupPage";
import AdminUserDashboard from "./features/user-administration/pages/AdminUserDashboard";
import ProtectedRoute from "./features/user-administration/components/ProtectedRoute";
import { AuthProvider } from "./features/user-administration/context/AuthContext";
import Navbar from "./features/user-administration/components/Navbar";
import { UserRole } from "./types/auth";
import { AlertCircle } from "lucide-react";
import { useBackendHealth } from "./hooks/useBackendHealth";
import { useTranslation } from "react-i18next";
import "./App.css";

function App() {
  const isOffline = useBackendHealth();
  const { t } = useTranslation();

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          {isOffline && (
            <div className="fixed top-0 left-0 right-0 z-[100] p-2 bg-destructive text-destructive-foreground text-center text-xs font-bold flex items-center justify-center gap-2">
              <AlertCircle className="size-3" />
              {t("tasks.dashboard.connectionError")}
            </div>
          )}
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <TaskDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/categories"
              element={
                <ProtectedRoute>
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole={UserRole.ADMINISTRATOR}>
                  <AdminUserDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
