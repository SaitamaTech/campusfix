import { Search, ShieldAlert, Users } from "lucide-react";
import { updateAccountRoleAction, updateAccountStatusAction } from "@/app/actions/super-admin";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/FormField";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Account Management" };

type SearchParams = Promise<{
  q?: string;
  role?: string;
  status?: string;
  notice?: string;
  error?: string;
}>;

const notices: Record<string, string> = {
  role_saved: "Account role updated.",
  account_suspended: "Account suspended.",
  account_reactivated: "Account reactivated.",
};

const errors: Record<string, string> = {
  invalid_account: "The account update request was invalid.",
  protected_account: "You cannot change your own account or another Super Admin.",
  campus_required: "Choose an active campus before assigning the Campus Admin role.",
  service_unavailable: "Account management is temporarily unavailable.",
  account_update_failed: "The account could not be updated. It may be protected or no longer available.",
};

export default async function SuperAdminAccountsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireRole(["super_admin"], { includeUniversity: false });
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 120);
  const roleFilter = ["student", "campus_admin", "super_admin"].includes(params.role ?? "")
    ? params.role
    : "";
  const statusFilter = ["active", "suspended"].includes(params.status ?? "")
    ? params.status
    : "";
  const supabase = await createClient();

  let accounts: Array<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    university_id: string | null;
    is_active: boolean;
    created_at: string;
  }> = [];
  let campuses: Array<{ id: string; name: string }> = [];
  let dataUnavailable = !supabase;

  if (supabase) {
    let accountQuery = supabase
      .from("profiles")
      .select("id, full_name, email, role, university_id, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (query) {
      accountQuery = accountQuery.ilike("email", `%${query.replace(/[%_]/g, "\\$&")}%`);
    }
    if (roleFilter) {
      accountQuery = accountQuery.eq("role", roleFilter);
    }
    if (statusFilter) {
      accountQuery = accountQuery.eq("is_active", statusFilter === "active");
    }

    const [accountResult, campusResult] = await Promise.all([
      accountQuery,
      supabase
        .from("universities")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
    ]);

    if (accountResult.error || campusResult.error) {
      dataUnavailable = true;
      console.error(
        "Super-admin account list query failed:",
        accountResult.error ?? campusResult.error
      );
    } else {
      accounts = accountResult.data ?? [];
      campuses = campusResult.data ?? [];
    }
  }

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={ctx.institutionName}
      pageTitle="Account Management"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <Users size={20} color="var(--accent-highlight)" />
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 750 }}>Platform accounts</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                Assign Campus Admin access or suspend/reactivate non-Super-Admin accounts.
              </p>
            </div>
          </div>
          <form
            method="get"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "10px",
              alignItems: "end",
            }}
          >
            <div>
              <label htmlFor="q" style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}>
                Search email
              </label>
              <Input id="q" name="q" type="search" defaultValue={query} placeholder="name@example.com" />
            </div>
            <div>
              <label htmlFor="role" style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}>
                Role
              </label>
              <Select id="role" name="role" defaultValue={roleFilter}>
                <option value="">All roles</option>
                <option value="student">Student</option>
                <option value="campus_admin">Campus Admin</option>
                <option value="super_admin">Super Admin</option>
              </Select>
            </div>
            <div>
              <label htmlFor="status" style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}>
                Status
              </label>
              <Select id="status" name="status" defaultValue={statusFilter}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              <Search size={15} />
              Search
            </Button>
          </form>
        </Card>

        {params.notice && notices[params.notice] && (
          <Alert variant="success">{notices[params.notice]}</Alert>
        )}
        {params.error && (
          <Alert variant="danger">
            {errors[params.error] ?? "The request could not be completed."}
          </Alert>
        )}
        {dataUnavailable && (
          <Alert variant="danger">
            Account data could not be loaded. Please refresh or contact support.
          </Alert>
        )}
        {!dataUnavailable && campuses.length === 0 && (
          <Alert variant="warning">
            No active campuses are available for Campus Admin assignments.
          </Alert>
        )}

        <Card>
          {accounts.length === 0 ? (
            <p style={{ textAlign: "center", padding: "28px", color: "var(--text-secondary)" }}>
              {dataUnavailable ? "No account results are available." : "No accounts match this search."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {accounts.map((account) => {
                const protectedAccount =
                  account.role === "super_admin" || account.id === ctx.userId;
                return (
                  <section
                    key={account.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "16px",
                      padding: "16px",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div>
                      <strong>{account.full_name}</strong>
                      <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "3px" }}>
                        {account.email}
                      </p>
                      <div style={{ display: "flex", gap: "8px", marginTop: "9px", flexWrap: "wrap" }}>
                        <Badge tone={account.role === "super_admin" ? "violet" : "neutral"}>
                          {account.role.replace("_", " ")}
                        </Badge>
                        <Badge tone={account.is_active ? "success" : "red"}>
                          {account.is_active ? "Active" : "Suspended"}
                        </Badge>
                      </div>
                    </div>

                    {protectedAccount ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px" }}>
                        <ShieldAlert size={16} />
                        {account.id === ctx.userId
                          ? "Your own account is protected."
                          : "Super Admin accounts are protected."}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <form
                          action={updateAccountRoleAction}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                            gap: "8px",
                            alignItems: "end",
                          }}
                        >
                          <input type="hidden" name="profileId" value={account.id} />
                          <div>
                            <label htmlFor={`role-${account.id}`} style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>
                              Role
                            </label>
                            <Select id={`role-${account.id}`} name="role" defaultValue={account.role}>
                              <option value="student">Student</option>
                              <option value="campus_admin">Campus Admin</option>
                            </Select>
                          </div>
                          <div>
                            <label htmlFor={`campus-${account.id}`} style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>
                              Campus assignment
                            </label>
                            <Select
                              id={`campus-${account.id}`}
                              name="universityId"
                              defaultValue={account.university_id ?? ""}
                            >
                              <option value="">Select campus</option>
                              {campuses.map((campus) => (
                                <option key={campus.id} value={campus.id}>{campus.name}</option>
                              ))}
                            </Select>
                          </div>
                          <Button type="submit" size="sm" variant="secondary">Save role</Button>
                        </form>
                        <form action={updateAccountStatusAction}>
                          <input type="hidden" name="profileId" value={account.id} />
                          <input type="hidden" name="isActive" value={String(!account.is_active)} />
                          <Button
                            type="submit"
                            size="sm"
                            variant={account.is_active ? "ghost" : "highlight"}
                          >
                            {account.is_active ? "Suspend account" : "Reactivate account"}
                          </Button>
                        </form>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
