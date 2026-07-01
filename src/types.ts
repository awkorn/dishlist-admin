export type UserRole = "MODERATOR" | "ADMIN";
export type ReportStatus = "PENDING" | "REVIEWED" | "ACTIONED" | "DISMISSED";
export type ReportReason = "INAPPROPRIATE" | "HARASSMENT" | "SPAM" | "OTHER";
export type TargetType = "USER" | "DISHLIST" | "RECIPE";

export interface AdminUser {
  uid: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
}

export interface PersonSummary {
  uid: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface ReportSummary {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  targetSnapshot: unknown;
  createdAt: string;
  reviewedAt: string | null;
  resolvedAt: string | null;
  reporter: PersonSummary;
  assignedTo: PersonSummary | null;
  _count: { actions: number };
}

export interface ReportsResponse {
  reports: ReportSummary[];
  nextCursor: string | null;
}

export interface ReportSummaryResponse {
  counts: Partial<Record<ReportStatus, number>>;
  openCount: number;
  oldestOpenCreatedAt: string | null;
  slaHours: number;
  warningHours: number;
}

export interface ModerationAction {
  id: string;
  action: string;
  note: string;
  createdAt: string;
  moderator: PersonSummary | null;
}

export interface ReportDetailResponse {
  report: ReportSummary & {
    reporter: PersonSummary & { email: string };
    resolvedBy: PersonSummary | null;
    resolutionNote: string | null;
    actions: ModerationAction[];
  };
  target: Record<string, unknown> | null;
  relatedReports: Array<{
    id: string;
    reason: ReportReason;
    status: ReportStatus;
    createdAt: string;
    resolvedAt: string | null;
  }>;
  automatedReviews: Array<{
    id: string;
    status: string;
    inputType: string;
    reason: string | null;
    createdAt: string;
  }>;
  legacyEvidence: boolean;
}
