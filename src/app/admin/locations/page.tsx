import { MapPin } from "lucide-react";
import {
  saveLocationAction,
  setLocationActiveAction,
} from "@/app/actions/campus-operations";
import { CampusSelector } from "@/components/admin/CampusSelector";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { selectAdminCampusId } from "@/lib/auth/admin-campus";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { CampusLocation } from "@/types/database";

export const metadata = { title: "Campus Locations" };

type SearchParams = Promise<{
  universityId?: string;
  notice?: string;
  error?: string;
  warning?: string;
}>;

const notices: Record<string, string> = {
  location_created: "Campus location created.",
  location_updated: "Campus location updated.",
  location_activated: "Campus location activated.",
  location_deactivated: "Campus location deactivated.",
};
const errors: Record<string, string> = {
  invalid_location: "Enter a valid name and location type.",
  invalid_coordinates: "Enter both coordinates, with latitude from -90 to 90 and longitude from -180 to 180.",
  service_unavailable: "Campus operations are temporarily unavailable.",
  campus_unavailable: "The selected campus could not be loaded.",
  location_save_failed: "The location could not be saved. Check that its name is unique on this campus.",
};

const locationTypes = [
  ["academic", "Academic"],
  ["hostel", "Hostel"],
  ["administrative", "Administrative"],
  ["road", "Road"],
  ["utility", "Utility"],
  ["recreation", "Recreation"],
  ["facility", "Facility"],
  ["other", "Other"],
] as const;

export default async function CampusLocationsPage({
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

  if (campusError) console.error("Campus location campus list query failed:", campusError);
  const campusId = selectAdminCampusId(
    ctx.profile.role,
    ctx.profile.university_id,
    params.universityId ?? null,
    campuses.map((campus) => campus.id)
  );
  const selectedCampus = campuses.find((campus) => campus.id === campusId);
  const { data, error: locationsError } = supabase && campusId
    ? await supabase
        .from("campus_locations")
        .select("*")
        .eq("university_id", campusId)
        .order("name")
    : { data: null, error: null };
  const locations = (data ?? []) as CampusLocation[];

  if (locationsError) console.error("Campus location list query failed:", locationsError);

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={selectedCampus?.name ?? ctx.institutionName}
      pageTitle="Campus Locations"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <MapPin size={21} color="var(--accent-highlight)" />
            <div style={{ flex: "1 1 240px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 750 }}>Campus location directory</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                Maintain named locations used by reports and the campus map.
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
            The location change was saved, but its audit record could not be written. Contact support.
          </Alert>
        )}
        {params.error && <Alert variant="danger">{errors[params.error] ?? "The request could not be completed."}</Alert>}
        {(campusError || locationsError || !supabase) && (
          <Alert variant="danger">Campus location data could not be loaded.</Alert>
        )}
        {!selectedCampus && !campusError && (
          <Alert variant="warning">No campus is assigned to this account or available for management.</Alert>
        )}

        {campusId && (
          <Card>
            <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "14px" }}>Add a location</h2>
            <form action={saveLocationAction} style={{ display: "grid", gap: "14px" }}>
              <input type="hidden" name="universityId" value={campusId} />
              <input type="hidden" name="locationId" value="" />
              <FormField label="Location name" htmlFor="location-name">
                <Input id="location-name" name="name" minLength={2} maxLength={120} required />
              </FormField>
              <FormField label="Location type" htmlFor="location-type">
                <Select id="location-type" name="locationType" defaultValue="facility">
                  {locationTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </FormField>
              <FormField label="Building code" htmlFor="location-building-code" optional>
                <Input id="location-building-code" name="buildingCode" maxLength={40} />
              </FormField>
              <FormField label="Description" htmlFor="location-description" optional>
                <Textarea id="location-description" name="description" maxLength={500} />
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <FormField label="Latitude" htmlFor="location-latitude" optional>
                  <Input id="location-latitude" name="latitude" type="number" step="any" min="-90" max="90" />
                </FormField>
                <FormField label="Longitude" htmlFor="location-longitude" optional>
                  <Input id="location-longitude" name="longitude" type="number" step="any" min="-180" max="180" />
                </FormField>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                Coordinates are optional; add both together only after the location is verified.
              </p>
              <div><Button type="submit">Add location</Button></div>
            </form>
          </Card>
        )}

        <Card>
          <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "14px" }}>
            Locations {selectedCampus ? `at ${selectedCampus.name}` : ""}
          </h2>
          {!locations.length ? (
            <p style={{ color: "var(--text-secondary)" }}>
              {locationsError ? "Campus locations are unavailable." : "No locations have been added yet."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {locations.map((location) => (
                <div key={location.id} style={{ padding: "15px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
                    <strong>{location.name}</strong>
                    <Badge tone={location.is_active ? "success" : "neutral"}>
                      {location.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <form action={saveLocationAction} style={{ display: "grid", gap: "12px" }}>
                    <input type="hidden" name="universityId" value={campusId ?? ""} />
                    <input type="hidden" name="locationId" value={location.id} />
                    <FormField label="Location name" htmlFor={`location-name-${location.id}`}>
                      <Input id={`location-name-${location.id}`} name="name" defaultValue={location.name} minLength={2} maxLength={120} required />
                    </FormField>
                    <FormField label="Location type" htmlFor={`location-type-${location.id}`}>
                      <Select id={`location-type-${location.id}`} name="locationType" defaultValue={location.location_type}>
                        {locationTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Building code" htmlFor={`location-building-code-${location.id}`} optional>
                      <Input id={`location-building-code-${location.id}`} name="buildingCode" defaultValue={location.building_code ?? ""} maxLength={40} />
                    </FormField>
                    <FormField label="Description" htmlFor={`location-description-${location.id}`} optional>
                      <Textarea id={`location-description-${location.id}`} name="description" defaultValue={location.description ?? ""} maxLength={500} />
                    </FormField>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                      <FormField label="Latitude" htmlFor={`location-latitude-${location.id}`} optional>
                        <Input id={`location-latitude-${location.id}`} name="latitude" type="number" step="any" min="-90" max="90" defaultValue={location.latitude ?? ""} />
                      </FormField>
                      <FormField label="Longitude" htmlFor={`location-longitude-${location.id}`} optional>
                        <Input id={`location-longitude-${location.id}`} name="longitude" type="number" step="any" min="-180" max="180" defaultValue={location.longitude ?? ""} />
                      </FormField>
                    </div>
                    <div><Button type="submit" variant="secondary" size="sm">Save changes</Button></div>
                  </form>
                  <form action={setLocationActiveAction} style={{ marginTop: "8px" }}>
                    <input type="hidden" name="universityId" value={campusId ?? ""} />
                    <input type="hidden" name="locationId" value={location.id} />
                    <input type="hidden" name="isActive" value={String(!location.is_active)} />
                    <Button type="submit" size="sm" variant="ghost">
                      {location.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
