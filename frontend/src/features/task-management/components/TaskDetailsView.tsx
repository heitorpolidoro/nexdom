import React from "react";
import { useTranslation } from "react-i18next";
import type { TaskRead, TaskStatus } from "../types";
import { useUpdateTask } from "../hooks/useTasks";
import AuditTimeline from "./AuditTimeline";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { getStatusLabel, getPriorityLabel, priorityVariant } from "../utils/taskUtils";

interface TaskDetailsViewProps {
  task: TaskRead;
  onEdit: () => void;
  onClose: () => void;
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

  const statuses = ["PENDING", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELED"];
  const displayStatuses = statuses.includes(task.status) ? statuses : [task.status, ...statuses];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-4 border-b mb-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground leading-snug">
            {task.title}
          </h2>
          <div className="relative group shrink-0">
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              disabled={updateTaskMutation.isPending}
              className={cn(
                "appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-bold uppercase tracking-wide border-none cursor-pointer focus:ring-2 focus:ring-ring outline-none",
                task.status === "PENDING" &&
                  "bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]",
                task.status === "IN_PROGRESS" &&
                  "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-fg)]",
                task.status === "BLOCKED" &&
                  "bg-[var(--status-blocked-bg)] text-[var(--status-blocked-fg)]",
                task.status === "COMPLETED" &&
                  "bg-[var(--status-completed-bg)] text-[var(--status-completed-fg)]",
                task.status === "CANCELED" &&
                  "bg-[var(--status-canceled-bg)] text-[var(--status-canceled-fg)]",
              )}
            >
              {displayStatuses.map((status) => (
                <option
                  key={status}
                  value={status}
                  className="bg-background text-foreground"
                >
                  {getStatusLabel(status, t)}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
              <svg className="size-3 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={priorityVariant(task.priority)}>
            {getPriorityLabel(task.priority, t)}
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
              value: task.assigned_to_name || t("tasks.details.unassigned"),
            },
            {
              label: t("tasks.details.createdBy"),
              value: task.created_by_name || task.created_by_id,
            },
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
