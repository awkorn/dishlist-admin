import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { ReportDetailResponse, UserRole } from "../types";
import { StatusBadge } from "./StatusBadge";

interface ReportDetailProps {
  reportId: string;
  role: UserRole;
  onChanged: () => void;
}

export function ReportDetail({ reportId, role, onChanged }: ReportDetailProps) {
  const [data, setData] = useState<ReportDetailResponse | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await apiFetch<ReportDetailResponse>(`/admin/reports/${reportId}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load report");
    }
  }, [reportId]);

  useEffect(() => {
    setData(null);
    setNote("");
    void load();
  }, [load]);

  async function claim() {
    setIsWorking(true);
    setError("");
    try {
      await apiFetch(`/admin/reports/${reportId}/claim`, { method: "POST" });
      await load();
      onChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to claim report");
    } finally {
      setIsWorking(false);
    }
  }

  async function resolve(decision: "DISMISS" | "HIDE_CONTENT" | "SUSPEND_USER") {
    if (note.trim().length < 3) {
      setError("Enter a resolution note of at least three characters.");
      return;
    }
    if (!window.confirm(`Confirm ${decision.toLowerCase().replace("_", " ")}?`)) return;
    setIsWorking(true);
    setError("");
    try {
      await apiFetch(`/admin/reports/${reportId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ decision, note }),
      });
      await load();
      onChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to resolve report");
    } finally {
      setIsWorking(false);
    }
  }

  async function restore() {
    if (!data || note.trim().length < 3) {
      setError("Enter a restoration note of at least three characters.");
      return;
    }
    if (!window.confirm("Restore this target to the product?")) return;
    setIsWorking(true);
    try {
      await apiFetch(`/admin/targets/${data.report.targetType}/${data.report.targetId}/restore`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      await load();
      onChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to restore target");
    } finally {
      setIsWorking(false);
    }
  }

  if (error && !data) return <main className="detail"><p className="error" role="alert">{error}</p></main>;
  if (!data) return <main className="detail"><p>Loading report…</p></main>;

  const { report, target } = data;
  const isOpen = report.status === "PENDING" || report.status === "REVIEWED";
  const targetIsRemoved =
    target?.status === "SUSPENDED" || target?.moderationState === "HIDDEN";

  return (
    <main className="detail">
      <header className="detail-header">
        <div>
          <p className="eyebrow">{report.targetType} report</p>
          <h1>{report.reason.replace("_", " ")}</h1>
        </div>
        <StatusBadge status={report.status} />
      </header>

      {error && <p className="error" role="alert">{error}</p>}
      <section className="card metadata-grid">
        <div><span>Submitted</span><strong>{new Date(report.createdAt).toLocaleString()}</strong></div>
        <div><span>Reporter</span><strong>{report.reporter.username || report.reporter.email}</strong></div>
        <div><span>Assigned</span><strong>{report.assignedTo?.username || "Unassigned"}</strong></div>
        <div><span>Target ID</span><strong className="mono">{report.targetId}</strong></div>
      </section>

      <section className="card">
        <h2>Reporter details</h2>
        <p>{report.details || "No additional details were provided."}</p>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Evidence at submission</h2>
          {data.legacyEvidence && <span className="legacy">Legacy report · live data only</span>}
        </div>
        <pre>{JSON.stringify(report.targetSnapshot || target, null, 2)}</pre>
      </section>

      <section className="card">
        <h2>Current target</h2>
        <pre>{JSON.stringify(target, null, 2)}</pre>
      </section>

      {isOpen && (
        <section className="card action-panel">
          <h2>Resolution</h2>
          <label>
            Required internal note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Document the evidence and reason for this decision."
            />
          </label>
          <div className="actions">
            {report.status === "PENDING" && (
              <button className="secondary" disabled={isWorking} onClick={() => void claim()}>
                Claim for review
              </button>
            )}
            <button className="secondary" disabled={isWorking} onClick={() => void resolve("DISMISS")}>
              Dismiss report
            </button>
            {report.targetType === "USER" ? (
              <button className="danger" disabled={isWorking} onClick={() => void resolve("SUSPEND_USER")}>
                Suspend user
              </button>
            ) : (
              <button className="danger" disabled={isWorking} onClick={() => void resolve("HIDE_CONTENT")}>
                Hide content
              </button>
            )}
          </div>
        </section>
      )}

      {role === "ADMIN" && targetIsRemoved && (
        <section className="card action-panel">
          <h2>Administrator restoration</h2>
          <p>Restoration is audited and requires a reason.</p>
          <label>
            Required restoration note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Document why this target should be restored."
            />
          </label>
          <button className="secondary" disabled={isWorking} onClick={() => void restore()}>
            Restore target
          </button>
        </section>
      )}

      <section className="card">
        <h2>Related reports</h2>
        {data.relatedReports.length === 0 ? <p>None.</p> : (
          <ul>{data.relatedReports.map((item) => (
            <li key={item.id}>{item.reason} · {item.status} · {new Date(item.createdAt).toLocaleDateString()}</li>
          ))}</ul>
        )}
      </section>

      <section className="card">
        <h2>Audit history</h2>
        {report.actions.length === 0 ? <p>No actions yet.</p> : (
          <ol className="timeline">{report.actions.map((action) => (
            <li key={action.id}>
              <strong>{action.action.replaceAll("_", " ")}</strong>
              <span>{action.note}</span>
              <small>{new Date(action.createdAt).toLocaleString()} · {action.moderator?.username || action.moderator?.firstName || "Former moderator"}</small>
            </li>
          ))}</ol>
        )}
      </section>
    </main>
  );
}
