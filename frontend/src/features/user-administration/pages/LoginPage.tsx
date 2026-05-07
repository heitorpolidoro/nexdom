import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import apiClient from "../../../api/client";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Alert, AlertDescription } from "../../../components/ui/alert";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { t } = useTranslation();
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
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      await login(response.data.access_token);
      navigate(from, { replace: true });
    } catch (err) {
      const apiError = err as { response?: { data?: { detail?: unknown } } };
      const detail = apiError.response?.data?.detail;
      if (detail === "Inactive user") {
        setError(t("login.pendingApproval"));
      } else if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(
          t("login.validationError", {
            messages: (detail as { msg: string }[])
              .map((d) => d.msg)
              .join(", "),
          }),
        );
      } else if (detail) {
        setError(JSON.stringify(detail));
      } else {
        setError(t("login.genericError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            {t("common.appName")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("common.appSubtitle")}
          </p>
        </div>

        <div className="rounded-xl border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-foreground mb-5">
            {t("login.heading")}
          </h2>

          {successMessage && (
            <Alert variant="success" className="mb-4">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">{t("login.username")}</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder={t("login.usernamePlaceholder")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm text-muted-foreground">
                {t("login.rememberMe")}
              </span>
            </label>

            <Button type="submit" disabled={isLoading} className="w-full mt-1">
              {isLoading ? t("login.submitting") : t("login.submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            {t("login.signupPrompt")}{" "}
            <Link
              to="/signup"
              className="text-primary font-medium hover:underline"
            >
              {t("login.signupLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
