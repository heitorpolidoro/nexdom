import React from "react";
import { useTranslation } from "react-i18next";
import type { TaskRead } from "../types";
import { TaskStatus, TaskPriority } from "../types";
import TaskCard from "./TaskCard";

interface TaskListProps {
  tasks: TaskRead[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  filters: {
    status?: TaskStatus | null;
    priority?: TaskPriority | null;
    assigned_to_id?: string | null;
  };
  onTaskClick?: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  isLoading,
  isError,
  error,
  filters,
  onTaskClick,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <p className="text-center text-muted-foreground py-10">
        {t("tasks.list.loading")}
      </p>
    );
  }

  if (isError) {
    return (
      <p className="text-center text-destructive py-10">
        {t("tasks.list.error", { message: error?.message })}
      </p>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-10">
        {t("tasks.list.empty")}
      </p>
    );
  }

  const filteredTasks = tasks.filter((task) => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (
      filters.assigned_to_id &&
      task.assigned_to_id !== filters.assigned_to_id
    )
      return false;
    return true;
  });

  if (filteredTasks.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-10">
        {t("tasks.list.emptyFiltered")}
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
      {filteredTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={() => onTaskClick?.(task.id)}
        />
      ))}
    </div>
  );
};

export default TaskList;
