import { projects, type Project } from "./data";
import type { AppRole } from "@/hooks/useAuth";

/**
 * Client-aware visibility. Project Managers see only assigned projects;
 * Executives see the rollup of their projects; Admins and Reviewers see the book.
 */
export function visibleProjects(
  role: AppRole | null,
  assigned: number[],
  list: Project[] = projects,
): Project[] {
  if (role === "project_manager") return list.filter((p) => assigned.includes(p.id));
  if (role === "executive" && assigned.length > 0)
    return list.filter((p) => assigned.includes(p.id));
  return list;
}

export function canSee(
  role: AppRole | null,
  assigned: number[],
  projectId: number,
  list: Project[] = projects,
): boolean {
  return visibleProjects(role, assigned, list).some((p) => p.id === projectId);
}
