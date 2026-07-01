import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
});
