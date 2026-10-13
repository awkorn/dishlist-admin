import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LoginPage } from "./components/LoginPage";
import { ReportDetail } from "./components/ReportDetail";
import { ReportQueue } from "./components/ReportQueue";
import { ApiError, apiFetch } from "./lib/api";
import { supabase } from "./lib/supabase";
import type { AdminUser } from "./types";

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Supabase re-emits the session on every tab focus and token refresh.
      // Keep the same object unless the signed-in user changed, so the
      // workspace (and a half-written note) is not torn down.
      setSession((current) =>
        current?.user.id === nextSession?.user.id ? current : nextSession
      );
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setAdmin(null);
    setAccessDenied(false);
    setSelectedId(null);
    if (!userId) {
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    void apiFetch<{ user: AdminUser }>("/admin/me")
      .then(({ user }) => {
        if (active) setAdmin(user);
      })
      .catch((error) => {
        if (active) setAccessDenied(error instanceof ApiError && error.status === 403);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (isLoading) return <main className="centered">Loading safety operations…</main>;
  if (!session) return <LoginPage />;
  if (accessDenied || !admin) {
    return (
      <main className="centered">
        <div className="access-card">
          <p className="eyebrow">Access denied</p>
          <h1>Moderator role required</h1>
          <p>This account is authenticated but is not authorized for safety operations.</p>
          <button onClick={() => void supabase.auth.signOut()}>Sign out</button>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <strong>DishList Safety</strong>
          <span>24-hour review SLA</span>
        </div>
        <div>
          <span>{admin.email} · {admin.role}</span>
          <button className="text-button" onClick={() => void supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>
      <div className="workspace">
        <ReportQueue
          selectedId={selectedId}
          refreshToken={refreshToken}
          onSelect={setSelectedId}
        />
        {selectedId ? (
          <ReportDetail
            reportId={selectedId}
            role={admin.role}
            onChanged={() => setRefreshToken((value) => value + 1)}
          />
        ) : (
          <main className="detail empty-detail">
            <div>
              <p className="eyebrow">Queue ready</p>
              <h1>Select a report</h1>
              <p>Review the oldest and overdue safety reports first.</p>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
