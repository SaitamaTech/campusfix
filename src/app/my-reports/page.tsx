import Link from "next/link";
import { FileText, PlusCircle } from "lucide-react";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "My Reports" };

export default async function MyReportsPage() {
  const ctx = await requireAuthenticatedContext();
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("incidents")
        .select("id, reference_code, title, status, severity, created_at")
        .eq("reporter_id", ctx.userId)
        .order("created_at", { ascending: false })
    : { data: null };

  const reports = data ?? [];
  return (
    <AppShell profile={ctx.profile} institutionName={ctx.institutionName} pageTitle="My Reports">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 800 }}>My submitted reports</h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Track every issue you have reported.</p>
          </div>
          <Button href="/report" variant="primary"><PlusCircle size={16} />New report</Button>
        </div>
        {reports.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: "30px" }}>
              <FileText size={28} color="var(--text-muted)" style={{ margin: "0 auto 10px" }} />
              <p style={{ color: "var(--text-secondary)", marginBottom: "14px" }}>You have not submitted a report yet.</p>
              <Button href="/report" variant="primary" size="sm">Submit your first report</Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {reports.map((report) => (
                <Link key={report.id} href={`/reports/${report.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{report.title}</div>
                    <div className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {report.reference_code} &bull; {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge tone={report.status === "resolved" ? "success" : "orange"}>{report.status.replace("_", " ")}</Badge>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
