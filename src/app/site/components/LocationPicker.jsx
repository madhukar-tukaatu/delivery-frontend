"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

const DEFAULT_CENTER = [27.7172, 85.324];
const NEPAL_BOUNDS = [
  [26.2, 80.0],
  [30.5, 88.3],
];

async function fetchJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Location service returned ${response.status}.`);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng, "map");
    },
  });

  return null;
}

function MapViewport({ latitude, longitude, zoom = 15 }) {
  const map = useMap();

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    map.flyTo([latitude, longitude], zoom, {
      animate: true,
      duration: 0.6,
    });
  }, [latitude, longitude, map, zoom]);

  return null;
}

function formatCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(7) : "";
}

export default function LocationPicker({
  label,
  value,
  onChange,
  placeholder = "Select location on map",
  isDark = true,
  allowCurrentLocation = true,
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    address: "",
    latitude: null,
    longitude: null,
    source: null,
    accuracy: null,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const selectedLatitude = Number(value?.latitude);
  const selectedLongitude = Number(value?.longitude);
  const hasSelection =
    Number.isFinite(selectedLatitude) &&
    Number.isFinite(selectedLongitude) &&
    Boolean(value?.address);

  const mapLatitude = Number(draft.latitude);
  const mapLongitude = Number(draft.longitude);
  const hasDraftPoint =
    Number.isFinite(mapLatitude) && Number.isFinite(mapLongitude);

  const mapCenter = useMemo(
    () =>
      hasDraftPoint
        ? [mapLatitude, mapLongitude]
        : DEFAULT_CENTER,
    [hasDraftPoint, mapLatitude, mapLongitude],
  );

  const colors = {
    text: isDark ? "#F1F5F9" : "#0F172A",
    muted: isDark ? "#94A3B8" : "#475569",
    panel: isDark ? "#0D1B2A" : "#FFFFFF",
    panelAlt: isDark ? "#111F2F" : "#F8FAFC",
    border: isDark
      ? "rgba(255,255,255,0.12)"
      : "rgba(15,23,42,0.14)",
    input: isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(15,23,42,0.04)",
  };

  function openPicker() {
    setDraft({
      address: value?.address || "",
      latitude: hasSelection ? selectedLatitude : null,
      longitude: hasSelection ? selectedLongitude : null,
      source: value?.source || null,
      accuracy: value?.accuracy ?? null,
    });
    setQuery(value?.address || "");
    setResults([]);
    setError("");
    setOpen(true);
  }

  function clearLocation() {
    onChange({
      address: "",
      latitude: "",
      longitude: "",
      source: null,
      accuracy: null,
    });
  }

  async function reverseGeocode(latitude, longitude) {
    setIsResolving(true);
    setError("");

    try {
      const url =
        "https://nominatim.openstreetmap.org/reverse" +
        `?format=jsonv2&lat=${encodeURIComponent(latitude)}` +
        `&lon=${encodeURIComponent(longitude)}` +
        "&zoom=18&addressdetails=1";

      const data = await fetchJson(url);
      return data?.display_name || "";
    } catch (requestError) {
      setError(
        requestError?.name === "AbortError"
          ? "Address lookup timed out. The coordinates are still selected."
          : "The coordinates were selected, but the address could not be detected automatically.",
      );
      return "";
    } finally {
      setIsResolving(false);
    }
  }

  async function selectPoint(latitude, longitude, source, accuracy = null) {
    const normalizedLatitude = Number(latitude);
    const normalizedLongitude = Number(longitude);

    if (
      !Number.isFinite(normalizedLatitude) ||
      !Number.isFinite(normalizedLongitude)
    ) {
      setError("The selected coordinates are invalid.");
      return;
    }

    setDraft((previous) => ({
      ...previous,
      latitude: normalizedLatitude,
      longitude: normalizedLongitude,
      source,
      accuracy,
    }));
    setResults([]);

    const detectedAddress = await reverseGeocode(
      normalizedLatitude,
      normalizedLongitude,
    );

    if (detectedAddress) {
      setDraft((previous) => ({
        ...previous,
        address: detectedAddress,
      }));
      setQuery(detectedAddress);
    }
  }

  async function handleSearch(event) {
    event?.preventDefault();

    const cleanQuery = query.trim();
    if (cleanQuery.length < 3) {
      setError("Enter at least 3 characters to search.");
      return;
    }

    setIsSearching(true);
    setError("");
    setResults([]);

    try {
      const url =
        "https://nominatim.openstreetmap.org/search" +
        `?format=jsonv2&addressdetails=1&countrycodes=np&limit=5&q=${encodeURIComponent(cleanQuery)}`;

      const data = await fetchJson(url);
      const normalizedResults = Array.isArray(data) ? data : [];
      setResults(normalizedResults);

      if (normalizedResults.length === 0) {
        setError("No matching location was found in Nepal.");
      }
    } catch (requestError) {
      setError(
        requestError?.name === "AbortError"
          ? "Location search timed out. Please try again."
          : "Location search is temporarily unavailable.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function handleCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Location access is not supported by this browser.");
      return;
    }

    setIsLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        selectPoint(
          position.coords.latitude,
          position.coords.longitude,
          "gps",
          position.coords.accuracy,
        );
      },
      (locationError) => {
        setIsLocating(false);

        if (locationError.code === 1) {
          setError(
            "Location permission was denied. Search for the address or click the map instead.",
          );
          return;
        }

        setError(
          "Your current location could not be detected. Search for the address or click the map instead.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    );
  }

  function confirmLocation() {
    if (!hasDraftPoint) {
      setError("Select a location on the map first.");
      return;
    }

    const cleanAddress = draft.address.trim();
    if (!cleanAddress) {
      setError("Enter an address or landmark for the selected point.");
      return;
    }

    onChange({
      address: cleanAddress,
      latitude: Number(mapLatitude.toFixed(7)),
      longitude: Number(mapLongitude.toFixed(7)),
      source: draft.source || "map",
      accuracy:
        draft.accuracy === null || draft.accuracy === undefined
          ? null
          : Number(draft.accuracy),
    });

    setOpen(false);
  }

  const modal = open ? (
    <div
      className="tukaatu-location-modal-backdrop"
      data-location-picker-modal="true"
      data-prevent-slide-wheel="true"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} map selector`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setOpen(false);
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        background: "rgba(2,10,18,0.82)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="tukaatu-location-modal-panel"
        onMouseDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        style={{
          width: "min(960px, 100%)",
          maxHeight: "calc(100vh - 36px)",
          overflowY: "auto",
          borderRadius: 22,
          border: `1px solid ${colors.border}`,
          background: colors.panel,
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        }}
      >
        <div
          className="tukaatu-location-modal-header"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 500,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "16px 18px",
            borderBottom: `1px solid ${colors.border}`,
            background: colors.panel,
          }}
        >
          <div>
            <div
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: 900,
              }}
            >
              Select {label.toLowerCase()}
            </div>
            <div
              style={{
                marginTop: 3,
                color: colors.muted,
                fontSize: 12,
              }}
            >
              Search, use GPS, or click the exact point on the map.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close location selector"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: `1px solid ${colors.border}`,
              background: colors.input,
              color: colors.text,
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div className="tukaatu-location-modal-content" style={{ padding: 18 }}>
          <form
            className="tukaatu-location-search-form"
            onSubmit={handleSearch}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto auto",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <input
              className="tukaatu-location-search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search area, street, landmark or building"
              style={{
                minWidth: 0,
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                outline: "none",
                background: colors.input,
                color: colors.text,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />

            <button
              type="submit"
              disabled={isSearching}
              style={{
                padding: "12px 18px",
                border: "none",
                borderRadius: 12,
                background: "#FFD026",
                color: "#071722",
                fontWeight: 900,
                cursor: isSearching ? "wait" : "pointer",
                opacity: isSearching ? 0.7 : 1,
              }}
            >
              {isSearching ? "Searching..." : "Search"}
            </button>

            {allowCurrentLocation && (
              <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={isLocating}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  background: colors.input,
                  color: colors.text,
                  fontWeight: 800,
                  cursor: isLocating ? "wait" : "pointer",
                  opacity: isLocating ? 0.7 : 1,
                }}
              >
                {isLocating ? "Locating..." : "Use my location"}
              </button>
            )}
          </form>

          {results.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 12,
                padding: 8,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: colors.panelAlt,
              }}
            >
              {results.map((result) => (
                <button
                  type="button"
                  key={`${result.place_id}-${result.lat}-${result.lon}`}
                  onClick={() => {
                    const latitude = Number(result.lat);
                    const longitude = Number(result.lon);
                    setDraft({
                      address: result.display_name || query,
                      latitude,
                      longitude,
                      source: "search",
                      accuracy: null,
                    });
                    setQuery(result.display_name || query);
                    setResults([]);
                    setError("");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    borderRadius: 9,
                    background: "transparent",
                    color: colors.text,
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div
              style={{
                marginBottom: 12,
                padding: "9px 11px",
                borderRadius: 10,
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.10)",
                color: "#FCA5A5",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <div
            className="tukaatu-location-map"
            style={{
              height: "min(50vh, 440px)",
              minHeight: 320,
              overflow: "hidden",
              borderRadius: 16,
              border: `1px solid ${colors.border}`,
              position: "relative",
            }}
          >
            <MapContainer
              center={mapCenter}
              zoom={hasDraftPoint ? 16 : 12}
              minZoom={7}
              maxZoom={19}
              maxBounds={NEPAL_BOUNDS}
              maxBoundsViscosity={1}
              scrollWheelZoom
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapClickHandler onSelect={selectPoint} />

              {hasDraftPoint && (
                <>
                  <MapViewport
                    latitude={mapLatitude}
                    longitude={mapLongitude}
                  />
                  <CircleMarker
                    center={[mapLatitude, mapLongitude]}
                    radius={10}
                    pathOptions={{
                      color: "#071722",
                      fillColor: "#FFD026",
                      fillOpacity: 1,
                      weight: 3,
                    }}
                  >
                    <Popup>Selected delivery point</Popup>
                  </CircleMarker>
                </>
              )}
            </MapContainer>

            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 10,
                zIndex: 500,
                transform: "translateX(-50%)",
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(7,23,34,0.88)",
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: 800,
                pointerEvents: "none",
              }}
            >
              Click the exact pickup or delivery point
            </div>
          </div>

          <div
            className="tukaatu-location-footer"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: 12,
              marginTop: 14,
              alignItems: "end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 5,
                  color: colors.muted,
                  fontSize: 10,
                  fontWeight: 900,
                }}
              >
                ADDRESS / LANDMARK
              </label>
              <input
                type="text"
                value={draft.address}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    address: event.target.value,
                  }))
                }
                placeholder="Add building, shop, street or landmark details"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  outline: "none",
                  background: colors.input,
                  color: colors.text,
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />

              <div
                style={{
                  minHeight: 18,
                  marginTop: 6,
                  color: colors.muted,
                  fontSize: 11,
                }}
              >
                {hasDraftPoint
                  ? `${formatCoordinate(mapLatitude)}, ${formatCoordinate(mapLongitude)}${
                      draft.source === "gps" && draft.accuracy
                        ? ` • GPS accuracy ±${Math.round(draft.accuracy)} m`
                        : ""
                    }`
                  : "No point selected yet."}
                {isResolving ? " • Detecting address..." : ""}
              </div>
            </div>

            <button
              className="tukaatu-location-confirm-button"
              type="button"
              onClick={confirmLocation}
              disabled={!hasDraftPoint || isResolving}
              style={{
                padding: "12px 20px",
                border: "none",
                borderRadius: 12,
                background: "#FFD026",
                color: "#071722",
                fontWeight: 900,
                cursor:
                  !hasDraftPoint || isResolving ? "not-allowed" : "pointer",
                opacity: !hasDraftPoint || isResolving ? 0.55 : 1,
              }}
            >
              Confirm location
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="tukaatu-location-field">
        <label
          style={{
            display: "block",
            marginBottom: 4,
            color: colors.muted,
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {label}
        </label>

        <div
          className="tukaatu-location-control"
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 8,
          }}
        >
          <button
            className="tukaatu-location-main-button"
            type="button"
            onClick={openPicker}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "10px 11px",
              borderRadius: 10,
              border: `1px solid ${hasSelection ? "rgba(74,222,128,0.45)" : colors.border}`,
              background: colors.input,
              color: colors.text,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                overflow: "hidden",
                color: hasSelection ? colors.text : colors.muted,
                fontSize: 12,
                fontWeight: hasSelection ? 750 : 600,
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {hasSelection ? value.address : placeholder}
            </div>

            <div
              style={{
                marginTop: 3,
                color: hasSelection ? "#4ADE80" : colors.muted,
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              {hasSelection
                ? `${formatCoordinate(selectedLatitude)}, ${formatCoordinate(selectedLongitude)}`
                : "Map-confirmed coordinates required"}
            </div>
          </button>

          <button
            className="tukaatu-location-change-button"
            type="button"
            onClick={openPicker}
            style={{
              padding: "0 13px",
              border: "none",
              borderRadius: 10,
              background: "#027196",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 900,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {hasSelection ? "Change" : "Select map"}
          </button>

          {hasSelection && (
            <button
              className="tukaatu-location-clear-button"
              type="button"
              onClick={clearLocation}
              aria-label={`Clear ${label.toLowerCase()}`}
              style={{
                width: 36,
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: colors.input,
                color: colors.muted,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
