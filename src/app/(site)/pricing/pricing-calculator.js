"use client";
import "./pricing-calculator.css";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, ChevronDown, Loader2, MapPin, Navigation, X } from "lucide-react";
import { getDeliveryEstimate } from "@/services/pricingEstimateService";

/* ── Nominatim helpers ───────────────────────────────────────────────── */
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

      console.log("Sending payload:", payload);
      const result = await getDeliveryEstimate(payload);
      console.log("Pricing result:", result);
      setResult(result);
    } catch (err) {
      console.error("Calculation error:", err);
      // Extract error message from validation errors if present
      if (err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : String(err.message));
      } else {
        setError(err.message || "Unable to calculate delivery price.");
      }
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
  const [showDetails, setShowDetails] = useState(false);

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

  return (
    <div className="result-content">
      {/* Main Price Block */}
      <div className="result-price-block">
        <div>
          <p className="result-price-label">Estimated Delivery Price</p>
          <p className="result-price">NPR {Number(result.price || 0).toLocaleString()}</p>
        </div>
        <div className="result-sla-block">
          <p className="result-price-label">Estimated Delivery</p>
          <p className="result-sla">{result.estimated_delivery_label || "—"}</p>
        </div>
      </div>

      {/* Quick Stats - as a list */}
      <div className="result-quick-stats">
        <div className="result-stat">
          <div className="result-stat-left">
            <div className="result-stat-label">Chargeable Weight</div>
          </div>
          <div className="result-stat-value">{result.chargeable_weight_kg} kg</div>
        </div>

        <div className="result-stat">
          <div className="result-stat-left">
            <div className="result-stat-label">Pickup Branch</div>
          </div>
          <div className="result-stat-value">{result.pickup_branch.name}</div>
        </div>

        <div className="result-stat">
          <div className="result-stat-left">
            <div className="result-stat-label">Delivery Branch</div>
          </div>
          <div className="result-stat-value">{result.delivery_branch.name}</div>
        </div>

        <div className="result-stat">
          <div className="result-stat-left">
            <div className="result-stat-label">Parcel Type</div>
          </div>
          <div className="result-stat-value capitalize">{result.parcel_type.replace('_', ' ')}</div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="result-disclaimer">
        💡 Final price may vary based on actual parcel weight at pickup. This is an estimate based on the information provided.
      </p>

      {/* View Details Button */}
      <button className="result-details-btn" onClick={() => setShowDetails(true)}>
        View Full Details
      </button>

      {/* Details Modal */}
      {showDetails && (
        <DetailsModal result={result} onClose={() => setShowDetails(false)} />
      )}
    </div>
  );
}

/* ── Details Modal ──────────────────────────────────────────────────── */
function DetailsModal({ result, onClose }) {
  return (
    <div className="details-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="details-modal">
        <div className="details-modal-header">
          <h2 className="details-modal-title">Delivery Estimate Details</h2>
          <button className="details-modal-close" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="details-modal-body">
          {/* Weight Section */}
          <div className="details-section">
            <h3 className="details-section-title">Weight Calculation</h3>
            
            <div className="details-row">
              <div className="details-row-label">
                <div className="details-row-title">Actual Weight</div>
                <div className="details-row-subtitle">As provided</div>
              </div>
              <div className="details-row-value">{result.actual_weight_kg} kg</div>
            </div>

            <div className="details-row">
              <div className="details-row-label">
                <div className="details-row-title">Volumetric Weight</div>
                <div className="details-row-subtitle">Calculated from dimensions</div>
              </div>
              <div className="details-row-value">{result.volumetric_weight_kg} kg</div>
            </div>

            <div className="details-row">
              <div className="details-row-label">
                <div className="details-row-title">Chargeable Weight</div>
                <div className="details-row-subtitle">Higher of actual or volumetric</div>
              </div>
              <div className="details-row-value highlight">{result.chargeable_weight_kg} kg</div>
            </div>

            <div className="details-row">
              <div className="details-row-label">
                <div className="details-row-title">Weight Source</div>
                <div className="details-row-subtitle">Used for charging</div>
              </div>
              <div className="details-row-value capitalize">{result.weight_source.replace('_', ' ')}</div>
            </div>
          </div>

          {/* Dimensions Section */}
          {result.dimensions && (result.dimensions.length_cm || result.dimensions.width_cm || result.dimensions.height_cm) && (
            <div className="details-section">
              <h3 className="details-section-title">Parcel Dimensions</h3>
              
              <div className="details-row">
                <div className="details-row-label">
                  <div className="details-row-title">Length</div>
                  <div className="details-row-subtitle">Packed dimension</div>
                </div>
                <div className="details-row-value">{result.dimensions.length_cm} cm</div>
              </div>

              <div className="details-row">
                <div className="details-row-label">
                  <div className="details-row-title">Width</div>
                  <div className="details-row-subtitle">Packed dimension</div>
                </div>
                <div className="details-row-value">{result.dimensions.width_cm} cm</div>
              </div>

              <div className="details-row">
                <div className="details-row-label">
                  <div className="details-row-title">Height</div>
                  <div className="details-row-subtitle">Packed dimension</div>
                </div>
                <div className="details-row-value">{result.dimensions.height_cm} cm</div>
              </div>

              <div className="details-row">
                <div className="details-row-label">
                  <div className="details-row-title">Volumetric Divisor</div>
                  <div className="details-row-subtitle">Calculation constant</div>
                </div>
                <div className="details-row-value">{result.volumetric_divisor}</div>
              </div>
            </div>
          )}

          {/* Pickup Section */}
          <div className="details-section">
            <h3 className="details-section-title">📍 Pickup Details</h3>
            
            <div className="details-branch-item">
              <div className="details-branch-header">
                <div className="details-branch-title">Pickup Branch</div>
                <div className="details-branch-subtitle">Service branch</div>
              </div>
              <div className="details-branch-name">{result.pickup_branch.name}</div>
            </div>

            <div className="details-branch-item">
              <div className="details-branch-header">
                <div className="details-branch-title">Distance from Location</div>
                <div className="details-branch-subtitle">Branch distance</div>
              </div>
              <div className="details-branch-name">{result.pickup_branch.distance_from_pickup_location_km} km</div>
            </div>
          </div>

          {/* Delivery Section */}
          <div className="details-section">
            <h3 className="details-section-title">🎯 Delivery Details</h3>
            
            <div className="details-branch-item">
              <div className="details-branch-header">
                <div className="details-branch-title">Delivery Branch</div>
                <div className="details-branch-subtitle">Service branch</div>
              </div>
              <div className="details-branch-name">{result.delivery_branch.name}</div>
            </div>

            <div className="details-branch-item">
              <div className="details-branch-header">
                <div className="details-branch-title">Distance to Location</div>
                <div className="details-branch-subtitle">Branch distance</div>
              </div>
              <div className="details-branch-name">{result.delivery_branch.distance_to_delivery_location_km} km</div>
            </div>
          </div>

          {/* Route Section */}
          {result.route && (
            <div className="details-section">
              <h3 className="details-section-title">Route Information</h3>
              
              <div className="details-row">
                <div className="details-row-label">
                  <div className="details-row-title">Base Rate</div>
                  <div className="details-row-subtitle">Route minimum</div>
                </div>
                <div className="details-row-value">NPR {Number(result.route.base_rate || 0).toLocaleString()}</div>
              </div>

              <div className="details-row">
                <div className="details-row-label">
                  <div className="details-row-title">Total Distance</div>
                  <div className="details-row-subtitle">Pickup to delivery</div>
                </div>
                <div className="details-row-value">{result.route.total_distance_km} km</div>
              </div>

              <div className="details-row">
                <div className="details-row-label">
                  <div className="details-row-title">Parcel Type</div>
                  <div className="details-row-subtitle">Handling type</div>
                </div>
                <div className="details-row-value capitalize">{result.parcel_type.replace('_', ' ')}</div>
              </div>

              <div className="details-row">
                <div className="details-row-label">
                  <div className="details-row-title">Estimated Delivery</div>
                  <div className="details-row-subtitle">Time estimate</div>
                </div>
                <div className="details-row-value">{result.estimated_delivery_label}</div>
              </div>

              <div className="details-row">
                <div className="details-row-label">
                  <div className="details-row-title">Valid Until</div>
                  <div className="details-row-subtitle">Quote expiry</div>
                </div>
                <div className="details-row-value">{new Date(result.valid_until).toLocaleDateString()}</div>
              </div>
            </div>
          )}

          {/* Pricing Summary */}
          <div className="details-summary-box">
            <div className="details-summary-label">Total Estimate</div>
            <div className="details-summary-value">NPR {Number(result.price || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
