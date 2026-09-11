"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Space,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const NEPAL_CENTER = [27.7172, 85.324];

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function checkpointIcon(index) {
  return L.divIcon({
    className: "checkpoint-marker",
    html: `
      <div style="
        width:28px;height:28px;border-radius:50%;
        background:#722ed1;border:3px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,.3);
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-weight:700;font-size:12px;">
        ${index + 1}
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function branchIcon(kind) {
  const bg = kind === "origin" ? "#52c41a" : kind === "dest" ? "#f5222d" : "#1677ff";
  return L.divIcon({
    className: "branch-node-marker",
    html: `
      <div style="
        width:22px;height:22px;border-radius:4px;
        background:${bg};border:3px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,.35);
      "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

function FitToPoints({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 11));
      return;
    }
    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);

  return null;
}

function ClickToAdd({ onAdd }) {
  useMapEvents({
    click(event) {
      onAdd({
        latitude: Number(event.latlng.lat.toFixed(7)),
        longitude: Number(event.latlng.lng.toFixed(7)),
      });
    },
  });
  return null;
}

/**
 * Map-based picker for ROAD checkpoints (waypoints, not branches).
 *
 * value: array of { name, city, landmark, latitude, longitude }
 * onChange: (nextCheckpoints) => void
 *
 * Optional `pathNodes` (ordered branch nodes with latitude/longitude) are drawn
 * as context so the operator can place checkpoints along the branch path.
 */
export default function CheckpointMapPicker({
  value = [],
  onChange,
  pathNodes = [],
  height = 420,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const checkpoints = Array.isArray(value) ? value : [];

  const checkpointPoints = useMemo(
    () =>
      checkpoints
        .map((cp) => [toNumber(cp.latitude), toNumber(cp.longitude)])
        .filter(([lat, lng]) => lat !== null && lng !== null),
    [checkpoints],
  );

  const branchPoints = useMemo(
    () =>
      (pathNodes || [])
        .map((node) => [toNumber(node.latitude), toNumber(node.longitude)])
        .filter(([lat, lng]) => lat !== null && lng !== null),
    [pathNodes],
  );

  // Ordered journey waypoints for real-road routing:
  // origin branch -> checkpoints (in order) -> transit branches + destination.
  const orderedWaypoints = useMemo(() => {
    if (branchPoints.length === 0) {
      return checkpointPoints;
    }
    if (branchPoints.length === 1) {
      return [branchPoints[0], ...checkpointPoints];
    }
    const [origin, ...rest] = branchPoints;
    return [origin, ...checkpointPoints, ...rest];
  }, [branchPoints, checkpointPoints]);

  const fitPoints = useMemo(
    () => [...branchPoints, ...checkpointPoints],
    [branchPoints, checkpointPoints],
  );

  const center = fitPoints[0] || NEPAL_CENTER;

  // Fetch actual road geometry through the ordered waypoints (OSRM).
  const [roadGeometry, setRoadGeometry] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoad() {
      if (orderedWaypoints.length < 2) {
        setRoadGeometry([]);
        return;
      }
      try {
        const coords = orderedWaypoints
          .map(([lat, lng]) => `${lng},${lat}`)
          .join(";");
        const res = await fetch(
          `${OSRM_URL}/${coords}?overview=full&geometries=geojson`,
        );
        if (!res.ok) throw new Error("routing failed");
        const json = await res.json();
        const line = json?.routes?.[0]?.geometry?.coordinates;
        if (!cancelled && Array.isArray(line)) {
          // GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
          setRoadGeometry(line.map(([lng, lat]) => [lat, lng]));
        }
      } catch {
        // Fall back to straight lines if routing is unavailable.
        if (!cancelled) setRoadGeometry([]);
      }
    }

    loadRoad();
    return () => {
      cancelled = true;
    };
  }, [orderedWaypoints]);

  const addCheckpoint = ({ latitude, longitude }) => {
    onChange?.([
      ...checkpoints,
      { name: "", city: null, landmark: null, latitude, longitude },
    ]);
  };

  const updateCheckpoint = (index, patch) => {
    const next = checkpoints.map((cp, i) =>
      i === index ? { ...cp, ...patch } : cp,
    );
    onChange?.(next);
  };

  const removeCheckpoint = (index) => {
    onChange?.(checkpoints.filter((_, i) => i !== index));
  };

  const moveCheckpoint = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= checkpoints.length) {
      return;
    }
    const next = [...checkpoints];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange?.(next);
  };

  if (!mounted) {
    return (
      <div
        style={{
          height,
          width: "100%",
          borderRadius: 12,
          background: "#f5f5f5",
        }}
      />
    );
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Text type="secondary">
        <EnvironmentOutlined /> Click the map to drop a road checkpoint (e.g.
        Mugling, Gorkha). The blue line follows the real road through origin →
        checkpoints → transit branches → destination.
      </Text>

      <Space wrap size={14} style={{ fontSize: 12 }}>
        <Space size={6}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: "#52c41a",
              display: "inline-block",
            }}
          />
          <Text style={{ fontSize: 12 }}>Origin</Text>
        </Space>
        <Space size={6}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: "#1677ff",
              display: "inline-block",
            }}
          />
          <Text style={{ fontSize: 12 }}>Transit branch</Text>
        </Space>
        <Space size={6}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: "#f5222d",
              display: "inline-block",
            }}
          />
          <Text style={{ fontSize: 12 }}>Destination</Text>
        </Space>
        <Space size={6}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#722ed1",
              display: "inline-block",
            }}
          />
          <Text style={{ fontSize: 12 }}>Checkpoint</Text>
        </Space>
      </Space>

      <div
        style={{
          height,
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #f0f0f0",
        }}
      >
        <MapContainer
          center={center}
          zoom={8}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitToPoints points={fitPoints} />
          <ClickToAdd onAdd={addCheckpoint} />

          {/* Real road route through origin -> checkpoints -> transits -> destination */}
          {roadGeometry.length >= 2 ? (
            <>
              <Polyline
                positions={roadGeometry}
                pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.8 }}
              />
              <Polyline
                positions={roadGeometry}
                pathOptions={{ color: "#1677ff", weight: 5, opacity: 0.95 }}
              />
            </>
          ) : (
            /* Fallback: straight dashed line if routing is unavailable */
            orderedWaypoints.length >= 2 && (
              <Polyline
                positions={orderedWaypoints}
                pathOptions={{ color: "#8c8c8c", weight: 3, dashArray: "6 8" }}
              />
            )
          )}

          {checkpoints.map((cp, index) => {
            const lat = toNumber(cp.latitude);
            const lng = toNumber(cp.longitude);
            if (lat === null || lng === null) {
              return null;
            }
            return (
              <Marker
                key={`${lat}-${lng}-${index}`}
                position={[lat, lng]}
                icon={checkpointIcon(index)}
                draggable
                eventHandlers={{
                  dragend: (event) => {
                    const { lat: nlat, lng: nlng } =
                      event.target.getLatLng();
                    updateCheckpoint(index, {
                      latitude: Number(nlat.toFixed(7)),
                      longitude: Number(nlng.toFixed(7)),
                    });
                  },
                }}
              >
                <Popup>
                  <strong>{cp.name || `Checkpoint ${index + 1}`}</strong>
                  <br />
                  {lat}, {lng}
                </Popup>
              </Marker>
            );
          })}

          {/* Branch nodes (origin / transit / destination) for context */}
          {(pathNodes || []).map((node, index) => {
            const lat = toNumber(node.latitude);
            const lng = toNumber(node.longitude);
            if (lat === null || lng === null) return null;
            const isFirst = index === 0;
            const isLast = index === (pathNodes || []).length - 1;
            const kind = isFirst ? "origin" : isLast ? "dest" : "transit";
            return (
              <Marker
                key={`branch-node-${node.id ?? index}`}
                position={[lat, lng]}
                icon={branchIcon(kind)}
              >
                <Popup>
                  <strong>{node.name || `Branch ${index + 1}`}</strong>
                  <br />
                  {isFirst ? "Origin" : isLast ? "Destination" : "Transit branch"}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {checkpoints.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No checkpoints yet. Click the map to add one."
        />
      ) : (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {checkpoints.map((cp, index) => (
            <Card
              key={`cp-row-${index}`}
              size="small"
              style={{
                background: "#fafafa",
              }}
            >
              <Space
                align="start"
                style={{ width: "100%", justifyContent: "space-between" }}
              >
                <Space direction="vertical" size={8} style={{ flex: 1 }}>
                  <div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "#722ed1",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        marginRight: 8,
                      }}
                    >
                      {index + 1}
                    </span>
                    <Text strong>Checkpoint {index + 1}</Text>
                  </div>
                  <Row gutter={12}>
                    <Col span={8}>
                      <Input
                        placeholder="Name (e.g. Mugling)"
                        value={cp.name ?? ""}
                        onChange={(e) =>
                          updateCheckpoint(index, { name: e.target.value })
                        }
                      />
                    </Col>
                    <Col span={8}>
                      <Input
                        placeholder="City (optional)"
                        value={cp.city ?? ""}
                        onChange={(e) =>
                          updateCheckpoint(index, { city: e.target.value })
                        }
                      />
                    </Col>
                    <Col span={8}>
                      <Input
                        placeholder="Landmark (optional)"
                        value={cp.landmark ?? ""}
                        onChange={(e) =>
                          updateCheckpoint(index, { landmark: e.target.value })
                        }
                      />
                    </Col>
                  </Row>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Coordinates: {toNumber(cp.latitude) ?? "?"}, {toNumber(cp.longitude) ?? "?"}
                  </Text>
                </Space>

                <Space>
                  <Tooltip title="Move up">
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={() => moveCheckpoint(index, -1)}
                    />
                  </Tooltip>
                  <Tooltip title="Move down">
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={index === checkpoints.length - 1}
                      onClick={() => moveCheckpoint(index, 1)}
                    />
                  </Tooltip>
                  <Tooltip title="Remove">
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeCheckpoint(index)}
                    />
                  </Tooltip>
                </Space>
              </Space>
            </Card>
          ))}
        </Space>
      )}
    </Space>
  );
}
