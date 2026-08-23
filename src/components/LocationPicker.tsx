import { useState } from "react";
import { Crosshair, GlobeHemisphereWest, MapPinLine } from "@phosphor-icons/react";
import type { Language, LocationMode, UserLocation } from "../types";
import { createTranslator } from "../i18n";
import { PrimaryButton, Segmented } from "./Controls";

export function LocationPicker({
  language,
  mode,
  location,
  onChange,
}: {
  language: Language;
  mode: LocationMode | null;
  location: UserLocation | null;
  onChange(mode: LocationMode, location: UserLocation): void;
}) {
  const t = createTranslator(language);
  const [activeMode, setActiveMode] = useState<LocationMode | null>(mode);
  const [city, setCity] = useState(location?.type === "city" ? location.city : "");
  const [country, setCountry] = useState(location?.type === "city" ? location.country : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function detectPrecise() {
    setBusy(true);
    setError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000,
        }),
      );
      onChange(
        "precise",
        await window.athanBuddy.reverseLocation(position.coords.latitude, position.coords.longitude),
      );
    } catch {
      setError(t("locationError"));
    } finally {
      setBusy(false);
    }
  }

  async function detectIp() {
    setBusy(true);
    setError(null);
    try {
      onChange("ip", await window.athanBuddy.detectIpLocation());
    } catch {
      setError(t("locationError"));
    } finally {
      setBusy(false);
    }
  }

  function chooseMode(nextMode: LocationMode) {
    setActiveMode(nextMode);
    setError(null);
  }

  const selectedLocation = location
    ? location.type === "city"
      ? `${location.city}, ${location.country}`
      : [location.city, location.country].filter(Boolean).join(", ") || `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`
    : null;

  return (
    <div className="location-picker">
      <Segmented
        value={activeMode}
        onChange={chooseMode}
        ariaLabel={t("location")}
        options={[
          { value: "precise", label: t("precise"), icon: <Crosshair size={19} /> },
          { value: "ip", label: t("ipLocation"), icon: <GlobeHemisphereWest size={19} /> },
          { value: "manual", label: t("manual"), icon: <MapPinLine size={19} /> },
        ]}
      />

      {activeMode === "manual" ? (
        <div className="manual-location-grid">
          <label>
            <span>{t("city")}</span>
            <input value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" />
          </label>
          <label>
            <span>{t("country")}</span>
            <input value={country} onChange={(event) => setCountry(event.target.value)} autoComplete="country-name" />
          </label>
          <PrimaryButton
            disabled={!city.trim() || !country.trim()}
            onClick={() => onChange("manual", { type: "city", source: "manual", city: city.trim(), country: country.trim() })}
          >
            {t("saveLocation")}
          </PrimaryButton>
        </div>
      ) : activeMode ? (
        <PrimaryButton disabled={busy} onClick={activeMode === "precise" ? detectPrecise : detectIp}>
          {busy ? t("locating") : t("detectLocation")}
        </PrimaryButton>
      ) : null}

      {selectedLocation && <div className="location-confirmed"><MapPinLine size={18} weight="fill" /> {selectedLocation}</div>}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </div>
  );
}
