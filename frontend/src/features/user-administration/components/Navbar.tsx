import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "../context/AuthContext";
import "./Navbar.css";

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return null;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Sigecon
      </Link>

      <div className="navbar-links">
        <Link
          to="/dashboard"
          className={`nav-link ${location.pathname === "/dashboard" ? "active" : ""}`}
        >
          Tarefas
        </Link>

        {user?.role === UserRole.ADMINISTRADOR && (
          <Link
            to="/admin/users"
            className={`nav-link ${location.pathname === "/admin/users" ? "active" : ""}`}
          >
            Administração
          </Link>
        )}
      </div>

      <div className="user-info">
        <span className="user-name">
          {user?.full_name} ({user?.role})
        </span>
        <button onClick={logout} className="logout-btn">
          Sair
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
