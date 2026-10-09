"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Pagination,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  ThunderboltOutlined,
  WarningFilled,
} from "@ant-design/icons";

import { getTransferLanePathSuggestions } from "@/services/admin/adminRateManagementService";

const { Text } = Typography;

function branchName(branch, fallback) {
  return branch?.name || fallback;
}

function laneFrom(lane) {
  return branchName(lane?.from_branch, "Origin");
}

function laneTo(lane) {
  return branchName(lane?.to_branch, "Destination");
}

function laneLabel(lane) {
  const dist = lane?.distance_km != null ? ` | ${Number(lane.distance_km)}km` : "";
  return `${laneFrom(lane)} -> ${laneTo(lane)}${dist}`;
}

/**
 * Find ALL simple connecting lane paths (no repeated branch) from origin to
 * destination for a service, up to `maxHops` lanes. Returns an array of paths,
 * each path being an ordered array of lane objects, sorted by hop count then
 * total distance. Includes the direct path AND transit alternatives.
 */
function findLanePaths(lanes, fromId, toId, serviceType, maxHops = 3) {
  if (!fromId || !toId || Number(fromId) === Number(toId)) return [];

  const graph = new Map();
  for (const lane of lanes) {
    if (String(lane.service_type) !== String(serviceType)) continue;
    if (!lane.is_active) continue;
    if (Number(lane.from_branch_id) === Number(lane.to_branch_id)) continue;
    const a = Number(lane.from_branch_id);
    if (!graph.has(a)) graph.set(a, []);
    graph.get(a).push(lane);
  }

  const results = [];
  const target = Number(toId);

  const dfs = (current, pathLanes, visited) => {
    if (pathLanes.length > maxHops) return;
    if (current === target && pathLanes.length > 0) {
      results.push([...pathLanes]);
      return;
    }
    for (const lane of graph.get(current) || []) {
      const next = Number(lane.to_branch_id);
      if (visited.has(next)) continue;
      visited.add(next);
      dfs(next, [...pathLanes, lane], visited);
      visited.delete(next);
    }
  };

  dfs(Number(fromId), [], new Set([Number(fromId)]));

  return results.sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    const da = a.reduce((s, l) => s + Number(l.distance_km || 0), 0);
    const db = b.reduce((s, l) => s + Number(l.distance_km || 0), 0);
    return da - db;
  });
}

function pathLabel(path) {
  if (!path.length) return "";
  const names = [branchName(path[0].from_branch, "Origin")];
  for (const lane of path) names.push(branchName(lane.to_branch, "?"));
  const dist = path.reduce((s, l) => s + Number(l.distance_km || 0), 0);
  const hops = path.length - 1;
  const via = hops === 0 ? "Direct" : `${hops} transit${hops === 1 ? "" : "s"}`;
  return `${names.join(" -> ")}  |  ${via}  |  ${dist.toFixed(0)} km`;
}

/**
 * From/To-driven route builder.
 *
 * Props:
 *  - lanes: normalized lane objects
 *  - value: ordered array of selected lane IDs
 *  - serviceType, fromBranchId, toBranchId
 *  - branchOptions: [{value,label}] for the From/To selects
 *  - onChange(nextLaneIds), onChangeFrom(id), onChangeTo(id)
 */
export default function OrderedLaneBuilder({
  lanes = [],
  value = [],
  serviceType = "standard",
  fromBranchId,
  toBranchId,
  branchOptions = [],
  onChange,
  onChangeFrom,
  onChangeTo,
}) {
  // Server-side suggestions (built from ALL active lanes, existing routes first).
  const [serverPaths, setServerPaths] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const PATH_PAGE_SIZE = 10;
  const [pathPage, setPathPage] = useState(1);

  useEffect(() => {
    setPathPage(1);
  }, [fromBranchId, toBranchId, serviceType]);

  useEffect(() => {
    if (!fromBranchId || !toBranchId || Number(fromBranchId) === Number(toBranchId)) {
      setServerPaths([]);
      return undefined;
    }
    let cancelled = false;
    setSuggestLoading(true);
    getTransferLanePathSuggestions({
      from_branch_id: Number(fromBranchId),
      to_branch_id: Number(toBranchId),
      service_type: serviceType || "standard",
      max_transits: 2,
      limit: 20,
    })
      .then((rows) => {
        if (!cancelled) setServerPaths(rows);
      })
      .catch(() => {
        // Fall back to client-side lane search below.
        if (!cancelled) setServerPaths([]);
      })
      .finally(() => {
        if (!cancelled) setSuggestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromBranchId, toBranchId, serviceType]);

  const lanesById = useMemo(() => {
    const map = new Map();
    // Server lanes first as a fallback; loaded (richer) lanes override them.
    for (const path of serverPaths) {
      for (const lane of path?.lanes || []) {
        map.set(Number(lane.id), {
          ...lane,
          id: Number(lane.id),
          from_branch_id: Number(lane.from_branch_id),
          to_branch_id: Number(lane.to_branch_id),
          distance_km: Number(lane.distance_km || 0),
          estimated_hours: Number(lane.estimated_hours || 0),
          is_active: true,
        });
      }
    }
    for (const lane of lanes) map.set(Number(lane.id), lane);
    return map;
  }, [lanes, serverPaths]);

  const selectedLanes = useMemo(
    () => value.map((id) => lanesById.get(Number(id))).filter(Boolean),
    [value, lanesById],
  );

  const lastToBranchId = selectedLanes.length
    ? Number(selectedLanes[selectedLanes.length - 1].to_branch_id)
    : fromBranchId
      ? Number(fromBranchId)
      : null;

  // Candidate next lanes: match service, active, not already used, and connect
  // to the last branch (or start at From when nothing picked yet).
  const candidateOptions = useMemo(() => {
    return lanes
      .filter((lane) => {
        if (String(lane.service_type) !== String(serviceType)) return false;
        if (!lane.is_active) return false;
        if (value.includes(Number(lane.id))) return false;
        if (lastToBranchId === null) return true;
        return Number(lane.from_branch_id) === lastToBranchId;
      })
      .map((lane) => ({ value: Number(lane.id), label: laneLabel(lane) }));
  }, [lanes, serviceType, value, lastToBranchId]);

  // All candidate paths (direct + via-transit alternatives) from From to To.
  // Server paths come first (existing-route chains ranked on top), then any
  // extra client-side lane paths not already listed.
  const candidatePaths = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const sp of serverPaths) {
      const ids = (sp?.lane_ids || []).map(Number);
      const path = ids.map((id) => lanesById.get(id)).filter(Boolean);
      if (!path.length || path.length !== ids.length) continue;
      const key = ids.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      path.source = sp.source || "lanes";
      out.push(path);
    }
    for (const path of findLanePaths(lanes, fromBranchId, toBranchId, serviceType)) {
      const key = path.map((l) => Number(l.id)).join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      path.source = "lanes";
      out.push(path);
    }
    return out;
  }, [serverPaths, lanesById, lanes, fromBranchId, toBranchId, serviceType]);

  const validation = useMemo(() => {
    const errors = [];
    for (let i = 0; i < selectedLanes.length; i++) {
      const lane = selectedLanes[i];
      if (String(lane.service_type) !== String(serviceType)) {
        errors.push(`Lane ${laneFrom(lane)} -> ${laneTo(lane)} is ${lane.service_type}.`);
      }
      if (i > 0) {
        const prev = selectedLanes[i - 1];
        if (Number(prev.to_branch_id) !== Number(lane.from_branch_id)) {
          errors.push(`Not connected: ${laneTo(prev)} x ${laneFrom(lane)}.`);
        }
      }
    }
    // Endpoint checks against the chosen From/To.
    if (selectedLanes.length && fromBranchId) {
      if (Number(selectedLanes[0].from_branch_id) !== Number(fromBranchId)) {
        errors.push("The first lane does not start at the From branch.");
      }
    }
    if (selectedLanes.length && toBranchId) {
      const last = selectedLanes[selectedLanes.length - 1];
      if (Number(last.to_branch_id) !== Number(toBranchId)) {
        errors.push("The last lane does not end at the To branch.");
      }
    }
    return { ok: errors.length === 0, errors };
  }, [selectedLanes, serviceType, fromBranchId, toBranchId]);

  const totals = useMemo(() => {
    const distance = selectedLanes.reduce((s, l) => s + Number(l.distance_km || 0), 0);
    const hours = selectedLanes.reduce((s, l) => s + Number(l.estimated_hours || 0), 0);
    return { distance, hours };
  }, [selectedLanes]);

  const pathBranches = useMemo(() => {
    if (!selectedLanes.length) return [];
    const names = [laneFrom(selectedLanes[0])];
    for (const lane of selectedLanes) names.push(laneTo(lane));
    return names;
  }, [selectedLanes]);

  const addLane = (laneId) => {
    if (laneId == null) return;
    onChange?.([...value, Number(laneId)]);
  };
  const removeLane = (index) => onChange?.(value.slice(0, index));
  const moveLane = (index, dir) => {
    const t = index + dir;
    if (t < 0 || t >= value.length) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(t, 0, item);
    onChange?.(next);
  };

  const applyPath = (path) => {
    onChange?.(path.map((l) => Number(l.id)));
  };

  const reachable = candidatePaths.length > 0;

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      {/* Step 1: From / To */}
      <div
        style={{
          padding: 16,
          background: "#fafafa",
          border: "1px solid #f0f0f0",
          borderRadius: 12,
        }}
      >
        <Text strong style={{ display: "block", marginBottom: 10 }}>
          1. Where does this route go?
        </Text>
        <Space size={12} wrap align="center">
          <Select
            showSearch
            allowClear
            style={{ width: 240 }}
            placeholder="From branch (origin)"
            optionFilterProp="label"
            options={branchOptions}
            value={fromBranchId ?? undefined}
            onChange={(v) => {
              onChange?.([]); // clear stale chain when endpoints change
              onChangeFrom?.(v);
            }}
          />
          <ArrowRightOutlined style={{ color: "#8c8c8c" }} />
          <Select
            showSearch
            allowClear
            style={{ width: 240 }}
            placeholder="To branch (destination)"
            optionFilterProp="label"
            options={branchOptions}
            value={toBranchId ?? undefined}
            onChange={(v) => {
              onChange?.([]); // clear stale chain when endpoints change
              onChangeTo?.(v);
            }}
          />
        </Space>

        {fromBranchId && toBranchId ? (
          reachable ? (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <ThunderboltOutlined /> {candidatePaths.length} available path
                {candidatePaths.length === 1 ? "" : "s"} - choose one:
              </Text>
              <Space
                direction="vertical"
                size={6}
                style={{ width: "100%", marginTop: 8 }}
              >
                {candidatePaths
                  .slice((pathPage - 1) * PATH_PAGE_SIZE, pathPage * PATH_PAGE_SIZE)
                  .map((path, i) => {
                  const ids = path.map((l) => Number(l.id));
                  const isSelected =
                    ids.length === value.length &&
                    ids.every((id, idx) => id === Number(value[idx]));
                  return (
                    <div
                      key={`cand-${(pathPage - 1) * PATH_PAGE_SIZE + i}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: isSelected
                          ? "1px solid #1677ff"
                          : "1px solid #f0f0f0",
                        background: isSelected ? "#e6f4ff" : "#fff",
                      }}
                    >
                      <Space size={6} wrap>
                        <Tag color={path.length === 1 ? "green" : "purple"}>
                          {path.length === 1
                            ? "Direct"
                            : `${path.length - 1} transit`}
                        </Tag>
                        <Tag color={path.source === "existing_routes" ? "gold" : "blue"}>
                          {path.source === "existing_routes"
                            ? "Existing routes"
                            : "Existing lanes"}
                        </Tag>
                        <Text style={{ fontSize: 13 }}>{pathLabel(path)}</Text>
                      </Space>
                      <Button
                        size="small"
                        type={isSelected ? "default" : "primary"}
                        onClick={() => applyPath(path)}
                      >
                        {isSelected ? "Selected" : "Use"}
                      </Button>
                    </div>
                  );
                })}
              </Space>
              {candidatePaths.length > PATH_PAGE_SIZE ? (
                <Pagination
                  size="small"
                  style={{ marginTop: 10, textAlign: "right" }}
                  current={pathPage}
                  pageSize={PATH_PAGE_SIZE}
                  total={candidatePaths.length}
                  showSizeChanger={false}
                  showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} paths`}
                  onChange={(p) => setPathPage(p)}
                />
              ) : null}
            </div>
          ) : suggestLoading ? (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Finding paths from existing lanes...
              </Text>
            </div>
          ) : (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              message="No connecting lanes found for this pair and service. Build the chain manually below, or create the missing lanes first."
            />
          )
        ) : null}
      </div>

      {/* Step 2: Lane chain */}
      <div>
        <Text strong style={{ display: "block", marginBottom: 10 }}>
          2. Lane chain
        </Text>

        {pathBranches.length >= 2 && (
          <div
            style={{
              padding: "10px 14px",
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            <Space wrap size={6}>
              {pathBranches.map((name, i) => (
                <span key={`${name}-${i}`}>
                  <Tag
                    color={
                      i === 0
                        ? "green"
                        : i === pathBranches.length - 1
                          ? "red"
                          : "purple"
                    }
                  >
                    {name}
                  </Tag>
                  {i < pathBranches.length - 1 && (
                    <ArrowRightOutlined style={{ color: "#8c8c8c", fontSize: 11 }} />
                  )}
                </span>
              ))}
            </Space>
            <div style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedLanes.length} lane{selectedLanes.length === 1 ? "" : "s"} |{" "}
                {totals.distance.toFixed(1)} km | ~{Math.round(totals.hours)} hrs |{" "}
                {Math.max(0, pathBranches.length - 2)} transit branch
                {pathBranches.length - 2 === 1 ? "" : "es"}
              </Text>
            </div>
          </div>
        )}

        {selectedLanes.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No lanes yet. Pick From/To above and apply the suggestion, or add lanes manually."
          />
        ) : (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {selectedLanes.map((lane, index) => (
              <div
                key={`lane-${lane.id}-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  border: "1px solid #f0f0f0",
                  borderRadius: 10,
                  padding: "8px 12px",
                  background: "#fff",
                }}
              >
                <Space size={8}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "#1677ff",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {index + 1}
                  </span>
                  <Text strong>
                    {laneFrom(lane)} <ArrowRightOutlined style={{ fontSize: 11 }} />{" "}
                    {laneTo(lane)}
                  </Text>
                  <Tag color="blue">{lane.service_type}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {Number(lane.distance_km || 0)} km | ~
                    {Number(lane.estimated_hours || 0)} hrs
                  </Text>
                </Space>
                <Space>
                  <Tooltip title="Move up">
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={() => moveLane(index, -1)}
                    />
                  </Tooltip>
                  <Tooltip title="Move down">
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={index === selectedLanes.length - 1}
                      onClick={() => moveLane(index, 1)}
                    />
                  </Tooltip>
                  <Tooltip title="Remove (and lanes after it)">
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeLane(index)}
                    />
                  </Tooltip>
                </Space>
              </div>
            ))}
          </Space>
        )}

        <div style={{ marginTop: 10 }}>
          <Select
            showSearch
            allowClear
            style={{ width: "100%" }}
            placeholder={
              lastToBranchId === null
                ? "Add the first lane manually"
                : `Add next lane starting from ${
                    selectedLanes.length
                      ? laneTo(selectedLanes[selectedLanes.length - 1])
                      : "the From branch"
                  }`
            }
            optionFilterProp="label"
            options={candidateOptions}
            value={null}
            onChange={(laneId) => addLane(laneId)}
            notFoundContent={
              <div style={{ padding: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  No connecting {serviceType} lane available. Create the missing
                  lane first.
                </Text>
              </div>
            }
          />
        </div>
      </div>

      {selectedLanes.length > 0 &&
        (validation.ok ? (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleFilled />}
            message={`Valid route: ${pathBranches.join(" -> ")}`}
          />
        ) : (
          <Alert
            type="error"
            showIcon
            icon={<WarningFilled />}
            message="This lane chain is not valid"
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            }
          />
        ))}
    </Space>
  );
}
