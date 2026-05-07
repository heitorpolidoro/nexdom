import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../api/client";
import { UserRole, useAuth } from "../context/AuthContext";
import type { User } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "./AdminUserDashboard.css";

const AdminUserDashboard: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user: currentUser, logout } = useAuth();

  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users", statusFilter],
    queryFn: async () => {
      const params: Record<string, boolean> = {};
      if (statusFilter === "active") params.is_active = true;
      if (statusFilter === "inactive") params.is_active = false;

      const response = await apiClient.get<User[]>("/users/", { params });
      return response.data;
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: Partial<User>;
    }) => {
      const response = await apiClient.patch<User>(`/users/${userId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setActionError(null);
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setActionError(err.response?.data?.detail || "Erro ao atualizar usuário");
    },
  });

  const handleToggleActive = (user: User) => {
    if (user.id === currentUser?.id) {
      setActionError("Você não pode desativar sua própria conta.");
      return;
    }
    updateUserMutation.mutate({
      userId: user.id,
      data: { is_active: !user.is_active },
    });
  };

  const handleRoleChange = (user: User) => {
    if (user.id === currentUser?.id) {
      setActionError("Você não pode alterar seu próprio cargo.");
      return;
    }
    const newRole =
      user.role === UserRole.ADMINISTRADOR
        ? UserRole.DIRETOR
        : UserRole.ADMINISTRADOR;
    updateUserMutation.mutate({
      userId: user.id,
      data: { role: newRole },
    });
  };

  if (isLoading)
    return <div className="admin-container">Carregando usuários...</div>;
  if (error)
    return <div className="admin-container">Erro ao carregar usuários.</div>;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Gerenciamento de Usuários</h1>
        <div className="header-actions">
          <Link to="/dashboard" className="action-btn">
            Voltar ao Dashboard
          </Link>
          <button onClick={logout} className="action-btn">
            Sair
          </button>
        </div>
      </header>

      {actionError && (
        <div className="error-message" role="alert">
          {actionError}
          <button onClick={() => setActionError(null)} aria-label="Fechar">
            ×
          </button>
        </div>
      )}

      <section className="filters">
        <div className="filter-group">
          <label htmlFor="status">Filtrar por Status:</label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "inactive")
            }
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos (Pendentes)</option>
          </select>
        </div>
      </section>

      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Cargo</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <span className="role-badge">{user.role}</span>
                </td>
                <td>
                  <span
                    className={`status-badge ${user.is_active ? "status-active" : "status-inactive"}`}
                  >
                    {user.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="actions-cell">
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={`action-btn ${user.is_active ? "deactivate" : "approve"}`}
                  >
                    {user.is_active ? "Desativar" : "Aprovar"}
                  </button>
                  <button
                    onClick={() => handleRoleChange(user)}
                    className="action-btn"
                  >
                    Mudar p/{" "}
                    {user.role === UserRole.ADMINISTRADOR
                      ? "Diretor"
                      : "Administrador"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUserDashboard;
