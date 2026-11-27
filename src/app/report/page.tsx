import React from "react";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { IncidentReportForm } from "@/components/incidents/IncidentReportForm";

export const metadata = { title: "Report a Campus Problem" };

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireAuthenticatedContext();
  const supabase = await createClient();
  const params = await searchParams;

  let categories: Array<{ id: string; name: string }> = [];
  let locations: Array<{ id: string; name: string; building_code: string | null }> = [];

  if (supabase && ctx.profile.university_id) {
    const [categoryResult, locationResult] = await Promise.all([
      supabase
        .from("incident_categories")
        .select("id, name")
        .or(`university_id.is.null,university_id.eq.${ctx.profile.university_id}`)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("campus_locations")
        .select("id, name, building_code")
        .eq("university_id", ctx.profile.university_id)
        .eq("is_active", true)
        .order("name"),
    ]);
    categories = categoryResult.data ?? [];
    locations = locationResult.data ?? [];
  }

  return (
    <AppShell profile={ctx.profile} institutionName={ctx.institutionName} pageTitle="Report a Problem">
      <div style={{ maxWidth: "820px", margin: "0 auto" }}>
        {params.error && (
          <Alert variant="danger" title="Report could not be submitted">{params.error}</Alert>
        )}
        <IncidentReportForm categories={categories} locations={locations} />
      </div>
    </AppShell>
  );
}
