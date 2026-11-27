"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LocationPicker() {
  const [status, setStatus] = useState("Optional");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  function detectLocation() {
    if (!navigator.geolocation) {
      setStatus("GPS is not supported by this browser");
      return;
    }

    setStatus("Locating...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setStatus("Location added");
      },
      () => setStatus("Could not access location"),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />
      <Button type="button" variant="secondary" size="sm" onClick={detectLocation}>
        <MapPin size={15} />
        {latitude ? "Update exact location" : "Use my current location"}
      </Button>
      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{status}</span>
    </div>
  );
}
