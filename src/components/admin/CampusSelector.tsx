import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/FormField";

interface CampusSelectorProps {
  campuses: Array<{ id: string; name: string; is_active: boolean }>;
  selectedCampusId: string | null;
  canSelect: boolean;
}

export function CampusSelector({
  campuses,
  selectedCampusId,
  canSelect,
}: CampusSelectorProps) {
  const selectedCampus = campuses.find((campus) => campus.id === selectedCampusId);

  if (canSelect) {
    return (
      <form
        method="get"
        style={{ display: "flex", alignItems: "end", gap: "10px", flexWrap: "wrap" }}
      >
        <div style={{ minWidth: "240px", flex: "1 1 240px" }}>
          <label
            htmlFor="universityId"
            style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}
          >
            Campus workspace
          </label>
          <Select
            id="universityId"
            name="universityId"
            defaultValue={selectedCampusId ?? ""}
            required
          >
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}{campus.is_active ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          Open campus
        </Button>
      </form>
    );
  }

  return (
    <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
      Campus workspace: <strong>{selectedCampus?.name ?? "No campus assigned"}</strong>
    </p>
  );
}
