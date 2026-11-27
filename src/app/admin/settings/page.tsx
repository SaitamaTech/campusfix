import { Settings } from "lucide-react";
import { saveCampusSettingsAction } from "@/app/actions/campus-operations";
import { CampusSelector } from "@/components/admin/CampusSelector";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/FormField";
import { selectAdminCampusId } from "@/lib/auth/admin-campus";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { CampusSettings } from "@/types/database";

export const metadata = { title: "Campus Settings" };

type SearchParams = Promise<{
  universityId?: string;
  notice?: string;
  error?: string;
  warning?: string;
}>;

const notices: Record<string, string> = {
  settings_saved: "Campus settings saved.",
};
const errors: Record<string, string> = {
  invalid_settings: "Review the numeric settings and try again.",
  invalid_domains: "Enter valid email domains separated by commas or spaces.",
  incomplete_map_center: "Enter both map center coordinates, or leave both empty.",
  service_unavailable: "Campus settings are temporarily unavailable.",
  campus_unavailable: "The selected campus could not be loaded.",
  settings_save_failed: "Campus settings could not be saved.",
  settings_uninitialized: "Campus settings have not been initialized. Ask a Super Admin to set them up.",
};

const defaults: Omit<CampusSettings, "id" | "university_id" | "created_at" | "updated_at"> = {
  require_matric_number: false,
  allowed_email_domains: [],
  auto_approve_reports: false,
  allow_public_comments: true,
  duplicate_distance_meters: 75,
  duplicate_time_window_hours: 72,
  map_center_lat: null,
  map_center_lng: null,
  map_default_zoom: 16,
  campus_boundary_geojson: null,
  map_configured: false,
  health_score_weights: {},
};

export default async function CampusSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireRole(["campus_admin", "super_admin"], { includeUniversity: false });
  const params = await searchParams;
  const supabase = await createClient();

  let campuses: Array<{ id: string; name: string; is_active: boolean }> = [];
  let campusError: unknown = null;
  if (supabase && ctx.profile.role === "super_admin") {
    const result = await supabase.from("universities").select("id, name, is_active").order("name");
    campuses = result.data ?? [];
    campusError = result.error;
  } else if (supabase && ctx.profile.university_id) {
    const result = await supabase
      .from("universities")
      .select("id, name, is_active")
      .eq("id", ctx.profile.university_id)
      .maybeSingle();
    campuses = result.data ? [result.data] : [];
    campusError = result.error;
  }

  if (campusError) console.error("Campus settings campus list query failed:", campusError);
  const campusId = selectAdminCampusId(
    ctx.profile.role,
    ctx.profile.university_id,
    params.universityId ?? null,
    campuses.map((campus) => campus.id)
  );
  const selectedCampus = campuses.find((campus) => campus.id === campusId);
  const { data, error: settingsError } = supabase && campusId
    ? await supabase
        .from("campus_settings")
        .select("*")
        .eq("university_id", campusId)
        .maybeSingle()
    : { data: null, error: null };
  const settings = (data as CampusSettings | null) ?? null;

  if (settingsError) console.error("Campus settings query failed:", settingsError);
  const values = { ...defaults, ...settings };
  const canInitialize = ctx.profile.role === "super_admin";

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={selectedCampus?.name ?? ctx.institutionName}
      pageTitle="Campus Settings"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <Settings size={21} color="var(--accent-highlight)" />
            <div style={{ flex: "1 1 240px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 750 }}>Campus operating rules</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                Configure report handling, sign-up requirements, and campus map defaults.
              </p>
            </div>
            <CampusSelector
              campuses={campuses}
              selectedCampusId={campusId}
              canSelect={ctx.profile.role === "super_admin"}
            />
          </div>
        </Card>

        {params.notice && notices[params.notice] && <Alert variant="success">{notices[params.notice]}</Alert>}
        {params.warning === "audit_failed" && (
          <Alert variant="warning">
            Settings were saved, but their audit record could not be written. Contact support.
          </Alert>
        )}
        {params.error && <Alert variant="danger">{errors[params.error] ?? "The request could not be completed."}</Alert>}
        {(campusError || settingsError || !supabase) && (
          <Alert variant="danger">Campus settings could not be loaded.</Alert>
        )}
        {!selectedCampus && !campusError && (
          <Alert variant="warning">No campus is assigned to this account or available for management.</Alert>
        )}
        {campusId && !settings && !settingsError && !canInitialize && (
          <Alert variant="warning">
            Campus settings have not been initialized. A Super Admin must open this page once to create the settings record.
          </Alert>
        )}

        {campusId && (!settingsError && (settings || canInitialize)) && (
          <Card>
            <form action={saveCampusSettingsAction} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <input type="hidden" name="universityId" value={campusId} />

              <section>
                <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Registration and reports</h3>
                <div style={{ display: "grid", gap: "11px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      name="requireMatricNumber"
                      defaultChecked={values.require_matric_number}
                      style={{ width: "16px", height: "16px" }}
                    />
                    Require a matric number during onboarding
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      name="autoApproveReports"
                      defaultChecked={values.auto_approve_reports}
                      style={{ width: "16px", height: "16px" }}
                    />
                    Automatically approve submitted reports
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      name="allowPublicComments"
                      defaultChecked={values.allow_public_comments}
                      style={{ width: "16px", height: "16px" }}
                    />
                    Allow public comments on reports
                  </label>
                </div>
                <div style={{ marginTop: "14px" }}>
                  <FormField
                    label="Allowed email domains"
                    htmlFor="allowed-domains"
                    optional
                    hint="Separate domains with commas or spaces; leave empty to allow any domain."
                  >
                    <Input
                      id="allowed-domains"
                      name="allowedEmailDomains"
                      defaultValue={values.allowed_email_domains.join(", ")}
                      placeholder="campus.edu, students.campus.edu"
                    />
                  </FormField>
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Duplicate report detection</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  <FormField label="Distance (meters)" htmlFor="duplicate-distance">
                    <Input
                      id="duplicate-distance"
                      name="duplicateDistance"
                      type="number"
                      min={1}
                      max={10000}
                      defaultValue={values.duplicate_distance_meters}
                      required
                    />
                  </FormField>
                  <FormField label="Time window (hours)" htmlFor="duplicate-window">
                    <Input
                      id="duplicate-window"
                      name="duplicateWindow"
                      type="number"
                      min={1}
                      max={8760}
                      defaultValue={values.duplicate_time_window_hours}
                      required
                    />
                  </FormField>
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Campus map</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  <FormField label="Map center latitude" htmlFor="map-latitude" optional>
                    <Input
                      id="map-latitude"
                      name="mapLatitude"
                      type="number"
                      min="-90"
                      max="90"
                      step="any"
                      defaultValue={values.map_center_lat ?? ""}
                    />
                  </FormField>
                  <FormField label="Map center longitude" htmlFor="map-longitude" optional>
                    <Input
                      id="map-longitude"
                      name="mapLongitude"
                      type="number"
                      min="-180"
                      max="180"
                      step="any"
                      defaultValue={values.map_center_lng ?? ""}
                    />
                  </FormField>
                  <FormField label="Default zoom (1-22)" htmlFor="map-zoom">
                    <Input
                      id="map-zoom"
                      name="mapZoom"
                      type="number"
                      min={1}
                      max={22}
                      defaultValue={values.map_default_zoom}
                      required
                    />
                  </FormField>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14px", marginTop: "12px" }}>
                  <input
                    type="checkbox"
                    name="mapConfigured"
                    defaultChecked={values.map_configured}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Mark campus map as configured
                </label>
              </section>

              <div><Button type="submit">Save campus settings</Button></div>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
