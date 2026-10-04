'use client';

import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, Card, Col, Empty, Input, List, Row, Select, Space, Tag, Typography, message } from 'antd';
import { EnvironmentOutlined, ShopOutlined } from '@ant-design/icons';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

const { Text } = Typography;

const PLACES = [
  ['sallaghari', 27.6718, 85.4286],
  ['sanothimi', 27.6812, 85.3705],
  ['thimi', 27.6722, 85.3868],
  ['balkot', 27.6644, 85.3615],
  ['koteshwor', 27.6792, 85.3494],
  ['new baneshwor', 27.6915, 85.342],
  ['old baneshwor', 27.699, 85.333],
  ['baneshwor', 27.6916, 85.3422],
  ['chabahil', 27.7172, 85.3468],
  ['gaushala', 27.707, 85.346],
  ['tinkune', 27.6865, 85.3465],
  ['sinamangal', 27.696, 85.35],
  ['jorpati', 27.72, 85.375],
  ['bouddha', 27.7215, 85.362],
];

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function locate(stop) {
  const lat = num(stop.lat);
  const lng = num(stop.lng);
  if (lat != null && lng != null && !(lat === 0 && lng === 0)) {
    return { lat, lng, guessed: false };
  }
  const hay = `${stop.area || ''} ${stop.address || ''}`.toLowerCase();
  const places = [...PLACES].sort((a, b) => b[0].length - a[0].length);
  for (const [name, placeLat, placeLng] of places) {
    if (hay.includes(name)) return { lat: placeLat, lng: placeLng, guessed: true };
  }
  return null;
}

const GLYPH = {
  bike: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.2" cy="16.5" r="3"/><circle cx="17.8" cy="16.5" r="3"/><path d="M6.2 16.5 10 8.5h4.2l2.2 3.4h3.2M10 8.5 8.2 16.5M14.2 8.5 17.8 16.5"/></svg>',
  van: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 15V8.5h9.2l3.2 3.8H21.5V15"/><path d="M2.5 15h19"/><circle cx="7" cy="17.2" r="1.7"/><circle cx="17" cy="17.2" r="1.7"/></svg>',
};

function vehicleKind(stop) {
  const blob = [stop.vehicle, stop.riderRole, stop.riderName, stop.deliveryType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\bvan\b|\btruck\b|\btempo\b|\bcar\b|transfer/.test(blob)) return "van";
  if (/bike|cycle|scooter|motor/.test(blob)) return "bike";
  return null;
}

function canAssign(stop) {
  const status = String(stop.status || "").toLowerCase();
  return status === "pending" || status === "requested";
}

function pinIcon(mode, selected, color, vehicle, locked) {
  const bg = color || "#6B7280";
  const ring = selected ? "0 0 0 3px #d97706" : "0 1px 4px rgba(0,0,0,.35)";
  const Icon = mode === "delivery" ? EnvironmentOutlined : ShopOutlined;
  const glyph = vehicle && GLYPH[vehicle]
    ? GLYPH[vehicle]
    : renderToStaticMarkup(<Icon />);
  const html = `<div style="width:32px;height:32px;border-radius:16px;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:${ring};font-size:16px;opacity:${locked ? 0.45 : 1};cursor:${locked ? "default" : "pointer"}">${glyph}</div>`;
  return L.divIcon({
    className: "",
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function Fit({ points }) {
  const map = useMap();
  const key = points.map((p) => p.lat.toFixed(5) + "," + p.lng.toFixed(5)).join("|");
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
  }, [map, key]);
  return null;
}

async function roadRoute(points) {
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?source=any&roundtrip=false&overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Road route unavailable');
  const data = await response.json();
  if (data.code !== 'Ok' || !data.trips?.[0]) throw new Error('Road route unavailable');
  const trip = data.trips[0];
  const positions = trip.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const order = (data.waypoints || [])
    .map((waypoint, index) => ({ index, at: waypoint.waypoint_index }))
    .sort((a, b) => a.at - b.at)
    .map((item) => item.index);
  return {
    positions,
    order,
    km: Math.round((trip.distance / 1000) * 10) / 10,
    minutes: Math.round(trip.duration / 60),
    road: true,
  };
}

function straightRoute(points) {
  const remaining = points.map((_, index) => index);
  const order = [];
  let current = remaining.shift();
  order.push(current);
  while (remaining.length) {
    let best = 0;
    let bestDist = Infinity;
    const from = points[current];
    remaining.forEach((index, position) => {
      const to = points[index];
      const dist = (from.lat - to.lat) ** 2 + (from.lng - to.lng) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = position;
      }
    });
    current = remaining.splice(best, 1)[0];
    order.push(current);
  }
  return {
    positions: order.map((index) => [points[index].lat, points[index].lng]),
    order,
    km: null,
    minutes: null,
    road: false,
  };
}

export default function AreaAssignmentMapInner({
  mode = 'pickup',
  loading = false,
  stops = [],
  selectedIds = [],
  onSelectedIdsChange,
  onOpen,
  riders = [],
  ridersLoading = false,
  onLoadRiders,
  onAssign,
}) {
  const [riderId, setRiderId] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [route, setRoute] = useState(null);
  const [routing, setRouting] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [areaFilter, setAreaFilter] = useState(null);
  const [vehicleFilter, setVehicleFilter] = useState(null);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (!selectedIds.length || !onLoadRiders) return;
    onLoadRiders(selectedIds);
  }, [selectedIds.join('|')]);

  const placed = useMemo(() => {
    const seen = {};
    return stops.map((stop) => {
      const point = locate(stop);
      if (!point) return { ...stop, point: null };
      const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
      const n = seen[key] || 0;
      seen[key] = n + 1;
      const shift = point.guessed ? n * 0.0015 : n * 0.0004;
      return {
        ...stop,
        point: { lat: point.lat + shift, lng: point.lng + shift, guessed: point.guessed },
      };
    });
  }, [stops]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return placed.filter((stop) => {
      if (statusFilter && (stop.status || "unknown") !== statusFilter) return false;
      const area = (stop.area || "Unknown area").trim() || "Unknown area";
      if (areaFilter && area !== areaFilter) return false;
      if (vehicleFilter && vehicleKind(stop) !== vehicleFilter) return false;
      if (!q) return true;
      const hay = [stop.title, stop.subtitle, stop.address, stop.area, stop.statusLabel, stop.riderName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [placed, query, statusFilter, areaFilter, vehicleFilter]);

  const areaOptions = useMemo(() => {
    const names = new Set();
    placed.forEach((stop) => {
      names.add((stop.area || "Unknown area").trim() || "Unknown area");
    });
    return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }));
  }, [placed]);

  const groups = useMemo(() => {
    const map = new Map();
    visible.forEach((stop) => {
      const area = (stop.area || 'Unknown area').trim() || 'Unknown area';
      if (!map.has(area)) map.set(area, []);
      map.get(area).push(stop);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [visible]);

  const legend = useMemo(() => {
    const seen = new Map();
    placed.forEach((stop) => {
      const key = stop.status || "unknown";
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          label: stop.statusLabel || key,
          color: stop.color || "#6B7280",
        });
      }
    });
    return [...seen.values()];
  }, [placed]);

  const points = visible.filter((stop) => stop.point).map((stop) => stop.point);

  function toggle(id) {
    const stop = placed.find((item) => item.id === id);
    if (!stop || !canAssign(stop)) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRoute(null);
    onSelectedIdsChange?.([...next]);
  }

  function toggleArea(areaStops) {
    const ids = areaStops.filter(canAssign).map((stop) => stop.id);
    if (!ids.length) return;
    const allOn = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
    setRoute(null);
    onSelectedIdsChange?.([...next]);
  }

  async function buildRoute() {
    const chosen = placed.filter((stop) => selected.has(stop.id) && canAssign(stop) && stop.point);
    if (chosen.length < 2) {
      message.warning('Select at least two stops that have a location.');
      return;
    }
    setRouting(true);
    try {
      const input = chosen.map((stop) => ({ ...stop.point, id: stop.id, title: stop.title }));
      let result;
      try {
        result = await roadRoute(input);
      } catch {
        result = straightRoute(input);
        message.warning('Road route is unavailable, so this is the shortest stop order in a straight line.');
      }
      setRoute({
        ...result,
        titles: result.order.map((index, step) => `${step + 1}. ${input[index].title}`),
      });
    } finally {
      setRouting(false);
    }
  }

  const assignableSelected = selectedIds.filter((id) => {
    const stop = placed.find((item) => item.id === id);
    return Boolean(stop && canAssign(stop));
  });

  const noun = mode === 'delivery' ? 'deliveries' : 'pickups';

  return (
    <Card title={`Coverage map · ${noun}`} loading={loading} style={{ marginBottom: 16 }}>
      {legend.length > 0 && (
        <Space wrap size={[6, 6]} style={{ marginBottom: 12 }}>
          {legend.map((item) => (
            <Tag
              key={item.key}
              onClick={() => setStatusFilter((current) => (current === item.key ? null : item.key))}
              style={{ margin: 0, cursor: "pointer", borderColor: item.color, color: item.color, fontWeight: statusFilter === item.key ? 700 : 400 }}
            >
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 8, background: item.color, marginRight: 6 }} />
              {item.label}
            </Tag>
          ))}
          {placed.some((stop) => vehicleKind(stop) === "bike") && <Tag style={{ margin: 0 }}>Bike</Tag>}
          {placed.some((stop) => vehicleKind(stop) === "van") && <Tag style={{ margin: 0 }}>Van</Tag>}
        </Space>
      )}
      <Space wrap style={{ width: "100%", marginBottom: 12 }}>
        <Input
          allowClear
          placeholder="Search tracking, store, address"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ width: 220 }}
        />
        <Select
          allowClear
          placeholder="Status"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value ?? null)}
          options={legend.map((item) => ({ value: item.key, label: item.label }))}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Area"
          style={{ width: 180 }}
          value={areaFilter}
          onChange={(value) => setAreaFilter(value ?? null)}
          options={areaOptions}
        />
        <Select
          allowClear
          placeholder="Rider"
          style={{ width: 120 }}
          value={vehicleFilter}
          onChange={(value) => setVehicleFilter(value ?? null)}
          options={[
            { value: "bike", label: "Bike" },
            { value: "van", label: "Van" },
          ]}
        />
      </Space>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Text type="secondary">
              {visible.length === placed.length
                ? `${placed.length} ${noun}. Only unassigned pins can be selected.`
                : `${visible.length} of ${placed.length} ${noun} match these filters.`}
            </Text>
            <Space wrap>
              <Button type="primary" onClick={buildRoute} loading={routing} disabled={assignableSelected.length < 2}>
                Fastest path
              </Button>
              <Button onClick={() => { setRoute(null); setRiderId(null); onSelectedIdsChange?.([]); }}>Clear</Button>
            </Space>
            {selectedIds.length > 0 && (
              <Space direction="vertical" style={{ width: '100%' }} size={6}>
                <Text>{assignableSelected.length} ready to assign</Text>
                <Select
                  showSearch
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  loading={ridersLoading}
                  placeholder="Assign to rider"
                  value={riderId}
                  onChange={setRiderId}
                  options={riders.map((rider) => ({
                    value: rider.id,
                    label: rider.name + (rider.phone ? ' | ' + rider.phone : ''),
                  }))}
                  notFoundContent={ridersLoading ? 'Loading riders...' : 'No riders for this branch'}
                />
                <Button
                  type="primary"
                  block
                  disabled={!riderId || !onAssign || assignableSelected.length === 0}
                  loading={assigning}
                  onClick={async () => {
                    if (!riderId || !onAssign) return;
                    setAssigning(true);
                    try {
                      await onAssign(riderId, assignableSelected);
                      setRiderId(null);
                      setRoute(null);
                    } finally {
                      setAssigning(false);
                    }
                  }}
                >
                  Assign selected
                </Button>
              </Space>
            )}
            {route && (
              <div>
                <Text strong>
                  {route.road ? `${route.km} km · about ${route.minutes} min` : 'Straight-line order'}
                </Text>
                <div style={{ marginTop: 6 }}>
                  {route.titles.map((line) => (
                    <div key={line}><Text style={{ fontSize: 12 }}>{line}</Text></div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ maxHeight: 420, overflow: 'auto' }}>
              {groups.length === 0 ? (
                <Empty description={`No open ${noun}`} />
              ) : (
                groups.map(([area, areaStops]) => (
                  <div key={area} style={{ marginBottom: 10 }}>
                    <Space style={{ cursor: areaStops.some(canAssign) ? 'pointer' : 'default' }} onClick={() => toggleArea(areaStops)}>
                      <Text strong>{area}</Text>
                      <Tag>{areaStops.length}</Tag>
                    </Space>
                    <List
                      size="small"
                      dataSource={areaStops}
                      renderItem={(stop) => (
                        <List.Item
                          style={{
                            cursor: canAssign(stop) ? 'pointer' : 'not-allowed',
                            opacity: canAssign(stop) ? 1 : 0.55,
                            background: canAssign(stop) && selected.has(stop.id) ? '#fff7e6' : 'transparent',
                          }}
                          onClick={() => { if (canAssign(stop)) toggle(stop.id); }}
                          actions={onOpen ? [<a key="open" onClick={(e) => { e.stopPropagation(); onOpen(stop.id); }}>Open</a>] : []}
                        >
                          <List.Item.Meta
                            title={<span style={{ fontSize: 13 }}>{stop.title}</span>}
                            description={
                              <span style={{ fontSize: 11 }}>
                                {stop.statusLabel ? stop.statusLabel + " · " : ""}
                                {stop.subtitle || stop.address || "No address"}
                                {vehicleKind(stop) === "bike" ? " · bike" : ""}
                                {vehicleKind(stop) === "van" ? " · van" : ""}
                                {stop.point?.guessed ? " · area pin" : ""}
                                {!stop.point ? " · no map location" : ""}
                              </span>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                ))
              )}
            </div>
          </Space>
        </Col>
        <Col xs={24} md={16}>
          <div style={{ height: 520, borderRadius: 10, overflow: 'hidden', border: '1px solid #eee' }}>
            <MapContainer center={[27.69, 85.36]} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Fit points={route?.positions?.length ? route.positions.map(([lat, lng]) => ({ lat, lng })) : points} />
              {visible.filter((stop) => stop.point).map((stop) => (
                <Marker
                  key={stop.id}
                  position={[stop.point.lat, stop.point.lng]}
                  icon={pinIcon(mode, canAssign(stop) && selected.has(stop.id), stop.color, vehicleKind(stop), !canAssign(stop))}
                  eventHandlers={canAssign(stop) ? { click: () => toggle(stop.id) } : undefined}
                >
                  <Popup>
                    <strong>{stop.title}</strong>
                    <div>{stop.area}</div>
                    <div>{stop.address}</div>
                    {!canAssign(stop) && <div>Already assigned. Not available to assign.</div>}
                  </Popup>
                </Marker>
              ))}
              {route?.positions?.length > 1 && (
                <Polyline positions={route.positions} pathOptions={{ color: '#0891b2', weight: 5 }} />
              )}
            </MapContainer>
          </div>
        </Col>
      </Row>
    </Card>
  );
}
