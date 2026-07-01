import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type {
  ReportReason,
  ReportsResponse,
  ReportStatus,
  ReportSummary,
  ReportSummaryResponse,
  TargetType,
} from "../types";
import { StatusBadge } from "./StatusBadge";

interface ReportQueueProps {
  selectedId: string | null;
  refreshToken: number;
  onSelect: (id: string) => void;
}

function ageInHours(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
}

export function ReportQueue({
  selectedId,
  refreshToken,
  onSelect,
}: ReportQueueProps) {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [summary, setSummary] = useState<ReportSummaryResponse | null>(null);
  const [status, setStatus] = useState<ReportStatus | "OPEN">("OPEN");
  const [reason, setReason] = useState<ReportReason | "">("");
  const [targetType, setTargetType] = useState<TargetType | "">("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (cursor?: string) => {
    setError("");
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "OPEN") params.set("status", status);
      if (reason) params.set("reason", reason);
      if (targetType) params.set("targetType", targetType);
      if (cursor) params.set("cursor", cursor);
      const [list, totals] = await Promise.all([
        apiFetch<ReportsResponse>(`/admin/reports?${params}`),
        apiFetch<ReportSummaryResponse>("/admin/reports/summary"),
      ]);
      setReports((current) => (cursor ? [...current, ...list.reports] : list.reports));
      setNextCursor(list.nextCursor);
      setSummary(totals);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load reports");
    } finally {
      setIsLoading(false);
    }
  }, [reason, status, targetType]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  return (
    <aside className="queue" aria-label="Report queue">
      <div className="queue-heading">
        <div>
          <p className="eyebrow">Review queue</p>
          <h2>{summary?.openCount ?? "—"} open reports</h2>
        </div>
        <button className="icon-button" onClick={() => void load()} aria-label="Refresh reports">
          ↻
        </button>
      </div>
      <div className="filters">
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as ReportStatus | "OPEN")}>
            <option value="OPEN">Open</option>
            <option value="PENDING">Pending</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="ACTIONED">Actioned</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </label>
        <label>
          Type
          <select value={targetType} onChange={(event) => setTargetType(event.target.value as TargetType | "")}>
            <option value="">All</option>
            <option value="USER">User</option>
            <option value="DISHLIST">DishList</option>
            <option value="RECIPE">Recipe</option>
          </select>
        </label>
        <label>
          Reason
          <select value={reason} onChange={(event) => setReason(event.target.value as ReportReason | "")}>
            <option value="">All</option>
            <option value="INAPPROPRIATE">Inappropriate</option>
            <option value="HARASSMENT">Harassment</option>
            <option value="SPAM">Spam</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
      </div>
      {error && <p className="error queue-message" role="alert">{error}</p>}
      {!error && !isLoading && reports.length === 0 && (
        <p className="queue-message">No reports match these filters.</p>
      )}
      <div className="report-list">
        {reports.map((report) => {
          const hours = ageInHours(report.createdAt);
          const urgency = hours >= 24 ? "overdue" : hours >= 18 ? "warning" : "";
          return (
            <button
              className={`report-row ${selectedId === report.id ? "selected" : ""} ${urgency}`}
              key={report.id}
              onClick={() => onSelect(report.id)}
            >
              <span className="row-top">
                <strong>{report.reason.replace("_", " ")}</strong>
                <StatusBadge status={report.status} />
              </span>
              <span>{report.targetType} · {report.targetId.slice(0, 12)}</span>
              <span className="muted">
                {Math.max(0, Math.floor(hours))}h old
                {report.assignedTo ? ` · ${report.assignedTo.username || report.assignedTo.firstName || "Assigned"}` : ""}
              </span>
            </button>
          );
        })}
      </div>
      {nextCursor && (
        <button className="load-more" disabled={isLoading} onClick={() => void load(nextCursor)}>
          {isLoading ? "Loading…" : "Load more"}
        </button>
      )}
    </aside>
  );
}
