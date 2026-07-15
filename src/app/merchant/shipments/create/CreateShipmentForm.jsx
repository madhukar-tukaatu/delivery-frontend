"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

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
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import {
  getMerchantPickupLocations,
  merchantCreateShipment,
  merchantQuoteShipment,
} from "@/services/deliveryOperationsApi";

const DeliveryLocationPicker = dynamic(
  () => import("@/components/maps/DeliveryLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 380,
          borderRadius: 12,
          background: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading map...
      </div>
    ),
  }
);

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

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
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

  const deliveryLatitude = Form.useWatch("delivery_latitude", form);
  const deliveryLongitude = Form.useWatch("delivery_longitude", form);
  const deliveryAddress = Form.useWatch("delivery_address", form);
  const deliveryCity = Form.useWatch("delivery_city", form);
  const deliveryArea = Form.useWatch("delivery_area", form);

  const selectedPickupLocation = useMemo(() => {
    return pickupLocations.find(
      (item) => String(item.id) === String(selectedPickupLocationId)
    );
  }, [pickupLocations, selectedPickupLocationId]);

  const deliveryLocationValue = useMemo(() => {
    return {
      latitude: deliveryLatitude,
      longitude: deliveryLongitude,
      address: deliveryAddress,
      city: deliveryCity,
      area: deliveryArea,
    };
  }, [
    deliveryLatitude,
    deliveryLongitude,
    deliveryAddress,
    deliveryCity,
    deliveryArea,
  ]);

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

  function updateDeliveryLocation(location) {
    form.setFieldsValue({
      delivery_address: location.address || form.getFieldValue("delivery_address"),
      delivery_city: location.city || form.getFieldValue("delivery_city"),
      delivery_area: location.area || form.getFieldValue("delivery_area"),
      delivery_latitude: location.latitude,
      delivery_longitude: location.longitude,
    });

    setQuote(null);
  }

  function buildPayload() {
    const values = form.getFieldsValue(true);

    const items = (values.items || [])
      .filter((item) => item?.name)
      .map((item) => ({
        name: item.name,
        quantity: Number(item.quantity || 1),
        value: Number(item.value || 0),
      }));

    const packageWeight = Number(values.package_weight || 0);
    const packageValue = Number(values.package_value || 0);
    const codAmount =
      values.payment_type === "cod" ? Number(values.cod_amount || 0) : 0;

    return {
      merchant_order_id: clean(values.merchant_order_id),
      order_source: clean(values.order_source),

      pickup_location_id: clean(values.pickup_location_id),

      sender_name: clean(values.sender_name),
      sender_phone: clean(values.sender_phone),

      receiver_name: clean(values.receiver_name),
      receiver_phone: clean(values.receiver_phone),

      delivery_address: clean(values.delivery_address),
      delivery_city: clean(values.delivery_city),
      delivery_area: clean(values.delivery_area),
      delivery_latitude: toNumberOrNull(values.delivery_latitude),
      delivery_longitude: toNumberOrNull(values.delivery_longitude),

      service_type: clean(values.service_type),

      items,

      package_description: clean(values.package_description),
      package_weight: packageWeight,
      package_value: packageValue,

      parcel_weight: packageWeight,
      parcel_value: packageValue,

      payment_type: clean(values.payment_type),
      cod_amount: codAmount,

      self_drop: Boolean(values.self_drop),
      special_instructions: clean(values.special_instructions),
    };
  }

  async function calculateFare() {
    try {
      await form.validateFields([
        "merchant_order_id",
        "pickup_location_id",
        "receiver_name",
        "receiver_phone",
        "delivery_address",
        "delivery_city",
        "delivery_area",
        "delivery_latitude",
        "delivery_longitude",
        "service_type",
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
          Create a delivery shipment for your customer order.
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
                order_source: "manual",
                payment_type: "prepaid",
                self_drop: false,
                package_weight: 1,
                package_value: 0,
                cod_amount: 0,
                service_type: "standard",
                items: [
                  {
                    name: "",
                    quantity: 1,
                    value: 0,
                  },
                ],
              }}
            >
              <Divider orientation="left">Order Details</Divider>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Merchant Order ID"
                    name="merchant_order_id"
                    rules={[
                      {
                        required: true,
                        message: "Please enter merchant order ID.",
                      },
                    ]}
                  >
                    <Input placeholder="Example: ORD-10045" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Order Source" name="order_source">
                    <Select
                      options={[
                        { value: "manual", label: "Manual Order" },
                        { value: "website", label: "Website" },
                        { value: "facebook", label: "Facebook" },
                        { value: "instagram", label: "Instagram" },
                        { value: "whatsapp", label: "WhatsApp" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

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

              <DeliveryLocationPicker
                value={deliveryLocationValue}
                pickupLocation={selectedPickupLocation}
                onChange={updateDeliveryLocation}
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
                <Input.TextArea rows={3} placeholder="Full delivery address" />
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
                  <Form.Item
                    label="Delivery Latitude"
                    name="delivery_latitude"
                    rules={[
                      {
                        required: true,
                        message: "Please select delivery location on map.",
                      },
                    ]}
                  >
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
                    rules={[
                      {
                        required: true,
                        message: "Please select delivery location on map.",
                      },
                    ]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder="Example: 85.3240"
                      stringMode
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Ordered Products</Divider>

              <Form.List name="items">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    {fields.map(({ key, name, ...restField }) => (
                      <Card key={key} size="small">
                        <Row gutter={16} align="middle">
                          <Col xs={24} md={10}>
                            <Form.Item
                              {...restField}
                              label="Product Name"
                              name={[name, "name"]}
                              rules={[
                                {
                                  required: true,
                                  message: "Product name is required.",
                                },
                              ]}
                            >
                              <Input placeholder="Product name" />
                            </Form.Item>
                          </Col>

                          <Col xs={12} md={4}>
                            <Form.Item
                              {...restField}
                              label="Qty"
                              name={[name, "quantity"]}
                              rules={[
                                {
                                  required: true,
                                  message: "Qty required.",
                                },
                              ]}
                            >
                              <InputNumber
                                min={1}
                                style={{ width: "100%" }}
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={12} md={5}>
                            <Form.Item
                              {...restField}
                              label="Value"
                              name={[name, "value"]}
                            >
                              <InputNumber
                                min={0}
                                style={{ width: "100%" }}
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={5}>
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                            >
                              Remove
                            </Button>
                          </Col>
                        </Row>
                      </Card>
                    ))}

                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => add({ name: "", quantity: 1, value: 0 })}
                    >
                      Add Product
                    </Button>
                  </Space>
                )}
              </Form.List>

              <Divider orientation="left">Delivery Service</Divider>

              <Form.Item
                label="Delivery Service"
                name="service_type"
                rules={[
                  {
                    required: true,
                    message: "Please select delivery service.",
                  },
                ]}
              >
                <Select
                  options={[
                    { value: "standard", label: "Standard Delivery" },
                    { value: "express", label: "Express Delivery" },
                    { value: "same_day", label: "Same Day Delivery" },
                  ]}
                />
              </Form.Item>

              <Divider orientation="left">Package Details</Divider>

              <Form.Item label="Package Description" name="package_description">
                <Input.TextArea rows={2} placeholder="Describe package contents" />
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

              <Form.Item label="Special Instructions" name="special_instructions">
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
                    NPR{" "}
                    {quote.final_delivery_fee ||
                      quote.fare ||
                      quote.total_fare ||
                      quote.amount ||
                      quote.delivery_charge ||
                      "Calculated"}
                  </strong>
                </Text>

                {quote.service_type?.name && (
                  <Text>
                    Service: <strong>{quote.service_type.name}</strong>
                  </Text>
                )}

                {quote.estimated_hours && (
                  <Text>
                    ETA: <strong>{quote.estimated_hours} hours</strong>
                  </Text>
                )}

                {quote.pickup_branch?.name && (
                  <Text>
                    Pickup Branch: <strong>{quote.pickup_branch.name}</strong>
                  </Text>
                )}

                {quote.delivery_branch?.name && (
                  <Text>
                    Delivery Branch: <strong>{quote.delivery_branch.name}</strong>
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
              <Text type="secondary">Fill the form and click Check Fare.</Text>
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}