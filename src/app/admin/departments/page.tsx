import { Building2 } from "lucide-react";
import {
  saveDepartmentAction,
  setDepartmentActiveAction,
} from "@/app/actions/campus-operations";
import { AppShell } from "@/components/layout/AppShell";
import { CampusSelector } from "@/components/admin/CampusSelector";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input, Textarea } from "@/components/ui/FormField";
import { selectAdminCampusId } from "@/lib/auth/admin-campus";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Department } from "@/types/database";

export const metadata = { title: "Campus Departments" };

type SearchParams = Promise<{
  universityId?: string;
  notice?: string;
  error?: string;
  warning?: string;
}>;

const notices: Record<string, string> = {
  department_created: "Department created.",
  department_updated: "Department updated.",
  department_activated: "Department activated.",
  department_deactivated: "Department deactivated.",
};
const errors: Record<string, string> = {
  invalid_department: "Enter a valid department name and contact email.",
  service_unavailable: "Campus operations are temporarily unavailable.",
  campus_unavailable: "The selected campus could not be loaded.",
  department_save_failed: "The department could not be saved. Check that its name is unique on this campus.",
};

export default async function DepartmentsPage({
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

  if (campusError) console.error("Department campus list query failed:", campusError);
  const campusId = selectAdminCampusId(
    ctx.profile.role,
    ctx.profile.university_id,
    params.universityId ?? null,
    campuses.map((campus) => campus.id)
  );
  const selectedCampus = campuses.find((campus) => campus.id === campusId);
  const { data, error: departmentsError } = supabase && campusId
    ? await supabase
        .from("departments")
        .select("*")
        .eq("university_id", campusId)
        .order("name")
    : { data: null, error: null };
  const departments = (data ?? []) as Department[];

  if (departmentsError) console.error("Department list query failed:", departmentsError);

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={selectedCampus?.name ?? ctx.institutionName}
      pageTitle="Campus Departments"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <Building2 size={21} color="var(--accent-highlight)" />
            <div style={{ flex: "1 1 240px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 750 }}>Department directory</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                Create and maintain the departments available for campus operations.
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
            The department change was saved, but its audit record could not be written. Contact support.
          </Alert>
        )}
        {params.error && <Alert variant="danger">{errors[params.error] ?? "The request could not be completed."}</Alert>}
        {(campusError || departmentsError || !supabase) && (
          <Alert variant="danger">Campus department data could not be loaded.</Alert>
        )}
        {!selectedCampus && !campusError && (
          <Alert variant="warning">No campus is assigned to this account or available for management.</Alert>
        )}

        {campusId && (
          <Card>
            <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "14px" }}>Add a department</h2>
            <form action={saveDepartmentAction} style={{ display: "grid", gap: "14px" }}>
              <input type="hidden" name="universityId" value={campusId} />
              <input type="hidden" name="departmentId" value="" />
              <FormField label="Department name" htmlFor="department-name">
                <Input id="department-name" name="name" minLength={2} maxLength={100} required />
              </FormField>
              <FormField label="Description" htmlFor="department-description" optional>
                <Textarea id="department-description" name="description" maxLength={500} />
              </FormField>
              <FormField label="Contact email" htmlFor="department-email" optional>
                <Input id="department-email" name="contactEmail" type="email" />
              </FormField>
              <div><Button type="submit">Add department</Button></div>
            </form>
          </Card>
        )}

        <Card>
          <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "14px" }}>
            Departments {selectedCampus ? `at ${selectedCampus.name}` : ""}
          </h2>
          {!departments.length ? (
            <p style={{ color: "var(--text-secondary)" }}>
              {departmentsError ? "Department list is unavailable." : "No departments have been added yet."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {departments.map((department) => (
                <div key={department.id} style={{ padding: "15px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
                    <strong>{department.name}</strong>
                    <Badge tone={department.is_active ? "success" : "neutral"}>
                      {department.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <form action={saveDepartmentAction} style={{ display: "grid", gap: "12px" }}>
                    <input type="hidden" name="universityId" value={campusId ?? ""} />
                    <input type="hidden" name="departmentId" value={department.id} />
                    <FormField label="Department name" htmlFor={`department-name-${department.id}`}>
                      <Input
                        id={`department-name-${department.id}`}
                        name="name"
                        defaultValue={department.name}
                        minLength={2}
                        maxLength={100}
                        required
                      />
                    </FormField>
                    <FormField label="Description" htmlFor={`department-description-${department.id}`} optional>
                      <Textarea
                        id={`department-description-${department.id}`}
                        name="description"
                        defaultValue={department.description ?? ""}
                        maxLength={500}
                      />
                    </FormField>
                    <FormField label="Contact email" htmlFor={`department-email-${department.id}`} optional>
                      <Input
                        id={`department-email-${department.id}`}
                        name="contactEmail"
                        type="email"
                        defaultValue={department.contact_email ?? ""}
                      />
                    </FormField>
                    <div><Button type="submit" variant="secondary" size="sm">Save changes</Button></div>
                  </form>
                  <form action={setDepartmentActiveAction} style={{ marginTop: "8px" }}>
                    <input type="hidden" name="universityId" value={campusId ?? ""} />
                    <input type="hidden" name="departmentId" value={department.id} />
                    <input type="hidden" name="isActive" value={String(!department.is_active)} />
                    <Button type="submit" size="sm" variant="ghost">
                      {department.is_active ? "Deactivate" : "Activate"}
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
