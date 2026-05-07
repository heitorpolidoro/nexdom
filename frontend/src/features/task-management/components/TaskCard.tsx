import React from "react";
import { useTranslation } from "react-i18next";
import type { TaskRead } from "../types";
import { Badge, type BadgeProps } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";

interface TaskCardProps {
  task: TaskRead;
  onClick?: () => void;
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

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const { t, i18n } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      e.preventDefault();
      onClick();
    }
  };

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
    <button
      className={cn(
        "w-full text-left rounded-xl border border-border/40 bg-card text-card-foreground shadow-sm p-5 transition-all duration-200 cursor-pointer",
        "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <h3 className="font-semibold text-base mb-1 text-foreground leading-snug">
        {task.title}
      </h3>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
        {task.description || t("tasks.card.noDescription")}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Badge variant={statusVariant(task.status)}>
            {getStatusLabel(task.status)}
          </Badge>
          <Badge variant={priorityVariant(task.priority)}>
            {task.priority}
          </Badge>
        </div>
        {task.due_date && (
          <span className="text-xs text-muted-foreground">
            {new Date(task.due_date).toLocaleDateString(
              i18n.language === "pt" ? "pt-BR" : "en-US",
            )}
          </span>
        )}
      </div>
    </button>
  );
};

export default TaskCard;
