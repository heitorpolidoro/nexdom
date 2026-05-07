import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { TaskPriority, TaskStatus } from "../types";
import type { TaskRead, TaskCreate, TaskUpdate } from "../types";
import { useCreateTask, useUpdateTask } from "../hooks/useTasks";
import { useUsers } from "../../../hooks/useUsers";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Select } from "../../../components/ui/select";
import { Label } from "../../../components/ui/label";
import { Alert, AlertDescription } from "../../../components/ui/alert";

interface TaskFormProps {
  task?: TaskRead;
  onSuccess: () => void;
  onCancel: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ task, onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const isEditing = !!task;
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const { data: users } = useUsers();

  const isLoading =
    createTaskMutation.isPending || updateTaskMutation.isPending;
  const serverError = createTaskMutation.error || updateTaskMutation.error;

  const defaultValues = {
    title: "",
    description: "",
    priority: TaskPriority.MEDIUM,
    assigned_to_id: "",
    due_date: "",
    status: TaskStatus.PENDING,
  };

  const transforms: Record<string, (value: unknown) => unknown> = {
    title: (v) => v,
    description: (v) => v || "",
    priority: (v) => v,
    assigned_to_id: (v) => v || "",
    due_date: (v) =>
      v ? new Date(v as string).toISOString().split("T")[0] : "",
    status: (v) => v,
  };

  const getInitialState = () => {
    const initial: Record<string, unknown> = {};
    (Object.keys(defaultValues) as Array<keyof typeof defaultValues>).forEach(
      (key) => {
        const value = task ? task[key as keyof TaskRead] : defaultValues[key];
        initial[key] = transforms[key](value);
      },
    );
    return initial;
  };

  const [formData, setFormData] = useState(getInitialState());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!(formData.title as string).trim())
      newErrors.title = t("tasks.form.titleRequired");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const commonData = {
      title: formData.title as string,
      description: (formData.description as string) || null,
      priority: formData.priority as TaskPriority,
      due_date: formData.due_date
        ? new Date(formData.due_date as string)
        : null,
      assigned_to_id: (formData.assigned_to_id as string) || null,
    };

    if (isEditing && task) {
      const updatePayload: TaskUpdate = {
        ...commonData,
        status: formData.status as TaskStatus,
      };
      updateTaskMutation.mutate(
        { id: task.id, data: updatePayload },
        { onSuccess },
      );
    } else {
      createTaskMutation.mutate(commonData as TaskCreate, { onSuccess });
    }
  };

  const submitText = isLoading
    ? t("tasks.form.submitSaving")
    : isEditing
      ? t("tasks.form.submitEdit")
      : t("tasks.form.submitCreate");

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t("tasks.details.statusPending"),
      IN_PROGRESS: t("tasks.details.statusInProgress"),
      COMPLETED: t("tasks.details.statusCompleted"),
      CANCELED: t("tasks.details.statusCanceled"),
    };
    return map[status] || status;
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-5">
        {isEditing ? t("tasks.form.editTitle") : t("tasks.form.newTitle")}
      </h2>

      {serverError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {(serverError as { response?: { data?: { detail?: string } } })
              .response?.data?.detail || t("tasks.form.errorSaving")}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">{t("tasks.form.titleLabel")}</Label>
          <Input
            id="title"
            name="title"
            value={formData.title as string}
            onChange={handleChange}
            disabled={isLoading}
            placeholder={t("tasks.form.titlePlaceholder")}
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">
            {t("tasks.form.descriptionLabel")}
          </Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description as string}
            onChange={handleChange}
            disabled={isLoading}
            placeholder={t("tasks.form.descriptionPlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priority">{t("tasks.form.priorityLabel")}</Label>
          <Select
            id="priority"
            name="priority"
            value={formData.priority as string}
            onChange={handleChange}
            disabled={isLoading}
          >
            {Object.values(TaskPriority).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>

        {isEditing && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">{t("tasks.form.statusLabel")}</Label>
            <Select
              id="status"
              name="status"
              value={formData.status as string}
              onChange={handleChange}
              disabled={isLoading}
            >
              {Object.values(TaskStatus).map((s) => (
                <option key={s} value={s}>
                  {getStatusLabel(s)}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assigned_to_id">
            {t("tasks.form.assigneeLabel")}
          </Label>
          <Select
            id="assigned_to_id"
            name="assigned_to_id"
            value={formData.assigned_to_id as string}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="">{t("tasks.form.unassigned")}</option>
            {users?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.username}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("tasks.form.assigneeHelper")}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="due_date">{t("tasks.form.dueDateLabel")}</Label>
          <Input
            type="date"
            id="due_date"
            name="due_date"
            value={formData.due_date as string}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {t("tasks.form.cancel")}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {submitText}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;
