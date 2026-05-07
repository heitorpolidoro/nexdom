import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../../../api/client";
import "./LoginPage.css"; // Reusing styles

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirm_password) {
      setError("As senhas não coincidem.");
      return;
    }

    if (formData.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post("/auth/signup", {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
      });

      navigate("/login", {
        state: {
          message:
            "Cadastro realizado com sucesso! Aguarde a aprovação de um administrador para acessar o sistema.",
        },
      });
    } catch (err) {
      const apiError = err as { response?: { data?: { detail?: unknown } } };
      const detail = apiError.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        const messages = (detail as { msg: string }[])
          .map((d) => d.msg)
          .join(", ");
        setError(`Erro de validação: ${messages}`);
      } else if (detail) {
        setError(JSON.stringify(detail));
      } else {
        setError(
          "Ocorreu um erro ao realizar o cadastro. Tente novamente mais tarde.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Sigecon - Cadastro</h2>

        {error && <div className="error-message">{error}</div>}
        <div
          style={{ fontSize: "0.8rem", color: "#666", marginBottom: "1rem" }}
        >
          Dica: A senha deve ter 8+ caracteres, incluindo letras, números e
          símbolos.
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="full_name">Nome Completo</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm_password">Confirmar Senha</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <div className="auth-footer">
          Já tem uma conta? <Link to="/login">Entre aqui</Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
