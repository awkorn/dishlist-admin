import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "../lib/api";
import type { ReportDetailResponse } from "../types";
import { ReportDetail } from "./ReportDetail";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn(),
}));

const detail: ReportDetailResponse = {
  report: {
    id: "report-1",
    targetType: "USER",
    targetId: "user-2",
    reason: "HARASSMENT",
    details: "Repeated harassment",
    status: "PENDING",
    targetSnapshot: { username: "reported" },
    createdAt: "2026-06-30T00:00:00.000Z",
    reviewedAt: null,
    resolvedAt: null,
    reporter: {
      uid: "user-1",
      email: "reporter@example.com",
      username: "reporter",
      firstName: null,
      lastName: null,
    },
    assignedTo: null,
    resolvedBy: null,
    resolutionNote: null,
    actions: [],
    _count: { actions: 0 },
  },
  target: { uid: "user-2", username: "reported", status: "ACTIVE" },
  targetOwner: null,
  relatedReports: [],
  automatedReviews: [],
  legacyEvidence: false,
};

describe("ReportDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue(detail);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("loads evidence and sends a confirmed suspension decision", async () => {
    const onChanged = vi.fn();
    render(<ReportDetail reportId="report-1" role="MODERATOR" onChanged={onChanged} />);

    expect(await screen.findByText("Repeated harassment")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Required internal note"), {
      target: { value: "Confirmed repeated targeted abuse." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Suspend user" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/admin/reports/report-1/resolve", {
        method: "POST",
        body: JSON.stringify({
          decision: "SUSPEND_USER",
          note: "Confirmed repeated targeted abuse.",
        }),
      });
      expect(onChanged).toHaveBeenCalled();
    });
  });

  it("offers to suspend the author of reported content", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ...detail,
      report: { ...detail.report, targetType: "RECIPE", targetId: "recipe-1" },
      target: { id: "recipe-1", moderationState: "VISIBLE", creatorId: "user-2" },
      targetOwner: {
        uid: "user-2",
        username: "author",
        firstName: null,
        lastName: null,
        status: "ACTIVE",
        suspendedAt: null,
      },
    });
    render(<ReportDetail reportId="report-1" role="MODERATOR" onChanged={vi.fn()} />);

    fireEvent.change(await screen.findByLabelText("Required internal note"), {
      target: { value: "Explicit imagery." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hide content and suspend author" }));

    expect(window.confirm).toHaveBeenCalledWith("Hide this content and suspend its author?");
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/admin/reports/report-1/resolve", {
        method: "POST",
        body: JSON.stringify({ decision: "SUSPEND_USER", note: "Explicit imagery." }),
      });
    });
  });

  it("ignores a slow response for a report that is no longer selected", async () => {
    let finishFirst!: (value: ReportDetailResponse) => void;
    vi.mocked(apiFetch)
      .mockReturnValueOnce(new Promise((done) => { finishFirst = done; }))
      .mockResolvedValueOnce({
        ...detail,
        report: { ...detail.report, id: "report-2", details: "Second report" },
      });
    const view = render(<ReportDetail reportId="report-1" role="MODERATOR" onChanged={vi.fn()} />);
    view.rerender(<ReportDetail reportId="report-2" role="MODERATOR" onChanged={vi.fn()} />);

    expect(await screen.findByText("Second report")).toBeInTheDocument();
    await act(async () => {
      finishFirst(detail);
      await new Promise((done) => setTimeout(done));
    });

    expect(screen.getByText("Second report")).toBeInTheDocument();
    expect(screen.queryByText("Repeated harassment")).not.toBeInTheDocument();
  });
});
