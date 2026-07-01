import type { ReportStatus } from "../types";

interface StatusBadgeProps {
  status: ReportStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status status-${status.toLowerCase()}`}>{status}</span>;
}
