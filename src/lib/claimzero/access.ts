import { projects, type Project } from "./data";
import type { AppRole } from "@/hooks/useAuth";

/**
 * Client-aware visibility. Project Managers see only assigned projects;
 * Executives see the rollup of their projects; Admins and Reviewers see the book.
 */
export function visibleProjects(role: AppRole | null, assigned: number[]): Project[] {
  if (role === "project_manager") return projects.filter((p) => assigned.includes(p.id));
  if (role === "executive" && assigned.length > 0)
    return projects.filter((p) => assigned.includes(p.id));
  return projects;
}

export function canSee(role: AppRole | null, assigned: number[], projectId: number): boolean {
  return visibleProjects(role, assigned).some((p) => p.id === projectId);
}
