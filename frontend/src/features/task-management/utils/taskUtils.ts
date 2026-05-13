import type { TFunction } from "i18next";
import type { BadgeProps } from "../../../components/ui/badge";

export type BadgeVariant = BadgeProps["variant"];

export function getStatusLabel(status: string, t: TFunction): string {
  const map: Record<string, string> = {
    PENDING: t("tasks.details.statusPending"),
    IN_PROGRESS: t("tasks.details.statusInProgress"),
    BLOCKED: t("tasks.details.statusBlocked"),
    COMPLETED: t("tasks.details.statusCompleted"),
    CANCELED: t("tasks.details.statusCanceled"),
  };
  return map[status] || status;
}

export function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    BLOCKED: "blocked",
    COMPLETED: "completed",
    CANCELED: "canceled",
  };
  return map[status] ?? "default";
}

export function getPriorityLabel(priority: string, t: TFunction): string {
  const map: Record<string, string> = {
    LOW: t("tasks.priority.LOW"),
    MEDIUM: t("tasks.priority.MEDIUM"),
    HIGH: t("tasks.priority.HIGH"),
    URGENT: t("tasks.priority.URGENT"),
  };
  return map[priority] || priority;
}

export function priorityVariant(priority: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent",
  };
  return map[priority] ?? "default";
}
