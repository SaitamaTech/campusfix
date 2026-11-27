"use client";

import React, { useState } from "react";
import { Camera, CheckCircle2, MapPin, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
}: {
  studentName: string;
  universityName: string;
}) {
  const [step, setStep] = useState(0);
  const current = ONBOARDING_SLIDES[step];
  const Icon = current.icon;
  const isLast = step === ONBOARDING_SLIDES.length - 1;

  return (
    <Card highlighted style={{ maxWidth: "680px", width: "100%", marginInline: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "18px", flexWrap: "wrap" }}>
        <Badge tone="orange" dot>
          {current.badge}
        </Badge>
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          {universityName}
        </span>
      </div>

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
            color: "#fda4af",
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
            <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{pt}</span>
          </div>
        ))}
      </div>

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
              <Button type="submit" variant="primary">
                Enter Student Dashboard
                <ArrowRight size={15} />
              </Button>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}
