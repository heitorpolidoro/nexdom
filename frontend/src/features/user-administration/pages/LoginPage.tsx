import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiClient from "../../../api/client";
import "./LoginPage.css";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";
  const successMessage = location.state?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await apiClient.post(
        `/auth/login?remember_me=${rememberMe}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      await login(response.data.access_token);
      navigate(from, { replace: true });
    } catch (err) {
      const apiError = err as { response?: { data?: { detail?: unknown } } };
      const detail = apiError.response?.data?.detail;
      if (detail === "Inactive user") {
        setError("Sua conta está aguardando aprovação de um administrador.");
      } else if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        const messages = (detail as { msg: string }[])
          .map((d) => d.msg)
          .join(", ");
        setError(`Erro: ${messages}`);
      } else if (detail) {
        setError(JSON.stringify(detail));
      } else {
        setError(
          "Ocorreu um erro ao tentar fazer login. Verifique suas credenciais.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Sigecon - Login</h2>

        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="form-group remember-me">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Mantenha-me conectado
            </label>
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="auth-footer">
          Não tem uma conta? <Link to="/signup">Cadastre-se</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
