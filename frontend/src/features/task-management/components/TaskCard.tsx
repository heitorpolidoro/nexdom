import React from "react";
import { useTranslation } from "react-i18next";
import type { TaskRead } from "../types";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
import { getStatusLabel, getPriorityLabel, statusVariant, priorityVariant } from "../utils/taskUtils";

interface TaskCardProps {
  task: TaskRead;
  onClick?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const { t, i18n } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      e.preventDefault();
      onClick();
    }
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
      {task.category_name && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: task.category_color ?? "#808080" }}
          />
          {task.category_name}
        </span>
      )}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
          {task.description || t("tasks.card.noDescription")}
        </p>
        {task.assigned_to_name && (
          <div
            className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/20 shrink-0"
            title={task.assigned_to_name}
          >
            {task.assigned_to_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Badge variant={statusVariant(task.status)}>
            {getStatusLabel(task.status, t)}
          </Badge>
          <Badge variant={priorityVariant(task.priority)}>
            {getPriorityLabel(task.priority, t)}
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
