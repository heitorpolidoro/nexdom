import React from "react";
import { useTranslation } from "react-i18next";
import type { TaskRead, TaskStatus } from "../types";
import { useUpdateTask } from "../hooks/useTasks";
import AuditTimeline from "./AuditTimeline";
import { Badge, type BadgeProps } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";

interface TaskDetailsViewProps {
  task: TaskRead;
  onEdit: () => void;
  onClose: () => void;
}

type BadgeVariant = BadgeProps["variant"];

function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    CANCELED: "canceled",
  };
  return map[status] ?? "default";
}

function priorityVariant(priority: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent",
  };
  return map[priority] ?? "default";
}

const TaskDetailsView: React.FC<TaskDetailsViewProps> = ({
  task,
  onEdit,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const updateTaskMutation = useUpdateTask();

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateTaskMutation.mutate({ id: task.id, data: { status: newStatus } });
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return t("tasks.details.notSet");
    return new Date(date).toLocaleString(
      i18n.language === "pt" ? "pt-BR" : "en-US",
    );
  };

  const statusLabels: Record<string, string> = {
    PENDING: t("tasks.details.statusPending"),
    IN_PROGRESS: t("tasks.details.statusInProgress"),
    COMPLETED: t("tasks.details.statusCompleted"),
    CANCELED: t("tasks.details.statusCanceled"),
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-4 border-b mb-4">
        <h2 className="text-xl font-semibold text-foreground leading-snug">
          {task.title}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={statusVariant(task.status)}>
            {statusLabels[task.status]}
          </Badge>
          <Badge variant={priorityVariant(task.priority)}>
            {task.priority}
          </Badge>
        </div>
      </div>

      {/* Description */}
      <section className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          {t("tasks.details.description")}
        </p>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {task.description || t("tasks.details.noDescription")}
        </p>
      </section>

      {/* Metadata grid */}
      <section className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: t("tasks.details.assignedTo"),
              value: task.assigned_to_id || t("tasks.details.unassigned"),
            },
            { label: t("tasks.details.createdBy"), value: task.created_by_id },
            {
              label: t("tasks.details.dueDate"),
              value: formatDate(task.due_date),
            },
            {
              label: t("tasks.details.createdAt"),
              value: formatDate(task.created_at),
            },
            {
              label: t("tasks.details.updatedAt"),
              value: formatDate(task.updated_at),
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <span className="text-xs text-muted-foreground mb-0.5">
                {label}
              </span>
              <span className="text-sm font-medium text-foreground">
                {value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick status actions */}
      <section className="rounded-lg bg-muted/40 p-3 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {t("tasks.details.changeStatus")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"] as TaskStatus[]
          ).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={task.status === status ? "secondary" : "outline"}
              onClick={() => handleStatusChange(status)}
              disabled={task.status === status || updateTaskMutation.isPending}
            >
              {statusLabels[status]}
            </Button>
          ))}
        </div>
      </section>

      {/* Audit timeline */}
      <AuditTimeline taskId={task.id} />

      {/* Footer actions */}
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          {t("tasks.details.close")}
        </Button>
        <Button variant="success" onClick={onEdit}>
          {t("tasks.details.edit")}
        </Button>
      </div>
    </div>
  );
};

export default TaskDetailsView;
