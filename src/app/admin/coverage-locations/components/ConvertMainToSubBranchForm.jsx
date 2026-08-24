"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import dynamic from "next/dynamic";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";

import {
  ApartmentOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  SwapOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import { getCoverageLocationParentOptions } from "@/services/branchAllocationApi";

const { Text, Title } = Typography;

/* -------------------------------------------------------------------------- */
/* Map                                                                        */
/* -------------------------------------------------------------------------- */

const CoverageRadiusMap = dynamic(
  () => import("@/components/maps/CoverageRadiusMap"),
  {
    ssr: false,

    loading: () => (
      <div
        style={{
          height: "100%",
          minHeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fa",
        }}
      >
        <Space direction="vertical" align="center">
          <Spin size="large" />

          <Text type="secondary">Loading map...</Text>
        </Space>
      </div>
    ),
  },
);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function stringValue(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  if (typeof value === "object") {
    if (typeof value.value === "string") {
      return value.value.trim();
    }

    if (typeof value.label === "string") {
      return value.label.trim();
    }

    if (typeof value.name === "string") {
      return value.name.trim();
    }

    if (typeof value.text === "string") {
      return value.text.trim();
    }

    return fallback;
  }

  return fallback;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getName(location) {
  return (
    location?.name || location?.branch_name || location?.title || "Unnamed"
  );
}

function getCode(location) {
  return location?.code || location?.branch_code || "";
}

function getChildren(location) {
  if (Array.isArray(location?.children)) {
    return location.children;
  }

  if (Array.isArray(location?.child_zones)) {
    return location.child_zones;
  }

  if (Array.isArray(location?.sub_zones)) {
    return location.sub_zones;
  }

  return [];
}

function getPreservedArea(location) {
  const area = stringValue(location?.area);

  if (area) {
    return area;
  }

  const city = stringValue(location?.city);

  if (city) {
    return city;
  }

  const district = stringValue(location?.district);

  if (district) {
    return district;
  }

  const province = stringValue(location?.province);

  if (province) {
    return province;
  }

  const name = stringValue(location?.name);

  if (name) {
    return name;
  }

  return "Unknown Area";
}

function getAddress(location) {
  const fullAddress = stringValue(location?.full_address);

  if (fullAddress) {
    return fullAddress;
  }

  const address = stringValue(location?.address);

  if (address) {
    return address;
  }

  return [
    stringValue(location?.area),
    stringValue(location?.city),
    stringValue(location?.district),
    stringValue(location?.province),
    stringValue(location?.postal_code),
    stringValue(location?.country),
  ]
    .filter(Boolean)
    .join(", ");
}

/* -------------------------------------------------------------------------- */
/* Preserve location configuration                                            */
/* -------------------------------------------------------------------------- */

function buildLocationConfiguration(location) {
  return {
    country: stringValue(location?.country, "Nepal"),

    province: stringValue(location?.province),

    district: stringValue(location?.district),

    city: stringValue(location?.city),

    area: getPreservedArea(location),

    street: stringValue(location?.street),

    landmark: stringValue(location?.landmark, ""),

    address: stringValue(location?.address),
  };
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ConvertMainToSubBranchForm({
  currentLocation,

  destinationMainZones = [],

  destinationId,

  onDestinationChange,

  name,

  onNameChange,

  latitude,

  longitude,

  radius,

  onLatitudeChange,

  onLongitudeChange,

  onRadiusChange,

  childZones = [],

  keepChildZones,

  onKeepChildZonesChange,

  mapLocations = [],

  mapBranches = [],

  loadingBranches = false,

  converting = false,

  onMapChange,

  onCancel,

  onConvert,
}) {
  /* ------------------------------------------------------------------------ */
  /* Destination search state                                                */
  /* ------------------------------------------------------------------------ */

  const [destinationOptions, setDestinationOptions] = useState(
    Array.isArray(destinationMainZones) ? destinationMainZones : [],
  );

  const [destinationLoading, setDestinationLoading] = useState(false);

  const searchTimerRef = useRef(null);

  const searchRequestRef = useRef(0);

  /* ------------------------------------------------------------------------ */
  /* Sync destination options                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!Array.isArray(destinationMainZones)) {
      return;
    }

    setDestinationOptions((current) => {
      const map = new Map();

      [...current, ...destinationMainZones].forEach((zone) => {
        if (!zone?.id) {
          return;
        }

        map.set(Number(zone.id), zone);
      });

      return Array.from(map.values());
    });
  }, [destinationMainZones]);

  /* ------------------------------------------------------------------------ */
  /* Cleanup                                                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Destination                                                              */
  /* ------------------------------------------------------------------------ */

  const destination = useMemo(() => {
    const selectedId = Number(destinationId);

    if (!Number.isFinite(selectedId)) {
      return null;
    }

    const found = destinationOptions.find(
      (zone) => Number(zone?.id) === selectedId,
    );

    if (found) {
      return found;
    }

    const fallback = destinationMainZones.find(
      (zone) => Number(zone?.id) === selectedId,
    );

    return fallback || null;
  }, [destinationOptions, destinationMainZones, destinationId]);

  /* ------------------------------------------------------------------------ */
  /* Select options                                                           */
  /* ------------------------------------------------------------------------ */

  const selectOptions = useMemo(() => {
    const map = new Map();

    destinationOptions.forEach((zone) => {
      if (!zone?.id) {
        return;
      }

      map.set(Number(zone.id), zone);
    });

    destinationMainZones.forEach((zone) => {
      if (!zone?.id) {
        return;
      }

      map.set(Number(zone.id), zone);
    });

    if (destination?.id) {
      map.set(Number(destination.id), destination);
    }

    return Array.from(map.values()).map((zone) => ({
      value: Number(zone.id),

      label: `${getName(zone)}${getCode(zone) ? ` (${getCode(zone)})` : ""}`,
    }));
  }, [destinationOptions, destinationMainZones, destination]);

  /* ------------------------------------------------------------------------ */
  /* Server search                                                            */
  /* ------------------------------------------------------------------------ */

  async function searchDestinationZones(searchText) {
    const search = String(searchText || "").trim();

    if (search.length < 2) {
      setDestinationOptions(destination ? [destination] : []);

      return;
    }

    const requestId = ++searchRequestRef.current;

    try {
      setDestinationLoading(true);

      const response = await getCoverageLocationParentOptions({
        q: search,
        excludeId: currentLocation?.id ?? null,
      });

      if (requestId !== searchRequestRef.current) {
        return;
      }

      let data = [];

      if (Array.isArray(response)) {
        data = response;
      } else if (Array.isArray(response?.data)) {
        data = response.data;
      } else if (Array.isArray(response?.data?.data)) {
        data = response.data.data;
      } else if (Array.isArray(response?.items)) {
        data = response.items;
      }

      /*
       * Normalize the response.
       */
      data = data
        .filter((zone) => zone && zone.id !== null && zone.id !== undefined)
        .map((zone) => ({
          ...zone,

          id: Number(zone.id),

          name: stringValue(zone.name),

          code: stringValue(zone.code),

          type: stringValue(zone.type || zone.zone_type || zone.coverage_type),

          status: zone.status ?? "active",
        }));

      /*
       * Never lose the currently selected parent.
       */
      if (
        destination?.id &&
        !data.some((zone) => Number(zone.id) === Number(destination.id))
      ) {
        data = [destination, ...data];
      }

      setDestinationOptions(data);
    } catch (error) {
      console.error("Failed to search destination main zones:", error);

      if (requestId === searchRequestRef.current) {
        setDestinationOptions(destination ? [destination] : []);
      }
    } finally {
      if (requestId === searchRequestRef.current) {
        setDestinationLoading(false);
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Destination search                                                       */
  /* ------------------------------------------------------------------------ */

  function handleDestinationSearch(value) {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const search = String(value || "").trim();

    if (!search) {
      setDestinationOptions(destination ? [destination] : []);

      return;
    }

    if (search.length < 2) {
      setDestinationOptions(destination ? [destination] : []);

      return;
    }

    searchTimerRef.current = setTimeout(() => {
      searchDestinationZones(search);
    }, 350);
  }

  /* ------------------------------------------------------------------------ */
  /* Clear destination                                                        */
  /* ------------------------------------------------------------------------ */

  function handleDestinationClear() {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    ++searchRequestRef.current;

    setDestinationOptions([]);

    onDestinationChange?.(undefined);
  }

  /* ------------------------------------------------------------------------ */
  /* Location configuration                                                   */
  /* ------------------------------------------------------------------------ */

  const locationConfiguration = useMemo(
    () => buildLocationConfiguration(currentLocation),
    [currentLocation],
  );

  /* ------------------------------------------------------------------------ */
  /* Validation                                                               */
  /* ------------------------------------------------------------------------ */

  const validationErrors = useMemo(() => {
    const errors = [];

    if (!destinationId) {
      errors.push("Select a destination main zone.");
    }

    if (!stringValue(name)) {
      errors.push("Enter a sub-branch name.");
    }

    const lat = numberOrNull(latitude);

    const lng = numberOrNull(longitude);

    if (lat === null || lng === null) {
      errors.push("Enter valid coordinates or select a location on the map.");
    } else {
      if (lat < -90 || lat > 90) {
        errors.push("Latitude must be between -90 and 90.");
      }

      if (lng < -180 || lng > 180) {
        errors.push("Longitude must be between -180 and 180.");
      }
    }

    const radiusNumber = numberOrNull(radius);

    if (radiusNumber === null || radiusNumber <= 0) {
      errors.push("Coverage radius must be greater than 0.");
    }

    return errors;
  }, [destinationId, name, latitude, longitude, radius]);

  const canConvert = Boolean(
    currentLocation && validationErrors.length === 0 && !converting,
  );

  /* ------------------------------------------------------------------------ */
  /* Map value                                                                */
  /* ------------------------------------------------------------------------ */

  const mapValue = useMemo(
    () => ({
      latitude: numberOrNull(latitude),

      longitude: numberOrNull(longitude),
    }),
    [latitude, longitude],
  );

  /* ------------------------------------------------------------------------ */
  /* Convert                                                                  */
  /* ------------------------------------------------------------------------ */

  function handleConvert() {
    if (validationErrors.length > 0) {
      return;
    }

    const payload = {
      parent_id: Number(destinationId),

      name: stringValue(name),

      latitude: Number(latitude),

      longitude: Number(longitude),

      coverage_radius_km: Number(radius),

      country: stringValue(locationConfiguration.country, "Nepal"),

      province: stringValue(locationConfiguration.province),

      district: stringValue(locationConfiguration.district),

      city: stringValue(locationConfiguration.city),

      area: stringValue(locationConfiguration.area),

      street: stringValue(locationConfiguration.street),

      landmark: stringValue(locationConfiguration.landmark, ""),

      address: stringValue(locationConfiguration.address),

      transfer_child_zones:
        childZones.length > 0 ? Boolean(keepChildZones) : false,

      preserve_location_configuration: true,
    };

    /* ---------------------------------------------------------------------- */
    /* Final string sanitation                                                */
    /* ---------------------------------------------------------------------- */

    const stringFields = [
      "country",
      "province",
      "district",
      "city",
      "area",
      "street",
      "landmark",
      "address",
    ];

    stringFields.forEach((field) => {
      if (typeof payload[field] !== "string") {
        payload[field] = field === "country" ? "Nepal" : "";
      }
    });

    console.log("FORM CONVERSION PAYLOAD:", JSON.stringify(payload, null, 2));

    onConvert?.(payload);
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      style={{
        height: "calc(100vh - 70px)",
        minHeight: 700,
        padding: "12px 18px",
        background: "#f5f7fa",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          maxWidth: 1900,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* ---------------------------------------------------------------- */}
        {/* HEADER                                                           */}
        {/* ---------------------------------------------------------------- */}

        <Card
          bordered={false}
          style={{
            flexShrink: 0,
            borderRadius: 10,
          }}
          styles={{
            body: {
              padding: "10px 15px",
            },
          }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Space wrap>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                  }}
                >
                  Convert Main to Sub-Branch
                </Title>

                <Tag color="blue">Main → Sub-Branch</Tag>

                <Text type="secondary">
                  Preserve location configuration while changing hierarchy.
                </Text>
              </Space>
            </Col>

            <Col>
              <Tag
                color={canConvert ? "success" : "warning"}
                icon={canConvert ? <InfoCircleOutlined /> : <WarningOutlined />}
              >
                {canConvert ? "Ready to Convert" : "Complete Required Fields"}
              </Tag>
            </Col>
          </Row>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* CURRENT LOCATION                                                 */}
        {/* ---------------------------------------------------------------- */}

        <Card
          bordered={false}
          style={{
            flexShrink: 0,
            borderRadius: 10,
          }}
          styles={{
            body: {
              padding: "9px 15px",
            },
          }}
        >
          <Row gutter={[20, 8]} align="middle">
            <Col xs={24} md={6}>
              <Space>
                <EnvironmentOutlined />

                <div>
                  <Text
                    type="secondary"
                    style={{
                      display: "block",
                      fontSize: 10,
                    }}
                  >
                    CURRENT MAIN ZONE
                  </Text>

                  <Space size={5}>
                    <Text strong>{getName(currentLocation)}</Text>

                    {getCode(currentLocation) && (
                      <Tag color="blue">{getCode(currentLocation)}</Tag>
                    )}
                  </Space>
                </div>
              </Space>
            </Col>

            <Col xs={12} md={4}>
              <Text
                type="secondary"
                style={{
                  display: "block",
                  fontSize: 10,
                }}
              >
                COORDINATES
              </Text>

              <Text strong>
                {numberOrNull(currentLocation?.latitude)?.toFixed(7)}
                {" , "}
                {numberOrNull(currentLocation?.longitude)?.toFixed(7)}
              </Text>
            </Col>

            <Col xs={12} md={4}>
              <Text
                type="secondary"
                style={{
                  display: "block",
                  fontSize: 10,
                }}
              >
                CHILD ZONES
              </Text>

              <Text strong>{childZones.length}</Text>
            </Col>

            <Col>
              <Tag color="green">{currentLocation?.status || "active"}</Tag>
            </Col>
          </Row>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* CONTENT                                                          */}
        {/* ---------------------------------------------------------------- */}

        <div
          style={{
            flex: 1,
            minHeight: 0,
          }}
        >
          <Row
            gutter={10}
            style={{
              height: "100%",
            }}
          >
            {/* ------------------------------------------------------------ */}
            {/* LEFT PANEL                                                    */}
            {/* ------------------------------------------------------------ */}

            <Col
              xs={24}
              xl={8}
              style={{
                height: "100%",
              }}
            >
              <Card
                title={
                  <Space>
                    <SwapOutlined />
                    Conversion Details
                  </Space>
                }
                bordered={false}
                style={{
                  height: "100%",
                  borderRadius: 10,
                }}
                styles={{
                  body: {
                    height: "calc(100% - 56px)",
                    overflowY: "auto",
                    padding: 14,
                  },
                }}
              >
                <Space
                  direction="vertical"
                  size={12}
                  style={{
                    width: "100%",
                  }}
                >
                  {/* DESTINATION */}

                  <div>
                    <Text strong>
                      <span
                        style={{
                          color: "#ff4d4f",
                        }}
                      >
                        *
                      </span>{" "}
                      Destination Main Zone
                    </Text>

                    <Select
                      showSearch
                      allowClear
                      value={destinationId ?? undefined}
                      placeholder="Type to search main zone..."
                      searchPlaceholder="Search by name, code, city or district..."
                      loading={destinationLoading}
                      optionFilterProp="label"
                      filterOption={false}
                      onSearch={handleDestinationSearch}
                      onChange={onDestinationChange}
                      onClear={handleDestinationClear}
                      style={{
                        width: "100%",
                        marginTop: 5,
                      }}
                      options={selectOptions}
                      notFoundContent={
                        destinationLoading ? (
                          <Space>
                            <Spin size="small" />

                            <Text type="secondary">
                              Searching main zones...
                            </Text>
                          </Space>
                        ) : (
                          <Text type="secondary">
                            Type at least 2 characters to search.
                          </Text>
                        )
                      }
                    />

                    <Text
                      type="secondary"
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: 11,
                      }}
                    >
                      Search is performed on the server. Only matching main
                      zones are loaded.
                    </Text>
                  </div>

                  {/* SELECTED DESTINATION */}

                  {destination && (
                    <Alert
                      type="info"
                      showIcon
                      message={
                        <Space>
                          <Text strong>Parent Main Zone</Text>

                          <Tag color="blue">{getName(destination)}</Tag>

                          {getCode(destination) && (
                            <Tag>{getCode(destination)}</Tag>
                          )}
                        </Space>
                      }
                    />
                  )}

                  <Divider
                    style={{
                      margin: "2px 0",
                    }}
                  />

                  {/* NAME */}

                  <div>
                    <Text strong>
                      <span
                        style={{
                          color: "#ff4d4f",
                        }}
                      >
                        *
                      </span>{" "}
                      New Sub-Branch Name
                    </Text>

                    <Input
                      value={name}
                      maxLength={150}
                      showCount
                      placeholder="e.g. Hetauda Sub 1"
                      onChange={(e) => onNameChange?.(e.target.value)}
                      style={{
                        marginTop: 5,
                      }}
                    />
                  </div>

                  {/* COORDINATES */}

                  <Row gutter={8}>
                    <Col span={12}>
                      <Text strong>Latitude</Text>

                      <InputNumber
                        value={latitude}
                        precision={7}
                        controls={false}
                        min={-90}
                        max={90}
                        style={{
                          width: "100%",
                          marginTop: 5,
                        }}
                        onChange={(value) =>
                          onLatitudeChange?.(numberOrNull(value))
                        }
                      />
                    </Col>

                    <Col span={12}>
                      <Text strong>Longitude</Text>

                      <InputNumber
                        value={longitude}
                        precision={7}
                        controls={false}
                        min={-180}
                        max={180}
                        style={{
                          width: "100%",
                          marginTop: 5,
                        }}
                        onChange={(value) =>
                          onLongitudeChange?.(numberOrNull(value))
                        }
                      />
                    </Col>
                  </Row>

                  {/* RADIUS */}

                  <div>
                    <Text strong>Coverage Radius</Text>

                    <InputNumber
                      value={radius}
                      min={0.1}
                      max={500}
                      precision={2}
                      controls={false}
                      addonAfter="km"
                      style={{
                        width: "100%",
                        marginTop: 5,
                      }}
                      onChange={(value) =>
                        onRadiusChange?.(numberOrNull(value) ?? 10)
                      }
                    />
                  </div>

                  <Divider
                    style={{
                      margin: "2px 0",
                    }}
                  />

                  {/* PRESERVED LOCATION */}

                  <div>
                    <Space
                      style={{
                        marginBottom: 7,
                      }}
                    >
                      <EnvironmentOutlined />

                      <Text strong>Preserved Location</Text>

                      <Tag color="green">Preserved</Tag>
                    </Space>

                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 9,
                        background: "#fafafa",
                        padding: 10,
                      }}
                    >
                      <Text
                        type="secondary"
                        style={{
                          display: "block",
                          fontSize: 10,
                        }}
                      >
                        AREA
                      </Text>

                      <Text strong>{locationConfiguration.area}</Text>

                      <Divider
                        style={{
                          margin: "8px 0",
                        }}
                      />

                      <Text
                        type="secondary"
                        style={{
                          display: "block",
                          fontSize: 10,
                        }}
                      >
                        FULL ADDRESS
                      </Text>

                      <Text strong>{getAddress(currentLocation) || "—"}</Text>

                      <Space
                        wrap
                        size={[5, 5]}
                        style={{
                          marginTop: 8,
                        }}
                      >
                        <Tag>Country: {locationConfiguration.country}</Tag>

                        <Tag>Province: {locationConfiguration.province}</Tag>

                        <Tag>District: {locationConfiguration.district}</Tag>

                        <Tag>City: {locationConfiguration.city}</Tag>

                        <Tag>Area: {locationConfiguration.area}</Tag>

                        <Tag>Street: {locationConfiguration.street || "—"}</Tag>

                        <Tag>
                          Landmark: {locationConfiguration.landmark || "—"}
                        </Tag>
                      </Space>
                    </div>
                  </div>

                  {/* CHILDREN */}

                  {childZones.length > 0 && (
                    <div
                      style={{
                        border: "1px solid #91caff",
                        background: "#e6f4ff",
                        borderRadius: 9,
                        padding: 11,
                      }}
                    >
                      <Space align="start">
                        <ApartmentOutlined />

                        <div>
                          <Text strong>Existing Sub-Branch Transfer</Text>

                          <br />

                          <Checkbox
                            checked={Boolean(keepChildZones)}
                            onChange={(e) =>
                              onKeepChildZonesChange?.(e.target.checked)
                            }
                          >
                            Keep all existing child zones
                          </Checkbox>

                          <Text
                            type="secondary"
                            style={{
                              display: "block",
                              marginTop: 5,
                            }}
                          >
                            {childZones.length} child zone(s) found.
                          </Text>
                        </div>
                      </Space>
                    </div>
                  )}

                  {/* RESULT */}

                  {destination && (
                    <div
                      style={{
                        border: "1px solid #d9d9d9",
                        borderRadius: 9,
                        padding: 11,
                      }}
                    >
                      <Space align="start">
                        <InfoCircleOutlined />

                        <div>
                          <Text strong>Conversion Result</Text>

                          <div>
                            <Tag color="blue">{getName(destination)}</Tag>
                            will become the parent of{" "}
                            <Tag color="green">
                              {stringValue(name) || "New Sub-Branch"}
                            </Tag>
                          </div>
                        </div>
                      </Space>
                    </div>
                  )}

                  {/* VALIDATION */}

                  {validationErrors.length > 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Please complete the required fields"
                      description={
                        <ul
                          style={{
                            margin: "5px 0 0 18px",
                            padding: 0,
                          }}
                        >
                          {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      }
                    />
                  )}
                </Space>
              </Card>
            </Col>

            {/* ------------------------------------------------------------ */}
            {/* MAP                                                           */}
            {/* ------------------------------------------------------------ */}

            <Col
              xs={24}
              xl={16}
              style={{
                height: "100%",
              }}
            >
              <Card
                bordered={false}
                title={
                  <Space>
                    <EnvironmentOutlined />

                    <span>New Sub-Branch Location</span>
                  </Space>
                }
                extra={
                  <Space>
                    {loadingBranches && <Spin size="small" />}

                    <Tag color="purple">{radius || 0} km</Tag>

                    <Tag color="blue">{mapLocations.length} zones</Tag>

                    <Tag color="cyan">{mapBranches.length} branches</Tag>
                  </Space>
                }
                style={{
                  height: "100%",
                  borderRadius: 10,
                }}
                styles={{
                  body: {
                    height: "calc(100% - 56px)",
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                  },
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  <CoverageRadiusMap
                    value={mapValue}
                    radiusKm={Number(radius) || 10}
                    existingLocations={mapLocations}
                    existingBranches={mapBranches}
                    selectedLocationId={currentLocation?.id}
                    highlightedLocationId={destinationId}
                    showExisting
                    showBranches
                    showSearch
                    clickable
                    height="100%"
                    onChange={onMapChange}
                  />
                </div>

                <div
                  style={{
                    marginTop: 8,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    background: "#fafafa",
                    padding: "8px 12px",
                  }}
                >
                  <Row gutter={12} align="middle">
                    <Col flex="auto">
                      <Text
                        type="secondary"
                        style={{
                          display: "block",
                          fontSize: 10,
                        }}
                      >
                        NEW SUB-BRANCH
                      </Text>

                      <Text strong>
                        {latitude !== null && longitude !== null
                          ? `${Number(latitude).toFixed(7)}, ${Number(
                              longitude,
                            ).toFixed(7)}`
                          : "Select on map"}
                      </Text>
                    </Col>

                    <Col>
                      <Tag color="green">Sub-Branch</Tag>
                    </Col>
                  </Row>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* FOOTER                                                           */}
        {/* ---------------------------------------------------------------- */}

        <Card
          bordered={false}
          style={{
            flexShrink: 0,
            borderRadius: 10,
          }}
          styles={{
            body: {
              padding: "7px 12px",
            },
          }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Text type="secondary">
                {childZones.length > 0
                  ? keepChildZones
                    ? `${childZones.length} child zone(s) will remain under the converted sub-branch.`
                    : `${childZones.length} child zone(s) will be detached.`
                  : "No child zones to transfer."}
              </Text>
            </Col>

            <Col>
              <Space>
                <Button disabled={converting} onClick={onCancel}>
                  Cancel
                </Button>

                <Button
                  type="primary"
                  icon={<SwapOutlined />}
                  loading={converting}
                  disabled={!canConvert}
                  onClick={handleConvert}
                >
                  Convert to Sub-Branch
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
}
