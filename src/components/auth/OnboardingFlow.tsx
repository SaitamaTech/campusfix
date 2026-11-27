"use client";

import React, { useEffect, useState } from "react";
import { Camera, CheckCircle2, MapPin, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { FormField, Select } from "@/components/ui/FormField";
import { completeOnboardingAction } from "@/app/actions/auth";

const ONBOARDING_SLIDES = [
  {
    badge: "Step 1 of 3 — Report with Clarity",
    title: "Document campus issues in under 60 seconds",
    icon: Camera,
    body: "Spot broken classroom furniture, blocked drainage, water supply interruptions, or unsafe walkways? Capture a clear photograph, choose the category, and select a campus location or map point.",
    points: [
      "Device GPS is always optional — manual location selection works everywhere.",
      "Every report receives a unique tracking reference (e.g. CFX-...).",
    ],
  },
  {
    badge: "Step 2 of 3 — Community Verification",
    title: "Strengthen reports together",
    icon: ShieldCheck,
    body: "Before submitting, CampusFix checks for nearby similar issues so effort isn't duplicated. On existing reports, fellow students can confirm the issue exists or note when it appears fixed.",
    points: [
      "One active verification per student per report; self-verification is blocked.",
      "Confidence scores are calculated transparently on the server.",
    ],
  },
  {
    badge: "Step 3 of 3 — Full Lifecycle Tracking",
    title: "Follow every administrative action",
    icon: MapPin,
    body: "Track your report from Submitted through Under Review, Approved, Assigned, In Progress, and Resolved. Administrators document completed fixes, and you can request a review if a resolution is incomplete.",
    points: [
      "Real-time notifications keep you informed of every milestone.",
      "Public campus statistics update directly from verified records.",
    ],
  },
];

export function OnboardingFlow({
  studentName,
  universityName,
  needsUniversitySelection,
  countries,
  countryLoadWarning,
  onboardingError,
}: {
  studentName: string;
  universityName: string | null;
  needsUniversitySelection: boolean;
  countries: string[];
  countryLoadWarning: string | null;
  onboardingError: string | null;
}) {
  const [step, setStep] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [universities, setUniversities] = useState<
    Array<{ id: string; name: string; short_name: string }>
  >([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [universityLoadError, setUniversityLoadError] = useState<string | null>(null);
  const current = ONBOARDING_SLIDES[step];
  const Icon = current.icon;
  const isLast = step === ONBOARDING_SLIDES.length - 1;

  useEffect(() => {
    if (!selectedCountry || countryLoadWarning || countries.length === 0) {
      return;
    }

    const controller = new AbortController();

    async function loadUniversities() {
      try {
        const response = await fetch(
          `/api/universities?country=${encodeURIComponent(selectedCountry)}`,
          { signal: controller.signal }
        );
        const result = (await response.json()) as {
          universities?: Array<{ id: string; name: string; short_name: string }>;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(result.error ?? "Could not load universities.");
        }

        setUniversities(result.universities ?? []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Could not load universities during onboarding:", error);
        setUniversityLoadError("Universities for this country could not be loaded.");
      } finally {
        if (!controller.signal.aborted) {
          setLoadingUniversities(false);
        }
      }
    }

    void loadUniversities();
    return () => controller.abort();
  }, [selectedCountry, countries, countryLoadWarning]);

  return (
    <Card highlighted style={{ maxWidth: "680px", width: "100%", marginInline: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "18px", flexWrap: "wrap" }}>
        <Badge tone="orange" dot>
          {current.badge}
        </Badge>
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          {needsUniversitySelection ? "Choose your campus below" : universityName ?? "CampusFix Institution"}
        </span>
      </div>

      {onboardingError && <Alert variant="danger">{onboardingError}</Alert>}
      {countryLoadWarning && <Alert variant="warning">{countryLoadWarning}</Alert>}
      {universityLoadError && <Alert variant="danger">{universityLoadError}</Alert>}

      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "12px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--accent-primary-soft)",
            border: "1px solid var(--accent-primary-border)",
            color: "var(--accent-primary)",
            flexShrink: 0,
          }}
        >
          <Icon size={22} />
        </div>
        <div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Welcome, {studentName}
          </p>
          <h1 style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em" }}>
            {current.title}
          </h1>
        </div>
      </div>

      <p style={{ color: "var(--text-secondary)", fontSize: "15px", marginBottom: "18px" }}>
        {current.body}
      </p>

      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "24px",
        }}
      >
        {current.points.map((pt) => (
          <div key={pt} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13.5px" }}>
            <CheckCircle2 size={16} color="var(--status-success)" style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{pt}</span>
          </div>
        ))}
      </div>

      {needsUniversitySelection && isLast && (
        <div style={{ display: "grid", gap: "14px", marginBottom: "22px" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Choose the campus you attend and use its institutional email. The first
            account to verify an approved campus email may become its campus admin.
          </p>
          {countries.length === 0 && !countryLoadWarning && (
            <Alert variant="info" title="No campus directory available">
              Apply the university directory migration before completing onboarding.
            </Alert>
          )}
          <FormField label="Country" htmlFor="onboarding-country">
            <Select
              id="onboarding-country"
              value={selectedCountry}
              onChange={(event) => {
                const country = event.target.value;
                setSelectedCountry(country);
                setUniversities([]);
                setSelectedUniversityId("");
                setUniversityLoadError(null);
                setLoadingUniversities(Boolean(country && countries.length > 0 && !countryLoadWarning));
              }}
              disabled={countries.length === 0 || Boolean(countryLoadWarning)}
            >
              <option value="">Select a country</option>
              {countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="University"
            htmlFor="onboarding-university"
            hint={
              loadingUniversities
                ? "Loading universities..."
                : selectedCountry
                  ? `${universities.length} universities listed in ${selectedCountry}`
                  : "Select a country to see its universities."
            }
          >
            <Select
              id="onboarding-university"
              value={selectedUniversityId}
              onChange={(event) => setSelectedUniversityId(event.target.value)}
              disabled={
                !selectedCountry ||
                loadingUniversities ||
                Boolean(universityLoadError) ||
                universities.length === 0
              }
            >
              <option value="">
                {loadingUniversities
                  ? "Loading universities..."
                  : universityLoadError
                    ? "University list unavailable"
                    : selectedCountry && universities.length > 0
                      ? "Select a university"
                      : selectedCountry
                        ? "No universities available in this country"
                        : "Select a country first"}
              </option>
              {universities.map((university) => (
                <option key={university.id} value={university.id}>
                  {university.name} ({university.short_name})
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      )}

      {/* Step Dots */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {ONBOARDING_SLIDES.map((s, idx) => (
            <button
              key={s.badge}
              type="button"
              aria-label={`Go to step ${idx + 1}`}
              onClick={() => setStep(idx)}
              style={{
                width: idx === step ? "28px" : "10px",
                height: "10px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                background: idx === step ? "var(--accent-highlight)" : "var(--bg-muted)",
                transition: "width 180ms ease",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={15} />
              Back
            </Button>
          )}

          {!isLast ? (
            <Button type="button" variant="primary" onClick={() => setStep((s) => s + 1)}>
              Next
              <ArrowRight size={15} />
            </Button>
          ) : (
            <form action={completeOnboardingAction}>
              {needsUniversitySelection && (
                <input type="hidden" name="universityId" value={selectedUniversityId} />
              )}
              <Button
                type="submit"
                variant="primary"
                disabled={needsUniversitySelection && !selectedUniversityId}
              >
                Continue to CampusFix
                <ArrowRight size={15} />
              </Button>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}
