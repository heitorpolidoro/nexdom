import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import apiClient from "../../../api/client";
import { UserRole, useAuth } from "../context/AuthContext";
import type { User } from "../../../types/auth";
import { Link } from "react-router-dom";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Select } from "../../../components/ui/select";
import { Alert, AlertDescription } from "../../../components/ui/alert";

const AdminUserDashboard: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user: currentUser, logout } = useAuth();
  const { t } = useTranslation();

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
      setActionError(
        err.response?.data?.detail || t("admin.errorUpdatingUser"),
      );
    },
  });

  const handleToggleActive = (user: User) => {
    if (user.id === currentUser?.id) {
      setActionError(t("admin.cannotDeactivateSelf"));
      return;
    }
    updateUserMutation.mutate({
      userId: user.id,
      data: { is_active: !user.is_active },
    });
  };

  const handleRoleChange = (user: User) => {
    if (user.id === currentUser?.id) {
      setActionError(t("admin.cannotChangeOwnRole"));
      return;
    }
    const newRole =
      user.role === UserRole.ADMINISTRATOR
        ? UserRole.DIRECTOR
        : UserRole.ADMINISTRATOR;
    updateUserMutation.mutate({ userId: user.id, data: { role: newRole } });
  };

  if (isLoading)
    return (
      <div className="p-8 text-muted-foreground">{t("admin.loadingUsers")}</div>
    );
  if (error)
    return (
      <div className="p-8 text-destructive">{t("admin.errorLoadingUsers")}</div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t("admin.title")}
        </h1>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/dashboard">{t("admin.backToDashboard")}</Link>
          </Button>
          <Button variant="ghost" onClick={logout}>
            {t("common.logout")}
          </Button>
        </div>
      </div>

      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="flex items-center justify-between">
            {actionError}
            <button
              onClick={() => setActionError(null)}
              className="ml-4 text-xs hover:underline"
              aria-label={t("common.close")}
            >
              {t("common.close").toLowerCase()}
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3 mb-5">
        <label
          htmlFor="status-filter"
          className="text-sm font-medium text-muted-foreground"
        >
          {t("admin.filterByStatus")}
        </label>
        <Select
          id="status-filter"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "active" | "inactive")
          }
          className="w-44"
        >
          <option value="all">{t("admin.filterAll")}</option>
          <option value="active">{t("admin.filterActive")}</option>
          <option value="inactive">{t("admin.filterPending")}</option>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  {t("admin.colName")}
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  {t("admin.colUsername")}
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                  {t("admin.colEmail")}
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  {t("admin.colRole")}
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  {t("admin.colStatus")}
                </th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                  {t("admin.colActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr
                  key={user.id}
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {user.full_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.username}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.is_active ? "active" : "inactive"}>
                      {user.is_active
                        ? t("admin.statusActive")
                        : t("admin.statusInactive")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end flex-wrap">
                      <Button
                        size="sm"
                        variant={user.is_active ? "destructive" : "success"}
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.is_active
                          ? t("admin.deactivate")
                          : t("admin.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRoleChange(user)}
                      >
                        {user.role === UserRole.ADMINISTRATOR
                          ? t("admin.makeDirector")
                          : t("admin.makeAdministrator")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDashboard;
