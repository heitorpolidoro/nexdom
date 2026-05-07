import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TaskDashboard from "./features/task-management/components/TaskDashboard";
import LoginPage from "./features/user-administration/pages/LoginPage";
import SignupPage from "./features/user-administration/pages/SignupPage";
import AdminUserDashboard from "./features/user-administration/pages/AdminUserDashboard";
import ProtectedRoute from "./features/user-administration/components/ProtectedRoute";
import Navbar from "./features/user-administration/components/Navbar";
import {
  AuthProvider,
  UserRole,
} from "./features/user-administration/context/AuthContext";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
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
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole={UserRole.ADMINISTRADOR}>
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
