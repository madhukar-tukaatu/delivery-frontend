"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import dynamic from "next/dynamic";

import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";

import {
  CalculatorOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  InboxOutlined,
  LoadingOutlined,
  MapOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShopOutlined,
  SwapOutlined,
  TruckOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

import "./pricing-simulator.css";

import adminPricingSimulatorService from "@/services/adminPricingSimulatorService";

/* ==========================================================================
   LEAFLET
   ========================================================================== */

const PricingMap = dynamic(
  () => import("./pricing-map"),
  {
    ssr: false,
    loading: () => (
      <div className="map-loading">
        <LoadingOutlined />

        <span>
          Loading map...
        </span>
      </div>
    ),
  },
);

/* ==========================================================================
   TYPES / CONSTANTS
   ========================================================================== */

const {
  Title,
  Text,
} = Typography;

const MIN_WEIGHT_KG = 0.001;

const SERVICE_OPTIONS = [
  {
    value: "standard",
    label: "Standard",
  },
  {
    value: "express",
    label: "Express",
  },
  {
    value: "same_day",
    label: "Same Day",
  },
];

const PAYMENT_OPTIONS = [
  {
    value: "prepaid",
    label: "Prepaid",
  },
  {
    value: "cod",
    label: "Cash on Delivery",
  },
];

const PARCEL_TYPES = [
  {
    value: "non_fragile",
    label: "Non-Fragile",
  },
  {
    value: "fragile",
    label: "Fragile",
  },
];

const DEFAULT_PACKAGE = {
  name: "Package 1",
  quantity: 1,
  actual_weight_kg: 1,
  length_cm: 10,
  width_cm: 10,
  height_cm: 20,
  parcel_type: "non_fragile",
  unit_price: 0,
};

/* ==========================================================================
   HELPERS
   ========================================================================== */

function numberValue(
  value,
  fallback = 0,
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function positiveNumber(
  value,
  minimum = MIN_WEIGHT_KG,
) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return minimum;
  }

  return Math.max(
    minimum,
    number,
  );
}

function integerValue(
  value,
  minimum = 1,
) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return minimum;
  }

  return Math.max(
    minimum,
    Math.floor(number),
  );
}

function roundNumber(
  value,
  decimals = 3,
) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  const factor =
    10 ** decimals;

  return (
    Math.round(
      number * factor,
    ) / factor
  );
}

function money(value) {
  const number =
    numberValue(value);

  return `NPR ${number.toLocaleString(
    "en-NP",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function kg(value) {
  return `${numberValue(
    value,
  ).toFixed(3)} kg`;
}

function km(value) {
  return `${numberValue(
    value,
  ).toFixed(2)} km`;
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function validCoordinate(
  latitude,
  longitude,
) {
  const lat =
    Number(latitude);

  const lng =
    Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/* ==========================================================================
   PACKAGE
   ========================================================================== */

function normalizePackage(
  packageItem = {},
  index = 0,
) {
  const quantity =
    integerValue(
      packageItem.quantity,
      1,
    );

  const actualWeight =
    positiveNumber(
      packageItem.actual_weight_kg,
      MIN_WEIGHT_KG,
    );

  return {
    id:
      packageItem.id ??
      `package-${index + 1}`,

    name:
      String(
        packageItem.name ||
          `Package ${index + 1}`,
      ).trim() ||
      `Package ${index + 1}`,

    quantity,

    actual_weight_kg:
      roundNumber(
        actualWeight,
        3,
      ),

    length_cm: Math.max(
      0,
      numberValue(
        packageItem.length_cm,
        0,
      ),
    ),

    width_cm: Math.max(
      0,
      numberValue(
        packageItem.width_cm,
        0,
      ),
    ),

    height_cm: Math.max(
      0,
      numberValue(
        packageItem.height_cm,
        0,
      ),
    ),

    parcel_type:
      packageItem.parcel_type ||
      "non_fragile",

    unit_price: Math.max(
      0,
      numberValue(
        packageItem.unit_price,
        0,
      ),
    ),
  };
}

function getTotalWeight(
  packages,
) {
  return roundNumber(
    safeArray(packages).reduce(
      (total, item) => {
        const pkg =
          normalizePackage(item);

        return (
          total +
          pkg.actual_weight_kg *
            pkg.quantity
        );
      },
      0,
    ),
    3,
  );
}

function getTotalPackages(
  packages,
) {
  return safeArray(
    packages,
  ).reduce(
    (total, item) =>
      total +
      integerValue(
        item.quantity,
        1,
      ),
    0,
  );
}

function getTotalValue(
  packages,
) {
  return safeArray(
    packages,
  ).reduce(
    (total, item) => {
      const pkg =
        normalizePackage(item);

      return (
        total +
        pkg.unit_price *
          pkg.quantity
      );
    },
    0,
  );
}

/* ==========================================================================
   STORE
   ========================================================================== */

function createStore(
  index = 1,
) {
  return {
    id: `store-${Date.now()}-${index}`,

    external_store_id:
      `STORE-${String(
        index,
      ).padStart(2, "0")}`,

    pickup_address: "",

    pickup_latitude: null,

    pickup_longitude: null,

    packages: [
      {
        ...DEFAULT_PACKAGE,
        name: "Package 1",
      },
    ],
  };
}

/* ==========================================================================
   PAYLOAD
   ========================================================================== */

function buildPackets(
  packages,
) {
  return safeArray(
    packages,
  ).map(
    (
      packageItem,
      index,
    ) => {
      const pkg =
        normalizePackage(
          packageItem,
          index,
        );

      return {
        id: index + 1,

        name: pkg.name,

        quantity:
          pkg.quantity,

        actual_weight_kg:
          pkg.actual_weight_kg,

        weight_kg:
          pkg.actual_weight_kg,

        length_cm:
          pkg.length_cm,

        width_cm:
          pkg.width_cm,

        height_cm:
          pkg.height_cm,

        parcel_type:
          pkg.parcel_type,

        unit_price:
          pkg.unit_price,
      };
    },
  );
}

function buildStorePayload(
  stores,
) {
  return safeArray(
    stores,
  ).map((store) => ({
    external_store_id:
      store.external_store_id,

    pickup_address:
      store.pickup_address ||
      "",

    pickup_latitude:
      numberValue(
        store.pickup_latitude,
        0,
      ),

    pickup_longitude:
      numberValue(
        store.pickup_longitude,
        0,
      ),

    products: safeArray(
      store.packages,
    ).map(
      (
        packageItem,
        index,
      ) => {
        const pkg =
          normalizePackage(
            packageItem,
            index,
          );

        return {
          product_id:
            `${store.external_store_id}-${index + 1}`,

          name: pkg.name,

          quantity:
            pkg.quantity,

          unit_weight:
            pkg.actual_weight_kg,

          unit_price:
            pkg.unit_price,

          parcel_type:
            pkg.parcel_type,
        };
      },
    ),
  }));
}

/* ==========================================================================
   LOCATION PICKER
   ========================================================================== */

function LocationPickerModal({
  open,
  title,
  mode,
  initialLocation,
  onCancel,
  onSelect,
}) {
  const [
    location,
    setLocation,
  ] = useState(
    initialLocation || null,
  );

  useEffect(() => {
    if (open) {
      setLocation(
        initialLocation || null,
      );
    }
  }, [
    open,
    initialLocation,
  ]);

  const selectedPoint =
    location &&
    validCoordinate(
      location.latitude,
      location.longitude,
    )
      ? [
          Number(
            location.latitude,
          ),
          Number(
            location.longitude,
          ),
        ]
      : null;

  const handleSelect =
    useCallback(
      (point) => {
        setLocation(point);
      },
      [],
    );

  const handleConfirm =
    useCallback(() => {
      if (!selectedPoint) {
        return;
      }

      onSelect({
        latitude:
          selectedPoint[0],

        longitude:
          selectedPoint[1],

        address:
          location?.address ||
          `${selectedPoint[0].toFixed(
            6,
          )}, ${selectedPoint[1].toFixed(
            6,
          )}`,
      });
    }, [
      selectedPoint,
      location,
      onSelect,
    ]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      destroyOnClose
      centered
      width={900}
      title={title}
      footer={
        <Space>
          <Button
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button
            type="primary"
            disabled={!selectedPoint}
            onClick={
              handleConfirm
            }
          >
            Use This Location
          </Button>
        </Space>
      }
    >
      <div className="picker-layout">
        <div className="picker-map">
          <PricingMap
            mode={mode}
            selectedLocation={
              location
            }
            onSelect={
              handleSelect
            }
            height={480}
            className="picker-leaflet-map"
          />

          <div className="picker-help">
            <span>
              Click anywhere on
              the map to select
              the exact location.
            </span>
          </div>
        </div>

        <div className="picker-info">
          <div className="picker-info-icon">
            <EnvironmentOutlined />
          </div>

          <Title level={5}>
            {mode === "delivery"
              ? "Delivery location"
              : "Pickup location"}
          </Title>

          <Text type="secondary">
            Select the exact point
            from the map. These
            coordinates are sent
            to the pricing engine.
          </Text>

          <Divider />

          <div className="coordinate-box">
            <Text type="secondary">
              Latitude
            </Text>

            <Text strong>
              {selectedPoint
                ? selectedPoint[0].toFixed(
                    6,
                  )
                : "—"}
            </Text>
          </div>

          <div className="coordinate-box">
            <Text type="secondary">
              Longitude
            </Text>

            <Text strong>
              {selectedPoint
                ? selectedPoint[1].toFixed(
                    6,
                  )
                : "—"}
            </Text>
          </div>

          <div className="coordinate-note">
            <span>
              Coordinates are sent
              directly to the pricing
              simulator.
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ==========================================================================
   LOCATION CARD
   ========================================================================== */

function LocationCard({
  type,
  location,
  onMap,
  onAddressChange,
}) {
  const isPickup =
    type === "pickup";

  const hasLocation =
    validCoordinate(
      location?.latitude,
      location?.longitude,
    );

  return (
    <div
      className={`location-card ${
        isPickup
          ? "location-pickup"
          : "location-delivery"
      }`}
    >
      <div className="location-icon">
        <span className="location-icon-symbol">
          {isPickup ? "P" : "D"}
        </span>
      </div>

      <div className="location-content">
        <div className="location-heading">
          <Text strong>
            {isPickup
              ? "Pickup"
              : "Delivery"}
          </Text>

          {hasLocation && (
            <Tag
              color={
                isPickup
                  ? "green"
                  : "blue"
              }
            >
              Selected
            </Tag>
          )}
        </div>

        <Input
          size="small"
          value={
            location?.address ||
            ""
          }
          onChange={(event) =>
            onAddressChange(
              event.target.value,
            )
          }
          placeholder={
            isPickup
              ? "Pickup address"
              : "Delivery address"
          }
        />

        {hasLocation && (
          <Text
            type="secondary"
            className="coordinate-text"
          >
            {Number(
              location.latitude,
            ).toFixed(6)}
            {", "}
            {Number(
              location.longitude,
            ).toFixed(6)}
          </Text>
        )}
      </div>

      <Button
        size="small"
        onClick={onMap}
      >
        <span className="map-button-icon">
          ⌖
        </span>

        Map
      </Button>
    </div>
  );
}

/* ==========================================================================
   PACKAGE CARD
   ========================================================================== */

function PackageCard({
  packageItem,
  index,
  onChange,
  onRemove,
  canRemove,
}) {
  const update =
    useCallback(
      (key, value) => {
        onChange({
          ...packageItem,
          [key]: value,
        });
      },
      [
        onChange,
        packageItem,
      ],
    );

  return (
    <div className="package-card">
      <div className="package-card-header">
        <Space size={8}>
          <span className="package-number">
            {index + 1}
          </span>

          <Text strong>
            {packageItem.name ||
              `Package ${
                index + 1
              }`}
          </Text>
        </Space>

        {canRemove && (
          <Button
            type="text"
            danger
            size="small"
            icon={
              <DeleteOutlined />
            }
            onClick={onRemove}
          />
        )}
      </div>

      <Row gutter={[8, 8]}>
        <Col span={24}>
          <label className="field-label">
            Package name
          </label>

          <Input
            size="small"
            value={
              packageItem.name
            }
            onChange={(event) =>
              update(
                "name",
                event.target.value,
              )
            }
            placeholder="Package name"
          />
        </Col>

        <Col span={12}>
          <label className="field-label">
            Weight
          </label>

          <InputNumber
            size="small"
            min={MIN_WEIGHT_KG}
            step={0.1}
            precision={3}
            value={
              packageItem.actual_weight_kg
            }
            addonAfter="kg"
            className="full-width"
            onChange={(value) =>
              update(
                "actual_weight_kg",
                value === null
                  ? MIN_WEIGHT_KG
                  : positiveNumber(
                      value,
                      MIN_WEIGHT_KG,
                    ),
              )
            }
          />
        </Col>

        <Col span={12}>
          <label className="field-label">
            Quantity
          </label>

          <InputNumber
            size="small"
            min={1}
            precision={0}
            value={
              packageItem.quantity
            }
            className="full-width"
            onChange={(value) =>
              update(
                "quantity",
                integerValue(
                  value,
                  1,
                ),
              )
            }
          />
        </Col>

        <Col span={8}>
          <label className="field-label">
            Length
          </label>

          <InputNumber
            size="small"
            min={0}
            precision={2}
            value={
              packageItem.length_cm
            }
            addonAfter="cm"
            className="full-width"
            onChange={(value) =>
              update(
                "length_cm",
                numberValue(
                  value,
                  0,
                ),
              )
            }
          />
        </Col>

        <Col span={8}>
          <label className="field-label">
            Width
          </label>

          <InputNumber
            size="small"
            min={0}
            precision={2}
            value={
              packageItem.width_cm
            }
            addonAfter="cm"
            className="full-width"
            onChange={(value) =>
              update(
                "width_cm",
                numberValue(
                  value,
                  0,
                ),
              )
            }
          />
        </Col>

        <Col span={8}>
          <label className="field-label">
            Height
          </label>

          <InputNumber
            size="small"
            min={0}
            precision={2}
            value={
              packageItem.height_cm
            }
            addonAfter="cm"
            className="full-width"
            onChange={(value) =>
              update(
                "height_cm",
                numberValue(
                  value,
                  0,
                ),
              )
            }
          />
        </Col>

        <Col span={12}>
          <label className="field-label">
            Parcel
          </label>

          <Select
            size="small"
            value={
              packageItem.parcel_type
            }
            options={
              PARCEL_TYPES
            }
            className="full-width"
            onChange={(value) =>
              update(
                "parcel_type",
                value,
              )
            }
          />
        </Col>

        <Col span={12}>
          <label className="field-label">
            Unit price
          </label>

          <InputNumber
            size="small"
            min={0}
            precision={2}
            value={
              packageItem.unit_price
            }
            addonBefore="NPR"
            className="full-width"
            onChange={(value) =>
              update(
                "unit_price",
                numberValue(
                  value,
                  0,
                ),
              )
            }
          />
        </Col>
      </Row>
    </div>
  );
}

/* ==========================================================================
   ROUTE TIMELINE
   ========================================================================== */

function RouteTimeline({
  result,
  stores,
  delivery,
}) {
  const transfers =
    safeArray(
      result?.transfer_lanes ||
        result?.transferLanes ||
        result?.route
          ?.transfer_lanes ||
        result?.transfers ||
        result?.route
          ?.transfers,
    );

  return (
    <div className="route-timeline">
      {stores.map(
        (store, index) => (
          <React.Fragment
            key={store.id}
          >
            <div className="timeline-item">
              <div className="timeline-marker pickup">
                {index + 1}
              </div>

              <div className="timeline-content">
                <div className="timeline-title">
                  Pickup
                </div>

                <Text strong>
                  {
                    store.external_store_id
                  }
                </Text>

                <Text type="secondary">
                  {
                    store.pickup_address ||
                    "Pickup location"
                  }
                </Text>
              </div>
            </div>

            <div className="timeline-line" />
          </React.Fragment>
        ),
      )}

      {transfers.map(
        (
          transfer,
          index,
        ) => {
          const name =
            transfer?.name ||
            transfer?.branch_name ||
            transfer?.branch
              ?.name ||
            transfer?.code ||
            `Transfer ${
              index + 1
            }`;

          return (
            <React.Fragment
              key={`transfer-${index}`}
            >
              <div className="timeline-item">
                <div className="timeline-marker transfer">
                  {index + 1}
                </div>

                <div className="timeline-content">
                  <div className="timeline-title">
                    Transfer
                  </div>

                  <Text strong>
                    {name}
                  </Text>
                </div>
              </div>

              <div className="timeline-line" />
            </React.Fragment>
          );
        },
      )}

      <div className="timeline-item">
        <div className="timeline-marker delivery">
          ✓
        </div>

        <div className="timeline-content">
          <div className="timeline-title">
            Delivery
          </div>

          <Text strong>
            {delivery?.address ||
              "Delivery location"}
          </Text>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   CHARGE ROW
   ========================================================================== */

function ChargeRow({
  label,
  value,
}) {
  const amount =
    numberValue(value);

  return (
    <div
      className={
        amount === 0
          ? "charge-row charge-zero"
          : "charge-row"
      }
    >
      <Text>
        {label}
      </Text>

      <Text strong>
        {money(amount)}
      </Text>
    </div>
  );
}

/* ==========================================================================
   PRICING RESULT
   ========================================================================== */

function PricingResult({
  result,
  stores,
}) {
  if (!result) {
    return (
      <div className="result-empty">
        <CalculatorOutlined />

        <Text strong>
          Pricing result
        </Text>

        <Text type="secondary">
          Select locations and
          package details, then
          calculate.
        </Text>
      </div>
    );
  }

  const weightSummary =
    result?.weight_summary ||
    {};

  const breakdown =
    result?.breakdown ||
    result?.price_breakdown ||
    {};

  const finalPrice =
    numberValue(
      result?.final_price ??
        result?.grand_total ??
        result?.total ??
        breakdown?.total,
    );

  const allPackages =
    stores.flatMap(
      (store) =>
        store.packages,
    );

  const totalWeight =
    getTotalWeight(
      allPackages,
    );

  return (
    <div className="result-container">
      <div className="result-price-panel">
        <div>
          <Text type="secondary">
            FINAL DELIVERY PRICE
          </Text>

          <div className="result-price">
            {money(finalPrice)}
          </div>
        </div>

        <Tag color="green">
          <CheckCircleOutlined />
          Calculated
        </Tag>
      </div>

      <Row
        gutter={[8, 8]}
        className="summary-strip"
      >
        <Col span={8}>
          <div className="summary-box">
            <span>
              Weight
            </span>

            <strong>
              {kg(totalWeight)}
            </strong>
          </div>
        </Col>

        <Col span={8}>
          <div className="summary-box">
            <span>
              Packages
            </span>

            <strong>
              {getTotalPackages(
                allPackages,
              )}
            </strong>
          </div>
        </Col>

        <Col span={8}>
          <div className="summary-box summary-highlight">
            <span>
              Chargeable
            </span>

            <strong>
              {kg(
                weightSummary.total_chargeable_weight_kg ??
                  totalWeight,
              )}
            </strong>
          </div>
        </Col>
      </Row>

      <Divider />

      <div className="charge-breakdown">
        <div className="result-section-heading">
          <CalculatorOutlined />

          <Text strong>
            Charge Breakdown
          </Text>
        </div>

        <ChargeRow
          label="Route Base Rate"
          value={
            breakdown
              ?.route_base_rate
              ?.total ??
            breakdown?.base
          }
        />

        <ChargeRow
          label="Additional Weight"
          value={
            breakdown
              ?.additional_weight
              ?.total ??
            breakdown?.extra_weight
          }
        />

        <ChargeRow
          label="Fragile Surcharge"
          value={
            breakdown?.fragile
              ?.total ??
            breakdown?.fragile_charge
          }
        />

        <ChargeRow
          label="Extra Distance"
          value={
            breakdown
              ?.extra_delivery_distance
              ?.total ??
            breakdown?.extra_distance
          }
        />

        <ChargeRow
          label="Service Charge"
          value={
            breakdown?.service
              ?.total ??
            breakdown?.service_charge
          }
        />

        <ChargeRow
          label="Pickup Charge"
          value={
            breakdown?.pickup
              ?.total ??
            breakdown?.pickup_charge
          }
        />

        <ChargeRow
          label="VAT"
          value={
            breakdown?.vat
              ?.total ??
            breakdown?.vat_amount
          }
        />

        <div className="charge-total">
          <Text strong>
            Total
          </Text>

          <Text strong>
            {money(finalPrice)}
          </Text>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   MAIN PAGE
   ========================================================================== */

export default function PricingTestPage() {
  const [
    messageApi,
    contextHolder,
  ] = message.useMessage();

  const [
    stores,
    setStores,
  ] = useState(() => [
    createStore(1),
  ]);

  const [
    delivery,
    setDelivery,
  ] = useState({
    address: "",
    latitude: null,
    longitude: null,
  });

  const [
    serviceType,
    setServiceType,
  ] = useState(
    "standard",
  );

  const [
    paymentType,
    setPaymentType,
  ] = useState(
    "prepaid",
  );

  const [
    result,
    setResult,
  ] = useState(null);

  const [
    calculating,
    setCalculating,
  ] = useState(false);

  const [
    activeTab,
    setActiveTab,
  ] = useState("route");

  const [
    picker,
    setPicker,
  ] = useState({
    open: false,
    mode: null,
    storeIndex: null,
    initialLocation:
      null,
  });

  const [
    errorDetails,
    setErrorDetails,
  ] = useState(null);

  const [
    autoCalculate,
    setAutoCalculate,
  ] = useState(false);

  const debounceRef =
    useRef(null);

  /* ------------------------------------------------------------------------
     PACKAGES
     ------------------------------------------------------------------------ */

  const allPackages =
    useMemo(
      () =>
        stores.flatMap(
          (store) =>
            store.packages,
        ),
      [stores],
    );

  const totalWeight =
    useMemo(
      () =>
        getTotalWeight(
          allPackages,
        ),
      [allPackages],
    );

  const totalPackages =
    useMemo(
      () =>
        getTotalPackages(
          allPackages,
        ),
      [allPackages],
    );

  const totalValue =
    useMemo(
      () =>
        getTotalValue(
          allPackages,
        ),
      [allPackages],
    );

  /* ------------------------------------------------------------------------
     MAP POINTS
     ------------------------------------------------------------------------ */

  const mapPoints =
    useMemo(() => {
      const points = [];

      stores.forEach(
        (store) => {
          if (
            validCoordinate(
              store.pickup_latitude,
              store.pickup_longitude,
            )
          ) {
            points.push([
              Number(
                store.pickup_latitude,
              ),
              Number(
                store.pickup_longitude,
              ),
            ]);
          }
        },
      );

      if (
        validCoordinate(
          delivery.latitude,
          delivery.longitude,
        )
      ) {
        points.push([
          Number(
            delivery.latitude,
          ),
          Number(
            delivery.longitude,
          ),
        ]);
      }

      return points;
    }, [
      stores,
      delivery,
    ]);

  /* ------------------------------------------------------------------------
     STORE ACTIONS
     ------------------------------------------------------------------------ */

  const updateStore =
    useCallback(
      (
        storeIndex,
        updates,
      ) => {
        setStores(
          (current) =>
            current.map(
              (
                store,
                index,
              ) =>
                index ===
                storeIndex
                  ? {
                      ...store,
                      ...updates,
                    }
                  : store,
            ),
        );

        setResult(null);
      },
      [],
    );

  const addStore =
    useCallback(() => {
      setStores(
        (current) => [
          ...current,
          createStore(
            current.length + 1,
          ),
        ],
      );

      setResult(null);
    }, []);

  const removeStore =
    useCallback(
      (storeIndex) => {
        setStores(
          (current) =>
            current.filter(
              (_, index) =>
                index !==
                storeIndex,
            ),
        );

        setResult(null);
      },
      [],
    );

  /* ------------------------------------------------------------------------
     PACKAGE ACTIONS
     ------------------------------------------------------------------------ */

  const updatePackage =
    useCallback(
      (
        storeIndex,
        packageIndex,
        packageItem,
      ) => {
        setStores(
          (current) =>
            current.map(
              (
                store,
                index,
              ) => {
                if (
                  index !==
                  storeIndex
                ) {
                  return store;
                }

                return {
                  ...store,

                  packages:
                    store.packages.map(
                      (
                        item,
                        itemIndex,
                      ) =>
                        itemIndex ===
                        packageIndex
                          ? packageItem
                          : item,
                    ),
                };
              },
            ),
        );

        setResult(null);
      },
      [],
    );

  const addPackage =
    useCallback(
      (storeIndex) => {
        setStores(
          (current) =>
            current.map(
              (
                store,
                index,
              ) => {
                if (
                  index !==
                  storeIndex
                ) {
                  return store;
                }

                const nextIndex =
                  store
                    .packages
                    .length + 1;

                return {
                  ...store,

                  packages: [
                    ...store.packages,

                    {
                      ...DEFAULT_PACKAGE,
                      name: `Package ${nextIndex}`,
                    },
                  ],
                };
              },
            ),
        );

        setResult(null);
      },
      [],
    );

  const removePackage =
    useCallback(
      (
        storeIndex,
        packageIndex,
      ) => {
        setStores(
          (current) =>
            current.map(
              (
                store,
                index,
              ) => {
                if (
                  index !==
                  storeIndex
                ) {
                  return store;
                }

                if (
                  store.packages
                    .length <= 1
                ) {
                  return store;
                }

                return {
                  ...store,

                  packages:
                    store.packages.filter(
                      (
                        _,
                        itemIndex,
                      ) =>
                        itemIndex !==
                        packageIndex,
                    ),
                };
              },
            ),
        );

        setResult(null);
      },
      [],
    );

  /* ------------------------------------------------------------------------
     LOCATION PICKER
     ------------------------------------------------------------------------ */

  const openDeliveryPicker =
    useCallback(() => {
      setPicker({
        open: true,
        mode: "delivery",
        storeIndex: null,
        initialLocation:
          delivery,
      });
    }, [delivery]);

  const openPickupPicker =
    useCallback(
      (storeIndex) => {
        const store =
          stores[
            storeIndex
          ];

        setPicker({
          open: true,
          mode: "pickup",
          storeIndex,
          initialLocation: {
            address:
              store?.pickup_address ||
              "",

            latitude:
              store?.pickup_latitude,

            longitude:
              store?.pickup_longitude,
          },
        });
      },
      [stores],
    );

  const closePicker =
    useCallback(() => {
      setPicker(
        (current) => ({
          ...current,
          open: false,
        }),
      );
    }, []);

  const handleLocationSelect =
    useCallback(
      (location) => {
        if (
          picker.mode ===
          "delivery"
        ) {
          setDelivery(
            (current) => ({
              ...current,

              latitude:
                location.latitude,

              longitude:
                location.longitude,

              address:
                current.address ||
                location.address ||
                "",
            }),
          );

          setResult(null);
        }

        if (
          picker.mode ===
            "pickup" &&
          picker.storeIndex !==
            null
        ) {
          updateStore(
            picker.storeIndex,
            {
              pickup_latitude:
                location.latitude,

              pickup_longitude:
                location.longitude,

              pickup_address:
                stores[
                  picker.storeIndex
                ]
                  ?.pickup_address ||
                location.address ||
                "",
            },
          );
        }

        closePicker();
      },
      [
        picker,
        stores,
        updateStore,
        closePicker,
      ],
    );

  /* ------------------------------------------------------------------------
     PAYLOAD
     ------------------------------------------------------------------------ */

  const buildPayload =
    useCallback(() => {
      const packets =
        buildPackets(
          allPackages,
        );

      const parcelWeight =
        roundNumber(
          packets.reduce(
            (
              total,
              packet,
            ) =>
              total +
              packet.actual_weight_kg *
                packet.quantity,
            0,
          ),
          3,
        );

      const firstStore =
        stores[0];

      const safeParcelWeight =
        Math.max(
          MIN_WEIGHT_KG,
          parcelWeight,
        );

      return {
        external_checkout_id:
          `SIM-${Date.now()}`,

        pickup_address:
          firstStore?.pickup_address ||
          "",

        pickup_latitude:
          numberValue(
            firstStore?.pickup_latitude,
            0,
          ),

        pickup_longitude:
          numberValue(
            firstStore?.pickup_longitude,
            0,
          ),

        delivery_address:
          delivery.address || "",

        delivery_latitude:
          numberValue(
            delivery.latitude,
            0,
          ),

        delivery_longitude:
          numberValue(
            delivery.longitude,
            0,
          ),

        service_type:
          serviceType,

        payment_type:
          paymentType,

        parcel_weight:
          safeParcelWeight,

        total_parcel_weight:
          safeParcelWeight,

        total_packages:
          getTotalPackages(
            allPackages,
          ),

        total_parcel_value:
          getTotalValue(
            allPackages,
          ),

        packets,

        stores:
          buildStorePayload(
            stores,
          ),
      };
    }, [
      allPackages,
      stores,
      delivery,
      serviceType,
      paymentType,
    ]);

  /* ------------------------------------------------------------------------
     VALIDATION
     ------------------------------------------------------------------------ */

  const validateBeforeCalculate =
    useCallback(() => {
      if (!stores.length) {
        messageApi.error(
          "Add at least one pickup store.",
        );

        return false;
      }

      if (
        !validCoordinate(
          delivery.latitude,
          delivery.longitude,
        )
      ) {
        messageApi.error(
          "Select the delivery location from the map.",
        );

        return false;
      }

      for (
        let storeIndex = 0;
        storeIndex <
        stores.length;
        storeIndex++
      ) {
        const store =
          stores[
            storeIndex
          ];

        if (
          !validCoordinate(
            store.pickup_latitude,
            store.pickup_longitude,
          )
        ) {
          messageApi.error(
            `Select the pickup location for store ${
              storeIndex + 1
            }.`,
          );

          return false;
        }

        if (
          !store.packages.length
        ) {
          messageApi.error(
            `Add at least one package to store ${
              storeIndex + 1
            }.`,
          );

          return false;
        }

        for (
          let packageIndex = 0;
          packageIndex <
          store.packages.length;
          packageIndex++
        ) {
          const pkg =
            normalizePackage(
              store.packages[
                packageIndex
              ],
              packageIndex,
            );

          if (
            pkg.actual_weight_kg <
            MIN_WEIGHT_KG
          ) {
            messageApi.error(
              `Package ${
                packageIndex + 1
              } in store ${
                storeIndex + 1
              } must weigh at least ${MIN_WEIGHT_KG} kg.`,
            );

            return false;
          }
        }
      }

      return true;
    }, [
      stores,
      delivery,
      messageApi,
    ]);

  /* ------------------------------------------------------------------------
     CALCULATE
     ------------------------------------------------------------------------ */

  const calculate =
    useCallback(async () => {
      if (
        !validateBeforeCalculate()
      ) {
        return;
      }

      const payload =
        buildPayload();

      setCalculating(true);
      setErrorDetails(null);

      try {
        console.log(
          "PRICING SIMULATOR PAYLOAD",
          payload,
        );

        /**
         * IMPORTANT:
         *
         * The page does not communicate
         * with Axios/api directly anymore.
         *
         * Everything goes through:
         *
         * adminPricingSimulatorService
         *        ↓
         *      lib/api
         */
        const response =
          await adminPricingSimulatorService.calculate(
            payload,
          );

        setResult(response);

        setActiveTab("result");

        messageApi.success(
          "Pricing calculated successfully.",
        );
      } catch (error) {
        console.error(
          "PRICING SIMULATOR ERROR",
          error,
        );

        const response =
          error?.response?.data;

        const errors =
          response?.errors || {};

        const firstError =
          Object.values(
            errors,
          )
            .flat()
            .find(Boolean);

        setResult(null);

        setErrorDetails({
          message:
            response?.message ||
            firstError ||
            error?.message ||
            "Pricing calculation failed.",

          errors,

          payload,
        });

        messageApi.error(
          response?.message ||
            firstError ||
            "Pricing calculation failed.",
        );
      } finally {
        setCalculating(false);
      }
    }, [
      validateBeforeCalculate,
      buildPayload,
      messageApi,
    ]);

  /* ------------------------------------------------------------------------
     AUTO CALCULATE
     ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!autoCalculate) {
      return undefined;
    }

    clearTimeout(
      debounceRef.current,
    );

    debounceRef.current =
      setTimeout(() => {
        calculate();
      }, 800);

    return () => {
      clearTimeout(
        debounceRef.current,
      );
    };
  }, [
    autoCalculate,
    stores,
    delivery,
    serviceType,
    paymentType,
    calculate,
  ]);

  /* ------------------------------------------------------------------------
     RESET
     ------------------------------------------------------------------------ */

  const reset =
    useCallback(() => {
      clearTimeout(
        debounceRef.current,
      );

      setStores([
        createStore(1),
      ]);

      setDelivery({
        address: "",
        latitude: null,
        longitude: null,
      });

      setServiceType(
        "standard",
      );

      setPaymentType(
        "prepaid",
      );

      setResult(null);
      setErrorDetails(null);
      setActiveTab("route");
    }, []);

  /* ------------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------------ */

  return (
    <>
      {contextHolder}

      <div className="pricing-page">
        <Card
          bordered={false}
          className="simulator-header"
        >
          <div className="header-left">
            <div className="header-icon">
              <CalculatorOutlined />
            </div>

            <div>
              <Title level={3}>
                Pricing Simulator
              </Title>

              <Text type="secondary">
                Select pickup
                locations, delivery
                and package details.
                The pricing engine
                resolves the configured
                transfer route and
                final charge.
              </Text>
            </div>
          </div>

          <Space>
            <label className="auto-calculate">
              <input
                type="checkbox"
                checked={
                  autoCalculate
                }
                onChange={(
                  event,
                ) =>
                  setAutoCalculate(
                    event.target
                      .checked,
                  )
                }
              />

              <span>
                Auto
              </span>
            </label>

            <Button
              icon={
                <ReloadOutlined />
              }
              onClick={reset}
              disabled={
                calculating
              }
            >
              Reset
            </Button>

            <Button
              type="primary"
              icon={
                calculating ? (
                  <LoadingOutlined />
                ) : (
                  <CalculatorOutlined />
                )
              }
              loading={calculating}
              onClick={
                calculate
              }
            >
              Calculate
            </Button>
          </Space>
        </Card>

        <div className="simulator-grid">
          <div className="left-panel">
            <Card
              bordered={false}
              className="section-card"
              title={
                <div className="section-title">
                  <EnvironmentOutlined />

                  <div>
                    <Text strong>
                      Shipment Route
                    </Text>

                    <Text type="secondary">
                      Pickup stores →
                      configured
                      transfer lanes →
                      delivery
                    </Text>
                  </div>
                </div>
              }
              extra={
                <Tag color="blue">
                  {stores.length}{" "}
                  pickup
                  {stores.length !==
                  1
                    ? "s"
                    : ""}
                </Tag>
              }
            >
              <div className="route-instruction">
                Click{" "}
                <strong>
                  Map
                </strong>{" "}
                to select exact
                coordinates.
              </div>

              <LocationCard
                type="delivery"
                location={
                  delivery
                }
                onMap={
                  openDeliveryPicker
                }
                onAddressChange={(
                  address,
                ) =>
                  setDelivery(
                    (current) => ({
                      ...current,
                      address,
                    }),
                  )
                }
              />

              <div className="route-divider">
                <SwapOutlined />
              </div>

              <div className="store-header">
                <div>
                  <ShopOutlined />

                  <Text strong>
                    Pickup Stores
                  </Text>

                  <Text type="secondary">
                    {stores.length}{" "}
                    location
                    {stores.length !==
                    1
                      ? "s"
                      : ""}
                  </Text>
                </div>

                <Button
                  type="link"
                  size="small"
                  icon={
                    <PlusOutlined />
                  }
                  onClick={
                    addStore
                  }
                >
                  Add store
                </Button>
              </div>

              <div className="stores-list">
                {stores.map(
                  (
                    store,
                    storeIndex,
                  ) => (
                    <div
                      className="store-card"
                      key={store.id}
                    >
                      <div className="store-card-header">
                        <Space>
                          <span className="store-number">
                            {storeIndex +
                              1}
                          </span>

                          <Input
                            size="small"
                            value={
                              store.external_store_id
                            }
                            onChange={(
                              event,
                            ) =>
                              updateStore(
                                storeIndex,
                                {
                                  external_store_id:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                            placeholder="Store ID"
                            className="store-id-input"
                          />
                        </Space>

                        {stores.length >
                          1 && (
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={
                              <DeleteOutlined />
                            }
                            onClick={() =>
                              removeStore(
                                storeIndex,
                              )
                            }
                          />
                        )}
                      </div>

                      <LocationCard
                        type="pickup"
                        location={{
                          address:
                            store.pickup_address,
                          latitude:
                            store.pickup_latitude,
                          longitude:
                            store.pickup_longitude,
                        }}
                        onMap={() =>
                          openPickupPicker(
                            storeIndex,
                          )
                        }
                        onAddressChange={(
                          address,
                        ) =>
                          updateStore(
                            storeIndex,
                            {
                              pickup_address:
                                address,
                            },
                          )
                        }
                      />

                      <div className="package-section">
                        <div className="package-section-header">
                          <div>
                            <InboxOutlined />

                            <Text strong>
                              Packages
                            </Text>

                            <Badge
                              count={
                                store
                                  .packages
                                  .length
                              }
                              size="small"
                            />
                          </div>

                          <Button
                            type="link"
                            size="small"
                            icon={
                              <PlusOutlined />
                            }
                            onClick={() =>
                              addPackage(
                                storeIndex,
                              )
                            }
                          >
                            Add
                          </Button>
                        </div>

                        <div className="packages-list">
                          {store.packages.map(
                            (
                              packageItem,
                              packageIndex,
                            ) => (
                              <PackageCard
                                key={`${store.id}-${packageIndex}`}
                                packageItem={
                                  packageItem
                                }
                                index={
                                  packageIndex
                                }
                                canRemove={
                                  store
                                    .packages
                                    .length >
                                  1
                                }
                                onRemove={() =>
                                  removePackage(
                                    storeIndex,
                                    packageIndex,
                                  )
                                }
                                onChange={(
                                  nextPackage,
                                ) =>
                                  updatePackage(
                                    storeIndex,
                                    packageIndex,
                                    nextPackage,
                                  )
                                }
                              />
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </Card>

            <Card
              bordered={false}
              className="section-card"
              title={
                <div className="section-title">
                  <TruckOutlined />

                  <div>
                    <Text strong>
                      Shipment
                    </Text>

                    <Text type="secondary">
                      Values used by the
                      pricing engine.
                    </Text>
                  </div>
                </div>
              }
            >
              <Row gutter={10}>
                <Col span={12}>
                  <label className="field-label">
                    Service
                  </label>

                  <Select
                    size="small"
                    value={
                      serviceType
                    }
                    onChange={
                      setServiceType
                    }
                    options={
                      SERVICE_OPTIONS
                    }
                    className="full-width"
                  />
                </Col>

                <Col span={12}>
                  <label className="field-label">
                    Payment
                  </label>

                  <Select
                    size="small"
                    value={
                      paymentType
                    }
                    onChange={
                      setPaymentType
                    }
                    options={
                      PAYMENT_OPTIONS
                    }
                    className="full-width"
                  />
                </Col>
              </Row>

              <div className="summary-strip shipment-summary">
                <div>
                  <span>
                    Weight
                  </span>

                  <strong>
                    {kg(
                      totalWeight,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Packages
                  </span>

                  <strong>
                    {totalPackages}
                  </strong>
                </div>

                <div>
                  <span>
                    Value
                  </span>

                  <strong>
                    {money(
                      totalValue,
                    )}
                  </strong>
                </div>
              </div>

              <Alert
                className="automatic-pricing-alert"
                type="info"
                showIcon
                icon={
                  <CalculatorOutlined />
                }
                message="Automatic pricing"
                description="Pricing uses the configured branch pricing and global pricing settings. The shipment route is resolved from the configured branch transfer routes."
              />
            </Card>
          </div>

          <div className="right-panel">
            <Card
              bordered={false}
              className="map-card"
              title={
                <div className="section-title">
                  <GlobalOutlined />

                  <div>
                    <Text strong>
                      Shipment Map
                    </Text>

                    <Text type="secondary">
                      Pickup →
                      configured
                      transfers →
                      delivery
                    </Text>
                  </div>
                </div>
              }
            >
              <div className="map-wrapper">
                <PricingMap
                  points={mapPoints}
                  stores={stores}
                  delivery={
                    delivery
                  }
                  result={result}
                  height={480}
                />

                {!mapPoints.length && (
                  <div className="map-overlay-empty">
                    <MapOutlined />

                    <Text strong>
                      Select locations
                    </Text>

                    <Text type="secondary">
                      Use the Map buttons
                      on the left to
                      place pickup and
                      delivery pins.
                    </Text>
                  </div>
                )}

                {mapPoints.length >
                  0 && (
                  <div className="map-coordinates-panel">
                    {stores.map(
                      (
                        store,
                        index,
                      ) =>
                        validCoordinate(
                          store.pickup_latitude,
                          store.pickup_longitude,
                        ) && (
                          <div
                            key={
                              store.id
                            }
                          >
                            <i className="legend-dot pickup" />

                            <span>
                              Pickup{" "}
                              {index +
                                1}
                            </span>

                            <strong>
                              {Number(
                                store.pickup_latitude,
                              ).toFixed(
                                4,
                              )}
                              ,{" "}
                              {Number(
                                store.pickup_longitude,
                              ).toFixed(
                                4,
                              )}
                            </strong>
                          </div>
                        ),
                    )}

                    {validCoordinate(
                      delivery.latitude,
                      delivery.longitude,
                    ) && (
                      <div>
                        <i className="legend-dot delivery" />

                        <span>
                          Delivery
                        </span>

                        <strong>
                          {Number(
                            delivery.latitude,
                          ).toFixed(
                            4,
                          )}
                          ,{" "}
                          {Number(
                            delivery.longitude,
                          ).toFixed(
                            4,
                          )}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card
              bordered={false}
              className="result-card"
            >
              <div className="result-tabs">
                <button
                  className={
                    activeTab ===
                    "route"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab(
                      "route",
                    )
                  }
                >
                  <TruckOutlined />
                  Route
                </button>

                <button
                  className={
                    activeTab ===
                    "result"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab(
                      "result",
                    )
                  }
                >
                  <CalculatorOutlined />
                  Pricing

                  {result && (
                    <Badge
                      count="✓"
                      color="green"
                    />
                  )}
                </button>

                <button
                  className={
                    activeTab ===
                    "payload"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab(
                      "payload",
                    )
                  }
                >
                  <UnorderedListOutlined />
                  Request
                </button>
              </div>

              <div className="result-body">
                {activeTab ===
                  "route" && (
                  <>
                    {result ? (
                      <RouteTimeline
                        result={
                          result
                        }
                        stores={
                          stores
                        }
                        delivery={
                          delivery
                        }
                      />
                    ) : (
                      <div className="result-empty">
                        <TruckOutlined />

                        <Text strong>
                          Route result
                        </Text>

                        <Text type="secondary">
                          Calculate pricing
                          to see the
                          resolved transfer
                          route.
                        </Text>
                      </div>
                    )}
                  </>
                )}

                {activeTab ===
                  "result" && (
                  <PricingResult
                    result={
                      result
                    }
                    stores={
                      stores
                    }
                  />
                )}

                {activeTab ===
                  "payload" && (
                  <div className="payload-view">
                    <pre>
                      {JSON.stringify(
                        buildPayload(),
                        null,
                        2,
                      )}
                    </pre>

                    {errorDetails && (
                      <Alert
                        type="error"
                        showIcon
                        message={
                          errorDetails.message
                        }
                      />
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <LocationPickerModal
          open={picker.open}
          title={
            picker.mode ===
            "delivery"
              ? "Select Delivery Location"
              : "Select Pickup Location"
          }
          mode={
            picker.mode
          }
          initialLocation={
            picker.initialLocation
          }
          onCancel={
            closePicker
          }
          onSelect={
            handleLocationSelect
          }
        />
      </div>
    </>
  );
}