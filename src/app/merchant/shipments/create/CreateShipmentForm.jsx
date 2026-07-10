"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
  message,
} from "antd";

import {
  CalculatorOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import {
  getMerchantPickupLocations,
  merchantCreateShipment,
  merchantQuoteShipment,
} from "@/services/deliveryOperationsApi";

const { Title, Text } = Typography;

function clean(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return value;
}

function normalizeList(response) {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) return response.data;

  if (Array.isArray(response?.data?.data)) return response.data.data;

  if (Array.isArray(response?.pickup_locations)) return response.pickup_locations;

  if (Array.isArray(response?.data?.pickup_locations)) {
    return response.data.pickup_locations;
  }

  return [];
}

function extractApiData(response) {
  return response?.data?.data || response?.data || response;
}

export default function CreateShipmentForm() {
  const router = useRouter();
  const [form] = Form.useForm();

  const [pickupLocations, setPickupLocations] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loadingPickups, setLoadingPickups] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedPickupLocationId = Form.useWatch("pickup_location_id", form);
  const paymentType = Form.useWatch("payment_type", form);
  const selfDrop = Form.useWatch("self_drop", form);

  const selectedPickupLocation = useMemo(() => {
    return pickupLocations.find(
      (item) => String(item.id) === String(selectedPickupLocationId)
    );
  }, [pickupLocations, selectedPickupLocationId]);

  useEffect(() => {
    async function loadPickupLocations() {
      try {
        setLoadingPickups(true);

        const response = await getMerchantPickupLocations();
        const rows = normalizeList(response);

        setPickupLocations(rows);

        if (rows.length > 0) {
          form.setFieldsValue({
            pickup_location_id: rows[0].id,
          });
        }
      } catch (error) {
        message.error(
          error?.response?.data?.message ||
            error?.message ||
            "Could not load pickup locations."
        );
      } finally {
        setLoadingPickups(false);
      }
    }

    loadPickupLocations();
  }, [form]);

  function buildPayload() {
    const values = form.getFieldsValue(true);

    return {
      pickup_location_id: clean(values.pickup_location_id),

      sender_name: clean(values.sender_name),
      sender_phone: clean(values.sender_phone),

      receiver_name: clean(values.receiver_name),
      receiver_phone: clean(values.receiver_phone),

      delivery_address: clean(values.delivery_address),
      delivery_city: clean(values.delivery_city),
      delivery_area: clean(values.delivery_area),
      delivery_latitude: clean(values.delivery_latitude),
      delivery_longitude: clean(values.delivery_longitude),

      package_description: clean(values.package_description),
      package_weight: clean(values.package_weight),
      package_value: clean(values.package_value),

      payment_type: clean(values.payment_type),
      cod_amount:
        values.payment_type === "cod" ? clean(values.cod_amount) : 0,

      self_drop: Boolean(values.self_drop),
      special_instructions: clean(values.special_instructions),
    };
  }

  async function calculateFare() {
    try {
      await form.validateFields([
        "pickup_location_id",
        "receiver_name",
        "receiver_phone",
        "delivery_address",
        "delivery_city",
        "delivery_area",
        "package_weight",
        "payment_type",
      ]);

      setLoadingQuote(true);
      setQuote(null);

      const payload = buildPayload();
      const response = await merchantQuoteShipment(payload);
      const data = extractApiData(response);

      setQuote(data);
      message.success("Fare calculated successfully.");
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Could not calculate fare."
      );
    } finally {
      setLoadingQuote(false);
    }
  }

  async function createShipment() {
    try {
      await form.validateFields();

      setCreating(true);

      const payload = buildPayload();
      const response = await merchantCreateShipment(payload);
      const data = extractApiData(response);

      message.success("Shipment created successfully.");

      const shipmentId = data?.id || data?.shipment?.id;

      if (shipmentId) {
        router.push(`/merchant/shipments/${shipmentId}`);
      } else {
        router.push("/merchant/shipments");
      }
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Could not create shipment."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Title level={3} style={{ marginBottom: 0 }}>
          Create Shipment
        </Title>
        <Text type="secondary">
          Production-safe version without map. Enter delivery location manually.
        </Text>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card title="Shipment Form">
            <Form
              form={form}
              layout="vertical"
              onValuesChange={() => setQuote(null)}
              initialValues={{
                payment_type: "prepaid",
                self_drop: false,
                package_weight: 1,
                package_value: 0,
                cod_amount: 0,
              }}
            >
              <Divider orientation="left">Pickup Location</Divider>

              <Form.Item
                label="Pickup Location"
                name="pickup_location_id"
                rules={[
                  {
                    required: true,
                    message: "Please select pickup location.",
                  },
                ]}
              >
                <Select
                  loading={loadingPickups}
                  placeholder="Select pickup location"
                  options={pickupLocations.map((item) => ({
                    value: item.id,
                    label:
                      item.name ||
                      item.title ||
                      item.address ||
                      `Pickup Location #${item.id}`,
                  }))}
                />
              </Form.Item>

              {selectedPickupLocation && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Selected pickup location"
                  description={
                    selectedPickupLocation.address ||
                    selectedPickupLocation.full_address ||
                    selectedPickupLocation.name ||
                    "Pickup location selected."
                  }
                />
              )}

              <Divider orientation="left">Sender Details</Divider>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Sender Name" name="sender_name">
                    <Input placeholder="Sender name" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Sender Phone" name="sender_phone">
                    <Input placeholder="Sender phone" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Receiver Details</Divider>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Receiver Name"
                    name="receiver_name"
                    rules={[
                      {
                        required: true,
                        message: "Please enter receiver name.",
                      },
                    ]}
                  >
                    <Input placeholder="Receiver name" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Receiver Phone"
                    name="receiver_phone"
                    rules={[
                      {
                        required: true,
                        message: "Please enter receiver phone.",
                      },
                    ]}
                  >
                    <Input placeholder="Receiver phone" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Delivery Location</Divider>

              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="Map temporarily disabled for production build"
                description="Enter delivery address manually. Latitude and longitude are optional unless your backend requires them."
              />

              <Form.Item
                label="Delivery Address"
                name="delivery_address"
                rules={[
                  {
                    required: true,
                    message: "Please enter delivery address.",
                  },
                ]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Full delivery address"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Delivery City"
                    name="delivery_city"
                    rules={[
                      {
                        required: true,
                        message: "Please enter delivery city.",
                      },
                    ]}
                  >
                    <Input placeholder="City" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Delivery Area"
                    name="delivery_area"
                    rules={[
                      {
                        required: true,
                        message: "Please enter delivery area.",
                      },
                    ]}
                  >
                    <Input placeholder="Area" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Delivery Latitude" name="delivery_latitude">
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder="Example: 27.7172"
                      stringMode
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Delivery Longitude"
                    name="delivery_longitude"
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder="Example: 85.3240"
                      stringMode
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Package Details</Divider>

              <Form.Item
                label="Package Description"
                name="package_description"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Describe package contents"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Package Weight"
                    name="package_weight"
                    rules={[
                      {
                        required: true,
                        message: "Please enter package weight.",
                      },
                    ]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0.1}
                      step={0.1}
                      placeholder="Weight"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Package Value" name="package_value">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      placeholder="Package value"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Payment</Divider>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Payment Type"
                    name="payment_type"
                    rules={[
                      {
                        required: true,
                        message: "Please select payment type.",
                      },
                    ]}
                  >
                    <Select
                      options={[
                        { value: "prepaid", label: "Prepaid" },
                        { value: "cod", label: "Cash on Delivery" },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="COD Amount" name="cod_amount">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      disabled={paymentType !== "cod"}
                      placeholder="COD amount"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Self Drop" name="self_drop">
                <Select
                  options={[
                    { value: false, label: "No" },
                    { value: true, label: "Yes" },
                  ]}
                />
              </Form.Item>

              {selfDrop && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Self drop selected"
                  description="Merchant will drop the parcel at office/pickup point."
                />
              )}

              <Form.Item
                label="Special Instructions"
                name="special_instructions"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Any special delivery instructions"
                />
              </Form.Item>

              <Space wrap style={{ marginTop: 16 }}>
                <Button
                  icon={<CalculatorOutlined />}
                  loading={loadingQuote}
                  onClick={calculateFare}
                >
                  Check Fare
                </Button>

                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={creating}
                  onClick={createShipment}
                >
                  Create Shipment
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card title="Quote Summary">
            {quote ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Text>
                  Fare:{" "}
                  <strong>
                    {quote.fare ||
                      quote.total_fare ||
                      quote.amount ||
                      quote.delivery_charge ||
                      "Calculated"}
                  </strong>
                </Text>

                {quote.distance && (
                  <Text>
                    Distance: <strong>{quote.distance}</strong>
                  </Text>
                )}

                {quote.estimated_delivery_time && (
                  <Text>
                    ETA: <strong>{quote.estimated_delivery_time}</strong>
                  </Text>
                )}

                <Alert
                  type="success"
                  showIcon
                  message="Quote ready"
                  description="You can now create the shipment."
                />
              </Space>
            ) : (
              <Text type="secondary">
                Fill the form and click Check Fare.
              </Text>
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}