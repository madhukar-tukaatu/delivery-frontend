"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowRightOutlined,
  EnvironmentOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import {
  getCoverageLocations,
  updateCoverageLocation,
} from "@/services/branchAllocationApi";

const { Text, Title } = Typography;

const MAIN_ZONE_TYPE = "main_branch_zone";

function normalize(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toLowerCase();
}

function getApiData(response) {
  /**
   * Supports all of these common Laravel/API shapes:
   *
   * {
   *   data: [...]
   * }
   *
   * {
   *   data: {
   *      data: [...]
   *   }
   * }
   *
   * Laravel paginator:
   * {
   *   current_page: 1,
   *   data: [...]
   *   last_page: 2
   * }
   */

  if (!response) {
    return null;
  }

  if (Array.isArray(response?.data)) {
    return response;
  }

  if (response?.data && Array.isArray(response.data.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  return response;
}

function getRows(response) {
  if (!response) {
    return [];
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
}

function getPagination(response) {
  const paginator =
    response?.data && !Array.isArray(response.data)
      ? response.data
      : response;

  return {
    currentPage: Number(
      paginator?.current_page ??
        paginator?.currentPage ??
        paginator?.meta?.current_page ??
        1
    ),

    lastPage: Number(
      paginator?.last_page ??
        paginator?.lastPage ??
        paginator?.meta?.last_page ??
        1
    ),

    perPage: Number(
      paginator?.per_page ??
        paginator?.perPage ??
        paginator?.meta?.per_page ??
        100
    ),

    total: Number(
      paginator?.total ??
        paginator?.meta?.total ??
        0
    ),
  };
}

function deduplicateLocations(locations) {
  const map = new Map();

  for (const location of locations) {
    if (!location?.id) {
      continue;
    }

    map.set(String(location.id), location);
  }

  return Array.from(map.values());
}

function locationSearchText(location) {
  return [
    location?.name,
    location?.code,
    location?.city,
    location?.district,
    location?.province,
    location?.country,
    location?.area,
    location?.street,
    location?.address,
    location?.landmark,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");
}

function formatLocationLabel(location) {
  const parts = [];

  if (location?.name) {
    parts.push(location.name);
  }

  if (location?.code) {
    parts.push(location.code);
  }

  return parts.join(" • ");
}

function formatLocationDescription(location) {
  const parts = [
    location?.city,
    location?.district,
    location?.province,
  ]
    .filter(Boolean)
    .map(String);

  return parts.join(", ");
}

export default function ConvertMainToSubBranchForm({
  currentLocation,
  onSuccess,
  onCancel,
}) {
  const currentLocationId = Number(currentLocation?.id);

  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const [destinationId, setDestinationId] = useState(null);
  const [destinationSearch, setDestinationSearch] = useState("");

  const [subBranchName, setSubBranchName] = useState(
    currentLocation?.name || ""
  );

  const [latitude, setLatitude] = useState(
    currentLocation?.latitude ?? ""
  );

  const [longitude, setLongitude] = useState(
    currentLocation?.longitude ?? ""
  );

  const [coverageRadius, setCoverageRadius] = useState(
    currentLocation?.coverage_radius_km ?? 5
  );

  const [preserveLocationConfiguration, setPreserveLocationConfiguration] =
    useState(true);

  const [transferChildZones, setTransferChildZones] = useState(false);

  const [saving, setSaving] = useState(false);

  /**
   * ------------------------------------------------------------
   * LOAD ALL COVERAGE LOCATION PAGES
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * The API currently caps per_page at 100.
   *
   * Requesting:
   *
   *     ?per_page=1000
   *
   * still gives:
   *
   *     per_page: 100
   *     total: 126
   *     last_page: 2
   *
   * Therefore we explicitly fetch page 1, page 2, page 3...
   * until last_page.
   */
  const loadAllCoverageLocations = useCallback(async () => {
    setLoadingLocations(true);
    setLocationError(null);

    try {
      const allLocations = [];

      let page = 1;
      let lastPage = 1;

      /**
       * Safety limit so a broken pagination response cannot
       * create an infinite loop.
       */
      const MAX_PAGES = 100;

      while (page <= lastPage && page <= MAX_PAGES) {
        const response = await getCoverageLocations({
          page,
          per_page: 100,
        });

        const rows = getRows(response);
        const pagination = getPagination(response);

        allLocations.push(...rows);

        lastPage = Math.max(
          pagination.lastPage || 1,
          page
        );

        /**
         * If backend does not expose last_page, stop when
         * the returned page contains fewer than per_page rows.
         */
        if (!pagination.lastPage) {
          if (rows.length < pagination.perPage) {
            break;
          }

          page += 1;
          continue;
        }

        page += 1;
      }

      const uniqueLocations = deduplicateLocations(allLocations);

      setLocations(uniqueLocations);

      console.log(
        "[ConvertMainToSubBranch] Loaded coverage locations:",
        {
          totalLoaded: uniqueLocations.length,
          requestedPages: page - 1,
          locations: uniqueLocations,
        }
      );
    } catch (error) {
      console.error(
        "[ConvertMainToSubBranch] Failed to load coverage locations:",
        error
      );

      setLocationError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load coverage locations."
      );
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    loadAllCoverageLocations();
  }, [loadAllCoverageLocations]);

  /**
   * ------------------------------------------------------------
   * RESET FORM WHEN CURRENT LOCATION CHANGES
   * ------------------------------------------------------------
   */
  useEffect(() => {
    if (!currentLocation) {
      return;
    }

    setDestinationId(null);

    setSubBranchName(
      currentLocation?.name || ""
    );

    setLatitude(
      currentLocation?.latitude ?? ""
    );

    setLongitude(
      currentLocation?.longitude ?? ""
    );

    setCoverageRadius(
      currentLocation?.coverage_radius_km ?? 5
    );

    setPreserveLocationConfiguration(true);
    setTransferChildZones(false);
  }, [currentLocation]);

  /**
   * ------------------------------------------------------------
   * DESTINATION MAIN ZONES
   * ------------------------------------------------------------
   *
   * Only main_branch_zone records are valid destinations.
   *
   * Also remove the current location itself.
   */
  const destinationLocations = useMemo(() => {
    return locations
      .filter((location) => {
        if (!location) {
          return false;
        }

        if (Number(location.id) === currentLocationId) {
          return false;
        }

        return (
          normalize(location.type) ===
          MAIN_ZONE_TYPE
        );
      })
      .sort((a, b) => {
        return String(a?.name || "").localeCompare(
          String(b?.name || ""),
          undefined,
          {
            sensitivity: "base",
          }
        );
      });
  }, [locations, currentLocationId]);

  /**
   * ------------------------------------------------------------
   * SEARCH
   * ------------------------------------------------------------
   *
   * Search is performed against ALL fetched records, not just
   * the first 100 API records.
   */
  const filteredDestinationLocations = useMemo(() => {
    const query = normalize(destinationSearch);

    if (!query) {
      return destinationLocations;
    }

    return destinationLocations.filter((location) => {
      return locationSearchText(location).includes(query);
    });
  }, [
    destinationLocations,
    destinationSearch,
  ]);

  /**
   * ------------------------------------------------------------
   * SELECT OPTIONS
   * ------------------------------------------------------------
   */
  const destinationOptions = useMemo(() => {
    return filteredDestinationLocations.map(
      (location) => {
        const description =
          formatLocationDescription(location);

        return {
          value: Number(location.id),

          label: (
            <div
              style={{
                padding: "3px 0",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
              >
                {location.name}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#8c8c8c",
                  marginTop: 2,
                }}
              >
                {location.code || "No code"}

                {description
                  ? ` • ${description}`
                  : ""}
              </div>
            </div>
          ),
        };
      }
    );
  }, [filteredDestinationLocations]);

  /**
   * ------------------------------------------------------------
   * SELECTED DESTINATION
   * ------------------------------------------------------------
   */
  const selectedDestination = useMemo(() => {
    if (!destinationId) {
      return null;
    }

    return (
      destinationLocations.find(
        (location) =>
          Number(location.id) ===
          Number(destinationId)
      ) || null
    );
  }, [
    destinationId,
    destinationLocations,
  ]);

  /**
   * ------------------------------------------------------------
   * FORM VALIDATION
   * ------------------------------------------------------------
   */
  const validateForm = () => {
    if (!destinationId) {
      message.error(
        "Please select a destination main zone."
      );

      return false;
    }

    if (!String(subBranchName).trim()) {
      message.error(
        "Please enter the new sub-branch name."
      );

      return false;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const radius = Number(coverageRadius);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      message.error(
        "Please enter a valid latitude."
      );

      return false;
    }

    if (
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      message.error(
        "Please enter a valid longitude."
      );

      return false;
    }

    if (!Number.isFinite(radius) || radius <= 0) {
      message.error(
        "Please enter a valid coverage radius."
      );

      return false;
    }

    return true;
  };

  /**
   * ------------------------------------------------------------
   * SUBMIT
   * ------------------------------------------------------------
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      /**
       * IMPORTANT:
       *
       * Adjust this payload only if your backend expects a
       * different field name.
       *
       * The current conversion endpoint in your project expects
       * the coverage-location update/conversion data.
       */
      const payload = {
        parent_id: Number(destinationId),

        name: String(subBranchName).trim(),

        latitude: Number(latitude),

        longitude: Number(longitude),

        coverage_radius_km: Number(
          coverageRadius
        ),

        /**
         * Empty/null values should be sent as a string where
         * backend validation expects string.
         *
         * This also prevents the old:
         *
         * "The landmark field must be a string."
         *
         * issue.
         */
        landmark:
          currentLocation?.landmark == null
            ? ""
            : String(
                currentLocation.landmark
              ),

        address:
          currentLocation?.address == null
            ? ""
            : String(
                currentLocation.address
              ),

        street:
          currentLocation?.street == null
            ? ""
            : String(
                currentLocation.street
              ),

        area:
          currentLocation?.area == null
            ? ""
            : String(
                currentLocation.area
              ),

        city:
          currentLocation?.city == null
            ? ""
            : String(
                currentLocation.city
              ),

        district:
          currentLocation?.district == null
            ? ""
            : String(
                currentLocation.district
              ),

        province:
          currentLocation?.province == null
            ? ""
            : String(
                currentLocation.province
              ),

        country:
          currentLocation?.country == null
            ? "Nepal"
            : String(
                currentLocation.country
              ),

        preserve_location_configuration:
          Boolean(
            preserveLocationConfiguration
          ),

        transfer_child_zones:
          Boolean(transferChildZones),
      };

      /**
       * We intentionally use the existing API service here.
       *
       * If your project has a dedicated convert function,
       * replace updateCoverageLocation with that function.
       */
      await updateCoverageLocation(
        currentLocationId,
        payload
      );

      message.success(
        "Coverage location converted successfully."
      );

      if (typeof onSuccess === "function") {
        await onSuccess();
      }
    } catch (error) {
      console.error(
        "[ConvertMainToSubBranch] Conversion failed:",
        error
      );

      const errors =
        error?.response?.data?.errors;

      if (errors && typeof errors === "object") {
        const firstError = Object.values(
          errors
        )
          .flat()
          .find(Boolean);

        message.error(
          firstError ||
            error?.response?.data?.message ||
            "Conversion failed."
        );
      } else {
        message.error(
          error?.response?.data?.message ||
            error?.message ||
            "Conversion failed."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /**
   * ------------------------------------------------------------
   * CURRENT LOCATION INFO
   * ------------------------------------------------------------
   */
  const currentChildCount =
    Array.isArray(currentLocation?.children)
      ? currentLocation.children.length
      : 0;

  const currentAssignedBranchCount =
    Array.isArray(
      currentLocation?.assigned_branches
    )
      ? currentLocation.assigned_branches.length
      : 0;

  return (
    <div
      style={{
        width: "100%",
      }}
    >
      {/* ------------------------------------------------------ */}
      {/* HEADER                                                  */}
      {/* ------------------------------------------------------ */}

      <Card
        size="small"
        style={{
          marginBottom: 16,
        }}
      >
        <Space
          align="center"
          wrap
          size={12}
        >
          <Title
            level={4}
            style={{
              margin: 0,
            }}
          >
            Convert Main to Sub-Branch
          </Title>

          <Tag color="blue">
            Main → Sub-Branch
          </Tag>

          {preserveLocationConfiguration && (
            <Tag color="green">
              Location Preserved
            </Tag>
          )}
        </Space>

        <Text
          type="secondary"
          style={{
            display: "block",
            marginTop: 6,
          }}
        >
          Select the destination main zone and
          convert the current coverage location
          into a sub-branch.
        </Text>
      </Card>

      {/* ------------------------------------------------------ */}
      {/* CURRENT LOCATION                                       */}
      {/* ------------------------------------------------------ */}

      <Card
        size="small"
        style={{
          marginBottom: 16,
        }}
      >
        <Space
          direction="vertical"
          size={4}
          style={{
            width: "100%",
          }}
        >
          <Text type="secondary">
            Current Main Zone
          </Text>

          <Space wrap>
            <Text strong>
              {currentLocation?.name ||
                "Unknown"}
            </Text>

            {currentLocation?.code && (
              <Tag color="blue">
                {currentLocation.code}
              </Tag>
            )}

            <Tag color="green">
              active
            </Tag>

            <Tag>
              {currentChildCount} child zone
              {currentChildCount === 1
                ? ""
                : "s"}
            </Tag>

            <Tag>
              {currentAssignedBranchCount} branch
              {currentAssignedBranchCount === 1
                ? ""
                : "es"}
            </Tag>
          </Space>
        </Space>
      </Card>

      {/* ------------------------------------------------------ */}
      {/* ERROR                                                   */}
      {/* ------------------------------------------------------ */}

      {locationError && (
        <Alert
          type="error"
          showIcon
          style={{
            marginBottom: 16,
          }}
          message="Unable to load coverage locations"
          description={
            <Space
              direction="vertical"
              size={8}
            >
              <span>
                {locationError}
              </span>

              <Button
                size="small"
                onClick={
                  loadAllCoverageLocations
                }
                loading={loadingLocations}
              >
                Retry
              </Button>
            </Space>
          }
        />
      )}

      {/* ------------------------------------------------------ */}
      {/* CONVERSION FORM                                         */}
      {/* ------------------------------------------------------ */}

      <Card
        title={
          <Space>
            <ArrowRightOutlined />
            <span>
              Conversion Details
            </span>
          </Space>
        }
        size="small"
      >
        <Space
          direction="vertical"
          size={18}
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
                  marginRight: 4,
                }}
              >
                *
              </span>
              Destination Main Zone
            </Text>

            <div
              style={{
                marginTop: 8,
              }}
            >
              <Select
                showSearch={false}
                allowClear
                loading={loadingLocations}
                value={destinationId}
                placeholder="Select destination main zone"
                style={{
                  width: "100%",
                }}
                onChange={(value) => {
                  setDestinationId(
                    value ?? null
                  );
                }}
                onClear={() => {
                  setDestinationId(null);
                }}
                optionLabelProp="label"
                options={destinationOptions}
                notFoundContent={
                  loadingLocations ? (
                    <div
                      style={{
                        padding: 12,
                        textAlign: "center",
                      }}
                    >
                      <Spin size="small" />
                    </div>
                  ) : (
                    <Empty
                      image={
                        Empty.PRESENTED_IMAGE_SIMPLE
                      }
                      description={
                        destinationSearch
                          ? "No matching main zones"
                          : "No destination main zones found"
                      }
                    />
                  )
                }
                popupRender={(menu) => (
                  <div>
                    <div
                      style={{
                        padding: 8,
                        borderBottom:
                          "1px solid #f0f0f0",
                      }}
                    >
                      <Input
                        allowClear
                        autoFocus
                        prefix={
                          <SearchOutlined />
                        }
                        placeholder="Search name, code, city, district..."
                        value={
                          destinationSearch
                        }
                        onChange={(event) => {
                          setDestinationSearch(
                            event.target.value
                          );
                        }}
                        onKeyDown={(event) => {
                          /**
                           * Prevent the Select from interpreting
                           * keyboard input while searching.
                           */
                          event.stopPropagation();
                        }}
                      />
                    </div>

                    {menu}

                    {!loadingLocations && (
                      <div
                        style={{
                          padding:
                            "6px 10px",
                          borderTop:
                            "1px solid #f0f0f0",
                          fontSize: 11,
                          color: "#8c8c8c",
                        }}
                      >
                        Showing{" "}
                        {
                          filteredDestinationLocations.length
                        }{" "}
                        of{" "}
                        {
                          destinationLocations.length
                        }{" "}
                        main zones
                      </div>
                    )}
                  </div>
                )}
              />
            </div>

            <Text
              type="secondary"
              style={{
                display: "block",
                marginTop: 6,
                fontSize: 12,
              }}
            >
              Search works across all coverage
              locations, including records on
              page 2 or later.
            </Text>
          </div>

          {/* SELECTED DESTINATION */}
          {selectedDestination && (
            <Alert
              type="info"
              showIcon
              icon={<EnvironmentOutlined />}
              message={
                <Space wrap>
                  <Text strong>
                    {selectedDestination.name}
                  </Text>

                  {selectedDestination.code && (
                    <Tag color="blue">
                      {selectedDestination.code}
                    </Tag>
                  )}
                </Space>
              }
              description={
                <Space
                  direction="vertical"
                  size={2}
                >
                  {selectedDestination.address && (
                    <Text>
                      {
                        selectedDestination.address
                      }
                    </Text>
                  )}

                  <Text type="secondary">
                    {formatLocationDescription(
                      selectedDestination
                    )}
                  </Text>

                  {selectedDestination.latitude !=
                    null &&
                    selectedDestination.longitude !=
                      null && (
                      <Text type="secondary">
                        Coordinates:{" "}
                        {
                          selectedDestination.latitude
                        }
                        ,{" "}
                        {
                          selectedDestination.longitude
                        }
                      </Text>
                    )}
                </Space>
              }
            />
          )}

          <Divider
            style={{
              margin: "0",
            }}
          />

          {/* SUB BRANCH NAME */}
          <div>
            <Text strong>
              <span
                style={{
                  color: "#ff4d4f",
                  marginRight: 4,
                }}
              >
                *
              </span>
              New Sub-Branch Name
            </Text>

            <Input
              value={subBranchName}
              maxLength={150}
              showCount
              placeholder="Enter sub-branch name"
              style={{
                marginTop: 8,
              }}
              onChange={(event) => {
                setSubBranchName(
                  event.target.value
                );
              }}
            />
          </div>

          {/* COORDINATES */}
          <div>
            <Text strong>
              New Sub-Branch Location
            </Text>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 12,
                marginTop: 8,
              }}
            >
              <div>
                <Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                  }}
                >
                  Latitude
                </Text>

                <Input
                  type="number"
                  value={latitude}
                  onChange={(event) => {
                    setLatitude(
                      event.target.value
                    );
                  }}
                />
              </div>

              <div>
                <Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                  }}
                >
                  Longitude
                </Text>

                <Input
                  type="number"
                  value={longitude}
                  onChange={(event) => {
                    setLongitude(
                      event.target.value
                    );
                  }}
                />
              </div>
            </div>
          </div>

          {/* COVERAGE RADIUS */}
          <div>
            <Text strong>
              Coverage Radius
            </Text>

            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={coverageRadius}
              addonAfter="km"
              style={{
                marginTop: 8,
              }}
              onChange={(event) => {
                setCoverageRadius(
                  event.target.value
                );
              }}
            />
          </div>

          {/* PRESERVE LOCATION */}
          <div>
            <Space
              align="start"
              style={{
                width: "100%",
              }}
            >
              <input
                type="checkbox"
                checked={
                  preserveLocationConfiguration
                }
                onChange={(event) => {
                  setPreserveLocationConfiguration(
                    event.target.checked
                  );
                }}
                style={{
                  marginTop: 4,
                }}
              />

              <div>
                <Text strong>
                  Preserve location
                  configuration
                </Text>

                <Text
                  type="secondary"
                  style={{
                    display: "block",
                    fontSize: 12,
                  }}
                >
                  Keep the current coordinates,
                  address and coverage
                  configuration while changing
                  the hierarchy.
                </Text>
              </div>
            </Space>
          </div>

          {/* TRANSFER CHILD ZONES */}
          {currentChildCount > 0 && (
            <div>
              <Space
                align="start"
                style={{
                  width: "100%",
                }}
              >
                <input
                  type="checkbox"
                  checked={transferChildZones}
                  onChange={(event) => {
                    setTransferChildZones(
                      event.target.checked
                    );
                  }}
                  style={{
                    marginTop: 4,
                  }}
                />

                <div>
                  <Text strong>
                    Transfer child zones
                  </Text>

                  <Text
                    type="secondary"
                    style={{
                      display: "block",
                      fontSize: 12,
                    }}
                  >
                    Move the existing child zones
                    under the selected destination
                    main zone.
                  </Text>
                </div>
              </Space>
            </div>
          )}

          {/* ACTIONS */}
          <Divider
            style={{
              margin: "0",
            }}
          />

          <Space
            style={{
              width: "100%",
              justifyContent: "flex-end",
            }}
          >
            <Button
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              loading={saving}
              disabled={
                loadingLocations ||
                !destinationId ||
                !String(
                  subBranchName
                ).trim()
              }
              onClick={handleSubmit}
            >
              Convert to Sub-Branch
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}