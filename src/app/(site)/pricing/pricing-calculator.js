"use client";
import "./pricing-calculator.css";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, ChevronDown, Loader2, MapPin, Navigation, X } from "lucide-react";

/* ── API helpers ─────────────────────────────────────────────────────── */
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const NOMINATIM = "https://nominatim.openstreetmap.org";

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json`, {
      headers: { "Accept-Language": "en" },
    });
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function searchPlaces(query) {
  const res = await fetch(
    `${NOMINATIM}/search?q=${encodeURIComponent(query + " Nepal")}&format=json&limit=5&countrycodes=np`,
    { headers: { "Accept-Language": "en" } }
  );
  return res.json();
}

async function getEstimate(payload) {
  const res = await fetch(`${API_URL}/public/pricing/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    const msg =
      body?.errors?.pricing?.[0] ||
      body?.errors?.actual_weight_kg?.[0] ||
      body?.errors?.parcel_dimensions?.[0] ||
      body?.message ||
      "Unable to calculate delivery price.";
    throw new Error(msg);
  }
  return body.data;
}

/* ── Leaflet map (SSR-safe via dynamic import) ───────────────────────── */
const LeafletMap = dynamic(() => import("./LeafletMapPicker"), { ssr: false, loading: () => <div className="map-container map-loading"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div> });

/* ── Map picker modal ────────────────────────────────────────────────── */
function MapPickerModal({ label, initial, onConfirm, onClose }) {
  const [coords, setCoords] = useState(initial || { lat: 27.7172, lng: 85.3240 });
  const [address, setAddress] = useState("");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    reverseGeocode(coords.lat, coords.lng).then(setAddress);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!search.trim()) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try { setSuggestions(await searchPlaces(search)); }
      finally { setSearching(false); }
    }, 400);
  }, [search]);

  async function handleMapClick(lat, lng) {
    setCoords({ lat, lng });
    const addr = await reverseGeocode(lat, lng);
    setAddress(addr);
  }

  function pickSuggestion(item) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setCoords({ lat, lng });
    setAddress(item.display_name);
    setSuggestions([]);
    setSearch("");
  }

  return (
    <div className="map-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="map-modal">
        <div className="map-modal-header">
          <span className="map-modal-title"><MapPin className="h-4 w-4" />{label}</span>
          <button type="button" onClick={onClose} className="map-close"><X className="h-4 w-4" /></button>
        </div>

        <div className="map-search-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search location in Nepal…"
            className="map-search-input"
          />
          {searching && <Loader2 className="map-search-spinner h-4 w-4 animate-spin" />}
          {suggestions.length > 0 && (
            <ul className="map-suggestions">
              {suggestions.map((s) => (
                <li key={s.place_id} onClick={() => pickSuggestion(s)}>{s.display_name}</li>
              ))}
            </ul>
          )}
        </div>

        <LeafletMap coords={coords} onMapClick={handleMapClick} />

        <div className="map-footer">
          <div className="map-coords-display">
            <Navigation className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
            {address && <span className="map-addr-preview">— {address.split(",").slice(0, 2).join(", ")}</span>}
          </div>
          <button
            type="button"
            onClick={() => onConfirm({ lat: coords.lat, lng: coords.lng, address })}
            className="map-confirm-btn"
          >
            Confirm location
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Location field ──────────────────────────────────────────────────── */
function LocationField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="loc-field">
      <p className="field-label">{label}</p>
      <div className="loc-display">
        <MapPin className="loc-pin" />
        <div className="loc-text">
          {value ? (
            <>
              <span className="loc-address">{value.address.split(",").slice(0, 3).join(", ")}</span>
              <span className="loc-coords">{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span>
            </>
          ) : (
            <>
              <span className="loc-placeholder">Choose {label.toLowerCase()}</span>
              <span className="loc-hint">Map-confirmed coordinates required</span>
            </>
          )}
        </div>
        <button type="button" className="loc-map-btn" onClick={() => setOpen(true)}>
          <MapPin className="h-3.5 w-3.5" />
          {value ? "Change" : "Select map"}
        </button>
      </div>
      {open && (
        <MapPickerModal
          label={label}
          initial={value ? { lat: value.lat, lng: value.lng } : null}
          onConfirm={(c) => { onChange(c); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Main calculator ─────────────────────────────────────────────────── */
const BREAKDOWN_LABELS = {
  base_rate: "Base rate",
  weight_charge: "Weight charge",
  distance_charge: "Distance charge",
  fragile_charge: "Fragile surcharge",
  express_charge: "Express charge",
  cod_fee: "COD fee",
  surcharge: "Surcharge",
  discount: "Discount",
};

export default function PricingCalculator() {
  const [pickup, setPickup] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [weight, setWeight] = useState("1");
  const [parcelType, setParcelType] = useState("non_fragile");
  const [dims, setDims] = useState({ length: "", width: "", height: "" });
  const [service, setService] = useState("standard");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateDim = useCallback((k, v) => setDims((d) => ({ ...d, [k]: v })), []);
  const hasDims = dims.length || dims.width || dims.height;
  const allDims = dims.length && dims.width && dims.height;

  async function calculate(e) {
    e.preventDefault();
    if (!pickup)  { setError("Select a pickup location on the map."); return; }
    if (!delivery) { setError("Select a delivery location on the map."); return; }
    if (Number(weight) <= 0) { setError("Enter a valid parcel weight."); return; }
    if (hasDims && !allDims) { setError("Enter all three dimensions or leave them all empty."); return; }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        pickup_address: pickup.address,
        pickup_latitude: pickup.lat,
        pickup_longitude: pickup.lng,
        delivery_address: delivery.address,
        delivery_latitude: delivery.lat,
        delivery_longitude: delivery.lng,
        service_type: service,
        parcel_type: parcelType,
        actual_weight_kg: Number(weight),
      };
      if (allDims) {
        payload.parcel_dimensions = {
          length_cm: Number(dims.length),
          width_cm: Number(dims.width),
          height_cm: Number(dims.height),
        };
      }
      setResult(await getEstimate(payload));
    } catch (err) {
      setError(err.message || "Unable to calculate delivery price.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="calc-section">
      <div className="calc-grid">

        {/* ── Form ── */}
        <form onSubmit={calculate} className="calc-form">
          <LocationField label="Pickup Location" value={pickup} onChange={setPickup} />
          <LocationField label="Delivery Location" value={delivery} onChange={setDelivery} />

          <div className="form-row-2">
            <div>
              <p className="field-label">Actual Weight (kg)</p>
              <input
                type="number" min="0.1" step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <p className="field-label">Parcel Type</p>
              <div className="toggle-group">
                {[["non_fragile", "Non-fragile"], ["fragile", "Fragile"]].map(([v, l]) => (
                  <button key={v} type="button"
                    className={`toggle-btn${parcelType === v ? " active" : ""}`}
                    onClick={() => setParcelType(v)}
                  >{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="field-label">
              Packed Parcel Dimensions (cm) <span className="field-optional">optional</span>
            </p>
            <div className="dims-row">
              {["length", "width", "height"].map((k) => (
                <div key={k} className="dim-field">
                  <input
                    type="number" min="0.1" step="0.1"
                    value={dims[k]}
                    onChange={(e) => updateDim(k, e.target.value)}
                    placeholder="—"
                    className="field-input dim-input"
                  />
                  <span className="dim-label">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="field-label">Service Type</p>
            <div className="service-select-wrap">
              <select value={service} onChange={(e) => setService(e.target.value)} className="field-input service-select">
                <option value="standard">Standard</option>
                <option value="express">Express</option>
              </select>
              <ChevronDown className="select-chevron" />
            </div>
          </div>

          {error && (
            <div className="error-box">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          <button disabled={loading} className="calc-btn">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Calculating…</> : "Calculate Delivery Price"}
          </button>
        </form>

        {/* ── Result ── */}
        <div className="result-panel">
          <ResultDisplay result={result} loading={loading} />
        </div>

      </div>
    </section>
  );
}

/* ── Result display ──────────────────────────────────────────────────── */
function ResultDisplay({ result, loading }) {
  if (loading) {
    return (
      <div className="result-empty">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        <p className="result-empty-title">Calculating your price…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-empty">
        <div className="result-empty-icon"><MapPin className="h-6 w-6" /></div>
        <p className="result-empty-title">Your estimate will appear here</p>
        <p className="result-empty-sub">Select pickup and delivery on the map, enter weight, then calculate.</p>
        <div className="result-features">
          {["Live backend pricing", "No hidden fees", "NPR currency"].map((f) => (
            <span key={f} className="result-feature-tag">{f}</span>
          ))}
        </div>
      </div>
    );
  }

  const breakdown = result.breakdown || {};
  const rows = Object.entries(BREAKDOWN_LABELS)
    .map(([k, label]) => [label, breakdown[k]])
    .filter(([, v]) => v != null && Number(v) !== 0);

  return (
    <div className="result-content">
      <div className="result-price-block">
        <div>
          <p className="result-price-label">Estimated Price</p>
          <p className="result-price">NPR {Number(result.price || 0).toLocaleString()}</p>
        </div>
        <div className="result-sla-block">
          <p className="result-price-label">Estimated SLA</p>
          <p className="result-sla">{result.estimated_delivery_label || "—"}</p>
        </div>
      </div>

      <div className="result-weight-row">
        <span>Chargeable weight</span>
        <span>
          {result.chargeable_weight_kg} kg
          {result.volumetric_applied && <em> (volumetric)</em>}
        </span>
      </div>

      {rows.length > 0 && (
        <div className="result-breakdown">
          <p className="breakdown-title">Price Breakdown</p>
          {rows.map(([label, amount]) => (
            <div key={label} className="breakdown-row">
              <span>{label}</span>
              <span>NPR {Number(amount).toLocaleString()}</span>
            </div>
          ))}
          <div className="breakdown-total">
            <span>Total</span>
            <span>NPR {Number(result.price || 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      <p className="result-disclaimer">
        Final price may vary based on actual parcel weight at pickup.
      </p>
    </div>
  );
}
