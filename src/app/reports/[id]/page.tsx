import Link from "next/link";
import { ArrowLeft, MapPin, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { verifyIncidentAction } from "@/app/actions/incidents";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Campus Report" };

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string; verified?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const ctx = await requireAuthenticatedContext();
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: incident } = await supabase
    .from("incidents")
    .select("*, category:incident_categories(name, slug), location:campus_locations(name, building_code)")
    .eq("id", id)
    .single();
  if (!incident) notFound();

  const [updatesResult, verificationsResult, existingVerificationResult] = await Promise.all([
    supabase
      .from("incident_updates")
      .select("id, title, message, new_status, created_at")
      .eq("incident_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("incident_verifications")
      .select("verification_type")
      .eq("incident_id", id),
    supabase
      .from("incident_verifications")
      .select("id")
      .eq("incident_id", id)
      .eq("user_id", ctx.userId)
      .maybeSingle(),
  ]);

  const updates = updatesResult.data ?? [];
  const verifications = verificationsResult.data ?? [];
  const alreadyVerified = Boolean(existingVerificationResult.data);
  const isOwner = incident.reporter_id === ctx.userId;

  return (
    <AppShell profile={ctx.profile} university={ctx.university} pageTitle="Report Details">
      <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
        {query.submitted && <Alert variant="success" title="Report submitted">Your campus report is now visible for community verification.</Alert>}
        {query.verified && <Alert variant="success" title="Thank you">Your community verification was recorded.</Alert>}
        {query.error && <Alert variant="danger" title="Verification unavailable">{query.error}</Alert>}

        <Link href={ctx.profile.role === "student" ? "/explore" : "/admin/reports"} style={{ display: "inline-flex", alignItems: "center", gap: "7px", color: "var(--text-secondary)", fontSize: "13px" }}>
          <ArrowLeft size={15} />Back
        </Link>

        <Card highlighted>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                <Badge tone={incident.status === "resolved" ? "success" : "orange"}>{incident.status.replace("_", " ")}</Badge>
                <Badge tone={incident.severity === "critical" || incident.severity === "high" ? "red" : "neutral"}>{incident.severity} severity</Badge>
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: 800 }}>{incident.title}</h2>
              <p className="mono" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "5px" }}>{incident.reference_code}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#86efac", fontWeight: 700 }}>
              <ShieldCheck size={17} />
              {Number(incident.confidence_score).toFixed(0)}% confidence
            </div>
          </div>
          <p style={{ marginTop: "16px", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{incident.description}</p>
          <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", marginTop: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <MapPin size={14} />{incident.location?.name ?? incident.custom_location_name ?? "Campus location not specified"}
            </span>
            <span>{incident.category?.name ?? "Campus issue"}</span>
            <span>{verifications.length} community verification{verifications.length === 1 ? "" : "s"}</span>
          </div>
        </Card>

        {!isOwner && incident.status !== "resolved" && incident.status !== "rejected" && (
          <Card>
            <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Community verification</h3>
            {alreadyVerified ? (
              <Alert variant="info" title="Already verified">You have already added your verification to this report.</Alert>
            ) : (
              <form action={verifyIncidentAction}>
                <input type="hidden" name="incidentId" value={id} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" }}>
                  <label><input type="radio" name="verificationType" value="confirm_exists" required /> I confirm it exists</label>
                  <label><input type="radio" name="verificationType" value="experienced_too" /> I experienced this too</label>
                  <label><input type="radio" name="verificationType" value="appears_fixed" /> It appears fixed</label>
                </div>
                <Textarea name="comment" placeholder="Optional note..." maxLength={500} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                  <Button type="submit" variant="primary" size="sm">Submit verification</Button>
                </div>
              </form>
            )}
          </Card>
        )}

        <Card>
          <h3 style={{ fontSize: "16px", marginBottom: "14px" }}>Resolution timeline</h3>
          {updates.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>No status updates yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {updates.map((update) => (
                <div key={update.id} style={{ paddingLeft: "14px", borderLeft: "2px solid var(--accent-highlight-border)" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>{update.title}</div>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "3px" }}>{update.message}</p>
                  <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>{new Date(update.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {incident.resolution_description && (
          <Card highlighted>
            <h3 style={{ fontSize: "16px", marginBottom: "8px", color: "#86efac" }}>Resolution documented</h3>
            <p style={{ color: "var(--text-secondary)" }}>{incident.resolution_description}</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
