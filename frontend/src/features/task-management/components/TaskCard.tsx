import React from "react";
import type { TaskRead } from "../types";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  /** The task object to display. */
  task: TaskRead;
  /** Callback triggered when the card is clicked. */
  onClick?: () => void;
}

/**
 * Component to display a summary of a task.
 *
 * @param props - Component props containing the task.
 * @returns A card component with task details.
 */
const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  /**
   * Maps a task status to a corresponding CSS color class.
   *
   * @param status - The task status.
   * @returns The CSS class name for the status color.
   */
  const getStatusColorClass = (status: string): string => {
    switch (status) {
      case "PENDING":
        return styles.pending;
      case "IN_PROGRESS":
        return styles.inProgress;
      case "COMPLETED":
        return styles.completed;
      case "CANCELED":
        return styles.canceled;
      default:
        return styles.defaultStatus;
    }
  };

  /**
   * Maps a task priority to a corresponding CSS color class.
   *
   * @param priority - The task priority.
   * @returns The CSS class name for the priority color.
   */
  const getPriorityColorClass = (priority: string): string => {
    switch (priority) {
      case "LOW":
        return styles.lowPriority;
      case "MEDIUM":
        return styles.mediumPriority;
      case "HIGH":
        return styles.highPriority;
      case "URGENT":
        return styles.urgentPriority;
      default:
        return styles.defaultPriority;
    }
  };

  /**
   * Handles keyboard events for accessibility.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={styles.card}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
    >
      <h3 className={styles.title}>{task.title}</h3>
      <p className={styles.description}>
        {task.description || "No description"}
      </p>
      <div className={styles.details}>
        <span
          className={`${styles.status} ${getStatusColorClass(task.status)}`}
        >
          {task.status}
        </span>
        <span
          className={`${styles.priority} ${getPriorityColorClass(task.priority)}`}
        >
          {task.priority}
        </span>
      </div>
      {task.due_date && (
        <div className={styles.dueDate}>
          Due: {new Date(task.due_date).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
