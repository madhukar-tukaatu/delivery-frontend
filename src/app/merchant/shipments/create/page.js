"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  EnvironmentOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import {
  getMerchantPickupLocations,
  merchantCreateShipment,
  merchantQuoteShipment,
} from "@/services/deliveryOperationsApi";

const DeliveryLocationPicker = dynamic(
  () => import("@/components/maps/DeliveryLocationPicker"),
  { ssr: false },
);

const { Title, Text } = Typography;

function cleanString(value) {
  return typeof value === "string" ? value.trim() : value;
}

function cleanNumber(value) {
  if (value === "" || value === undefined || value === null) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

// function buildPayload(values) {
//   const paymentType = values.payment_type || "prepaid";

//   return {
//     pickup_location_id: values.self_drop ? null : values.pickup_location_id,
//     self_drop: !!values.self_drop,
//     order_reference: cleanString(values.order_reference) || null,

//     customer: {
//       name: cleanString(values.customer_name),
//       phone: cleanString(values.customer_phone),
//       email: cleanString(values.customer_email) || null,
//     },

//     delivery: {
//       address: cleanString(values.delivery_address),
//       city: cleanString(values.delivery_city),
//       area: cleanString(values.delivery_area) || null,
//       latitude: cleanNumber(values.delivery_latitude),
//       longitude: cleanNumber(values.delivery_longitude),
//     },

//     package: {
//       type: cleanString(values.package_type) || "parcel",
//       description: cleanString(values.package_description) || null,
//       weight: cleanNumber(values.weight),
//       length_cm: cleanNumber(values.length_cm) || 0,
//       width_cm: cleanNumber(values.width_cm) || 0,
//       height_cm: cleanNumber(values.height_cm) || 0,
//       pieces: cleanNumber(values.pieces) || 1,
//       value: cleanNumber(values.declared_value) || 0,
//     },

//     payment: {
//       type: paymentType,
//       cod_amount:
//         paymentType === "cod" ? cleanNumber(values.cod_amount) || 0 : 0,
//       delivery_charge_paid_by: values.delivery_charge_paid_by || "merchant",
//     },

//     special_instruction: cleanString(values.special_instruction) || null,
//   };
// }

function buildPayload(values) {
  const paymentType = values.payment_type || "prepaid";

  const merchantOrderId =
    cleanString(values.order_reference) || `MER-${Date.now()}`;

  const customerName = cleanString(values.customer_name);
  const customerPhone = cleanString(values.customer_phone);
  const customerEmail = cleanString(values.customer_email) || null;

  const deliveryAddress = cleanString(values.delivery_address);
  const deliveryCity = cleanString(values.delivery_city);
  const deliveryArea = cleanString(values.delivery_area) || null;
  const deliveryLat = cleanNumber(values.delivery_latitude);
  const deliveryLng = cleanNumber(values.delivery_longitude);

  const packageType = cleanString(values.package_type) || "parcel";
  const packageDescription = cleanString(values.package_description) || null;
  const weight = cleanNumber(values.weight);
  const lengthCm = cleanNumber(values.length_cm) || 0;
  const widthCm = cleanNumber(values.width_cm) || 0;
  const heightCm = cleanNumber(values.height_cm) || 0;
  const pieces = cleanNumber(values.pieces) || 1;
  const declaredValue = cleanNumber(values.declared_value) || 0;

  const codAmount =
    paymentType === "cod" ? cleanNumber(values.cod_amount) || 0 : 0;

  const deliveryChargePaidBy = values.delivery_charge_paid_by || "merchant";

  return {
    // pickup
    self_drop: !!values.self_drop,
    pickup_location_id: values.self_drop ? null : values.pickup_location_id,

    // order
    merchant_order_id: merchantOrderId,
    order_reference: merchantOrderId,

    // flat customer fields
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,

    // flat delivery fields
    customer_address: deliveryAddress,
    customer_city: deliveryCity,
    customer_area: deliveryArea,

    delivery_address: deliveryAddress,
    delivery_city: deliveryCity,
    delivery_area: deliveryArea,
    delivery_lat: deliveryLat,
    delivery_lng: deliveryLng,
    delivery_latitude: deliveryLat,
    delivery_longitude: deliveryLng,

    // flat package fields
    package_type: packageType,
    package_description: packageDescription,
    weight,
    length_cm: lengthCm,
    width_cm: widthCm,
    height_cm: heightCm,
    pieces,
    declared_value: declaredValue,

    // flat payment fields
    payment_type: paymentType,
    cod_amount: codAmount,
    delivery_charge_paid_by: deliveryChargePaidBy,

    special_instruction: cleanString(values.special_instruction) || null,

    // nested fields because your backend currently validates customer.name etc.
    customer: {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
    },

    delivery: {
      address: deliveryAddress,
      city: deliveryCity,
      area: deliveryArea,
      latitude: deliveryLat,
      longitude: deliveryLng,
    },

    package: {
      type: packageType,
      description: packageDescription,
      weight,
      length_cm: lengthCm,
      width_cm: widthCm,
      height_cm: heightCm,
      pieces,
      value: declaredValue,
    },

    payment: {
      type: paymentType,
      cod_amount: codAmount,
      delivery_charge_paid_by: deliveryChargePaidBy,
    },
  };
}

export default function MerchantCreateShipmentPage() {
  const router = useRouter();
  const [form] = Form.useForm();

  const [pickupLocations, setPickupLocations] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loadingPickups, setLoadingPickups] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [creating, setCreating] = useState(false);

  const paymentType = Form.useWatch("payment_type", form);
  const selfDrop = Form.useWatch("self_drop", form);
  const selectedPickupLocationId = Form.useWatch("pickup_location_id", form);

  const deliveryAddress = Form.useWatch("delivery_address", form);
  const deliveryCity = Form.useWatch("delivery_city", form);
  const deliveryArea = Form.useWatch("delivery_area", form);
  const deliveryLatitude = Form.useWatch("delivery_latitude", form);
  const deliveryLongitude = Form.useWatch("delivery_longitude", form);

  useEffect(() => {
    async function loadPickupLocations() {
      try {
        setLoadingPickups(true);

        const rows = await getMerchantPickupLocations();
        const activeRows = (rows || []).filter((row) => {
          const status = String(row.status || "active").toLowerCase();
          return (
            status === "active" || status === "approved" || status === "pending"
          );
        });

        setPickupLocations(activeRows);

        const defaultLocation =
          activeRows.find((row) => row.is_default) ||
          activeRows.find((row) => row.latitude && row.longitude) ||
          activeRows[0];

        if (defaultLocation) {
          form.setFieldsValue({ pickup_location_id: defaultLocation.id });
          form.setFields([{ name: "pickup_location_id", errors: [] }]);
        }
      } catch (error) {
        message.error("Could not load pickup locations.");
      } finally {
        setLoadingPickups(false);
      }
    }

    loadPickupLocations();
  }, [form]);

  // 2) Add this alert after pickup row:
  {
    !loadingPickups && !selfDrop && pickupLocations.length === 0 && (
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
        message="No pickup location found"
        description="Please complete onboarding and save your default pickup location before creating a shipment."
      />
    );
  }

  const selectedPickupLocation = useMemo(() => {
    return pickupLocations.find(
      (row) => Number(row.id) === Number(selectedPickupLocationId),
    );
  }, [pickupLocations, selectedPickupLocationId]);

  const pickupOptions = useMemo(() => {
    return pickupLocations.map((row) => ({
      value: row.id,
      label: `${row.name || "Pickup Location"} - ${[
        row.address,
        row.area,
        row.city,
      ]
        .filter(Boolean)
        .join(", ")}`,
    }));
  }, [pickupLocations]);

  const resetQuoteBecauseFormChanged = (changedValues) => {
    setQuote(null);

    const fieldNames = Object.keys(changedValues || {});

    if (fieldNames.length) {
      form.setFields(
        fieldNames.map((name) => ({
          name,
          errors: [],
        })),
      );
    }
  };

  const setDeliveryFromMap = (location) => {
    const values = {};

    if (location.address) {
      values.delivery_address = location.address;
    }

    if (location.city) {
      values.delivery_city = location.city;
    }

    if (location.area) {
      values.delivery_area = location.area;
    }

    values.delivery_latitude = location.latitude;
    values.delivery_longitude = location.longitude;

    form.setFieldsValue(values);

    form.setFields([
      { name: "delivery_address", errors: [] },
      { name: "delivery_city", errors: [] },
      { name: "delivery_latitude", errors: [] },
      { name: "delivery_longitude", errors: [] },
    ]);

    setQuote(null);
  };

  async function calculateFare() {
    try {
      const values = await form.validateFields();

      setLoadingQuote(true);

      const data = await merchantQuoteShipment(buildPayload(values));

      setQuote(data);

      message.success("Fare and route calculated.");
    } catch (error) {
      if (!error?.errorFields) {
        message.error(
          error?.response?.data?.message ||
            error?.message ||
            "Could not calculate fare.",
        );
      }
    } finally {
      setLoadingQuote(false);
    }
  }

  async function createShipment() {
    try {
      if (!quote) {
        message.warning(
          "Please calculate fare and route before creating shipment.",
        );
        return;
      }

      const values = await form.validateFields();

      setCreating(true);

      const data = await merchantCreateShipment(buildPayload(values));

      const shipmentId = data?.shipment?.id || data?.id;

      message.success("Shipment created successfully.");

      if (shipmentId) {
        router.push(`/merchant/shipments/${shipmentId}`);
      }
    } catch (error) {
      if (!error?.errorFields) {
        message.error(
          error?.response?.data?.message ||
            error?.message ||
            "Could not create shipment.",
        );
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Title level={3} style={{ marginBottom: 4 }}>
          Create Shipment
        </Title>

        <Text type="secondary">
          Select pickup location, choose delivery location on map, calculate
          fare, and create shipment.
        </Text>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card title="Shipment Form">
            <Form
              form={form}
              layout="vertical"
              scrollToFirstError
              onValuesChange={resetQuoteBecauseFormChanged}
              initialValues={{
                self_drop: false,
                payment_type: "prepaid",
                delivery_charge_paid_by: "merchant",
                pieces: 1,
                package_type: "parcel",
              }}
            >
              <Divider orientation="left">Pickup</Divider>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="self_drop" label="Pickup Type">
                    <Select
                      options={[
                        {
                          value: false,
                          label: "Courier pickup from my location",
                        },
                        {
                          value: true,
                          label: "Self drop at branch",
                        },
                      ]}
                    />
                  </Form.Item>
                </Col>

                {!selfDrop && (
                  <Col xs={24} md={16}>
                    {/* <Form.Item
                      name="pickup_location_id"
                      label="Merchant Pickup Location"
                      rules={[
                        {
                          required: !selfDrop,
                          message: "Pickup location is required.",
                        },
                      ]}
                    >
                      <Select
                        loading={loadingPickups}
                        showSearch
                        placeholder="Select pickup location"
                        options={pickupOptions}
                        optionFilterProp="label"
                      />
                    </Form.Item> */}
                    <Form.Item
                      name="pickup_location_id"
                      label="Auto Selected Merchant Pickup Location"
                      rules={[
                        {
                          required: !selfDrop,
                          message: "Pickup location is required.",
                        },
                      ]}
                    >
                      <Select
                        loading={loadingPickups}
                        showSearch
                        placeholder="Auto selected from merchant onboarding"
                        options={pickupOptions}
                        optionFilterProp="label"
                      />
                    </Form.Item>
                  </Col>
                )}
              </Row>

              {selectedPickupLocation && !selfDrop && (
                <Alert
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Pickup location selected"
                  description={
                    <Space direction="vertical" size={2}>
                      <Text strong>{selectedPickupLocation.name}</Text>
                      <Text>
                        {[
                          selectedPickupLocation.address,
                          selectedPickupLocation.area,
                          selectedPickupLocation.city,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                      {(selectedPickupLocation.latitude ||
                        selectedPickupLocation.longitude) && (
                        <Text type="secondary">
                          {selectedPickupLocation.latitude},{" "}
                          {selectedPickupLocation.longitude}
                        </Text>
                      )}
                    </Space>
                  }
                />
              )}

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="order_reference"
                    label="Merchant Order ID / Order Reference"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: "Merchant order ID is required.",
                      },
                    ]}
                  >
                    <Input placeholder="WEB-ORDER-1001" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Customer Details</Divider>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="customer_name"
                    label="Customer Name"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: "Customer name is required.",
                      },
                    ]}
                  >
                    <Input placeholder="Customer full name" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="customer_phone"
                    label="Customer Phone"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: "Customer phone is required.",
                      },
                      {
                        pattern: /^[0-9+\-\s]{7,20}$/,
                        message: "Enter a valid phone number.",
                      },
                    ]}
                  >
                    <Input placeholder="98XXXXXXXX" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="customer_email"
                    label="Customer Email"
                    rules={[
                      {
                        type: "email",
                        message: "Enter a valid email address.",
                      },
                    ]}
                  >
                    <Input placeholder="customer@example.com" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Delivery Location</Divider>

              <DeliveryLocationPicker
                pickupLocation={selectedPickupLocation}
                value={{
                  address: deliveryAddress,
                  city: deliveryCity,
                  area: deliveryArea,
                  latitude: deliveryLatitude,
                  longitude: deliveryLongitude,
                }}
                onChange={setDeliveryFromMap}
              />

              <div style={{ height: 16 }} />

              <Form.Item
                name="delivery_address"
                label="Full Address"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Delivery address is required.",
                  },
                ]}
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Full customer delivery address"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="delivery_city"
                    label="City"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: "Delivery city is required.",
                      },
                    ]}
                  >
                    <Input placeholder="City" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="delivery_area" label="Area">
                    <Input placeholder="Area / locality" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={4}>
                  <Form.Item name="delivery_latitude" label="Latitude">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={-90}
                      max={90}
                      step={0.000001}
                      precision={6}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={4}>
                  <Form.Item name="delivery_longitude" label="Longitude">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={-180}
                      max={180}
                      step={0.000001}
                      precision={6}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Coordinates improve branch assignment and fare"
                description="Click the map or search address to fill delivery coordinates automatically. If coordinates are empty, the system will use city/area mapping."
              />

              <Divider orientation="left">Package</Divider>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="package_type" label="Package Type">
                    <Input placeholder="parcel" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name="weight"
                    label="Actual Weight KG"
                    rules={[
                      {
                        required: true,
                        message: "Actual weight is required.",
                      },
                    ]}
                  >
                    <InputNumber
                      min={0.01}
                      step={0.1}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="pieces" label="Pieces">
                    <InputNumber min={1} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="length_cm" label="Length CM">
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="width_cm" label="Width CM">
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="height_cm" label="Height CM">
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="declared_value" label="Declared Value">
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    name="package_description"
                    label="Package Description"
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="Describe the parcel"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Payment</Divider>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="payment_type" label="Payment Type">
                    <Select
                      options={[
                        { value: "prepaid", label: "Prepaid" },
                        { value: "cod", label: "COD" },
                      ]}
                    />
                  </Form.Item>
                </Col>

                {paymentType === "cod" && (
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="cod_amount"
                      label="COD Amount"
                      rules={[
                        {
                          required: true,
                          message: "COD amount is required.",
                        },
                      ]}
                    >
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                )}

                <Col xs={24} md={8}>
                  <Form.Item
                    name="delivery_charge_paid_by"
                    label="Delivery Charge Paid By"
                  >
                    <Select
                      options={[
                        { value: "merchant", label: "Merchant" },
                        { value: "customer", label: "Customer" },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="special_instruction" label="Special Instruction">
                <Input.TextArea
                  rows={2}
                  placeholder="Call before delivery, fragile item, etc."
                />
              </Form.Item>

              <Space wrap>
                <Button
                  icon={<CalculatorOutlined />}
                  loading={loadingQuote}
                  onClick={calculateFare}
                >
                  Check Fare & Route
                </Button>

                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={creating}
                  disabled={!quote}
                  onClick={createShipment}
                >
                  Create Shipment
                </Button>
              </Space>

              {!quote && (
                <Alert
                  style={{ marginTop: 16 }}
                  type="warning"
                  showIcon
                  message="Check fare before creating shipment"
                  description="After filling the form, click Check Fare & Route. Once the fare is calculated, the Create Shipment button will be enabled."
                />
              )}
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card title="Fare & Route Preview">
            {!quote ? (
              <Alert
                type="info"
                showIcon
                message="Calculate fare to preview charge, route, and branch assignment."
              />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="Base Fee">
                    {quote.fare?.base_fee ?? 0}
                  </Descriptions.Item>

                  <Descriptions.Item label="Distance KM">
                    {quote.fare?.distance_km ?? 0}
                  </Descriptions.Item>

                  <Descriptions.Item label="Distance Fee">
                    {quote.fare?.distance_fee ?? 0}
                  </Descriptions.Item>

                  <Descriptions.Item label="Actual Weight">
                    {quote.fare?.actual_weight ?? 0}
                  </Descriptions.Item>

                  <Descriptions.Item label="Volumetric Weight">
                    {quote.fare?.volumetric_weight ?? 0}
                  </Descriptions.Item>

                  <Descriptions.Item label="Chargeable Weight">
                    {quote.fare?.chargeable_weight ?? 0}
                  </Descriptions.Item>

                  <Descriptions.Item label="Weight Fee">
                    {quote.fare?.weight_fee ?? 0}
                  </Descriptions.Item>

                  <Descriptions.Item label="COD Fee">
                    {quote.fare?.cod_fee ?? 0}
                  </Descriptions.Item>

                  <Descriptions.Item label="Delivery Charge">
                    <Text strong>{quote.fare?.delivery_charge ?? 0}</Text>
                  </Descriptions.Item>

                  <Descriptions.Item label="Total Collectable">
                    <Text strong>{quote.fare?.total_collectable ?? 0}</Text>
                  </Descriptions.Item>
                </Descriptions>

                <Divider />

                <Text strong>
                  <EnvironmentOutlined /> Route
                </Text>

                <Space wrap>
                  {(quote.route?.steps || []).map((step) => (
                    <Tag key={step} color="blue">
                      {step}
                    </Tag>
                  ))}
                </Space>

                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="Origin">
                    {quote.route?.origin_sub_branch?.name ||
                      quote.route?.origin_branch?.name ||
                      "-"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Destination">
                    {quote.route?.destination_sub_branch?.name ||
                      quote.route?.destination_branch?.name ||
                      "-"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Transfer">
                    {quote.route?.requires_transfer ? (
                      <Tag color="orange">Transfer Required</Tag>
                    ) : (
                      <Tag color="green">Local Delivery</Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
