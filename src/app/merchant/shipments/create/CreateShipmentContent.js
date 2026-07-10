// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import dynamic from "next/dynamic";

// import {
//   Alert,
//   Button,
//   Card,
//   Col,
//   Divider,
//   Form,
//   Input,
//   InputNumber,
//   Row,
//   Select,
//   Space,
//   Typography,
//   message,
// } from "antd";
// import {
//   CalculatorOutlined,
//   CheckCircleOutlined,
// } from "@ant-design/icons";

// import {
//   getMerchantPickupLocations,
//   merchantCreateShipment,
//   merchantQuoteShipment,
// } from "@/services/deliveryOperationsApi";

// // Dynamic Map Component
// const DeliveryLocationPicker = dynamic(
//   () => import("@/components/maps/DeliveryLocationPicker"),
//   {
//     ssr: false,
//     loading: () => (
//       <div style={{ height: 380, background: "#f5f5f5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
//         Loading interactive map...
//       </div>
//     ),
//   }
// );

// const { Title } = Typography;

// function cleanString(value) {
//   return typeof value === "string" ? value.trim() : value;
// }

// function cleanNumber(value) {
//   if (value === "" || value === undefined || value === null) return null;
//   const number = Number(value);
//   return Number.isFinite(number) ? number : null;
// }

// function buildPayload(values) {
//   const paymentType = values.payment_type || "prepaid";
//   const merchantOrderId = cleanString(values.order_reference) || `MER-${Date.now()}`;

//   const customerName = cleanString(values.customer_name);
//   const customerPhone = cleanString(values.customer_phone);
//   const customerEmail = cleanString(values.customer_email) || null;

//   const deliveryAddress = cleanString(values.delivery_address);
//   const deliveryCity = cleanString(values.delivery_city);
//   const deliveryArea = cleanString(values.delivery_area) || null;
//   const deliveryLat = cleanNumber(values.delivery_latitude);
//   const deliveryLng = cleanNumber(values.delivery_longitude);

//   const packageType = cleanString(values.package_type) || "parcel";
//   const packageDescription = cleanString(values.package_description) || null;
//   const weight = cleanNumber(values.weight);
//   const lengthCm = cleanNumber(values.length_cm) || 0;
//   const widthCm = cleanNumber(values.width_cm) || 0;
//   const heightCm = cleanNumber(values.height_cm) || 0;
//   const pieces = cleanNumber(values.pieces) || 1;
//   const declaredValue = cleanNumber(values.declared_value) || 0;

//   const codAmount = paymentType === "cod" ? cleanNumber(values.cod_amount) || 0 : 0;
//   const deliveryChargePaidBy = values.delivery_charge_paid_by || "merchant";

//   return {
//     self_drop: !!values.self_drop,
//     pickup_location_id: values.self_drop ? null : values.pickup_location_id,

//     merchant_order_id: merchantOrderId,
//     order_reference: merchantOrderId,

//     customer_name: customerName,
//     customer_phone: customerPhone,
//     customer_email: customerEmail,

//     delivery_address: deliveryAddress,
//     delivery_city: deliveryCity,
//     delivery_area: deliveryArea,
//     delivery_latitude: deliveryLat,
//     delivery_longitude: deliveryLng,

//     package_type: packageType,
//     package_description: packageDescription,
//     weight,
//     length_cm: lengthCm,
//     width_cm: widthCm,
//     height_cm: heightCm,
//     pieces,
//     declared_value: declaredValue,

//     payment_type: paymentType,
//     cod_amount: codAmount,
//     delivery_charge_paid_by: deliveryChargePaidBy,

//     special_instruction: cleanString(values.special_instruction) || null,

//     customer: { name: customerName, phone: customerPhone, email: customerEmail },
//     delivery: { address: deliveryAddress, city: deliveryCity, area: deliveryArea, latitude: deliveryLat, longitude: deliveryLng },
//     package: { type: packageType, description: packageDescription, weight, length_cm: lengthCm, width_cm: widthCm, height_cm: heightCm, pieces, value: declaredValue },
//     payment: { type: paymentType, cod_amount: codAmount, delivery_charge_paid_by: deliveryChargePaidBy },
//   };
// }

// export default function CreateShipmentContent() {
//   const router = useRouter();
//   const [form] = Form.useForm();

//   const [pickupLocations, setPickupLocations] = useState([]);
//   const [quote, setQuote] = useState(null);
//   const [loadingPickups, setLoadingPickups] = useState(false);
//   const [loadingQuote, setLoadingQuote] = useState(false);
//   const [creating, setCreating] = useState(false);

//   const paymentType = Form.useWatch("payment_type", form);
//   const selfDrop = Form.useWatch("self_drop", form);
//   const selectedPickupLocationId = Form.useWatch("pickup_location_id", form);

//   const deliveryAddress = Form.useWatch("delivery_address", form);
//   const deliveryCity = Form.useWatch("delivery_city", form);
//   const deliveryArea = Form.useWatch("delivery_area", form);
//   const deliveryLatitude = Form.useWatch("delivery_latitude", form);
//   const deliveryLongitude = Form.useWatch("delivery_longitude", form);

//   useEffect(() => {
//     async function loadPickupLocations() {
//       try {
//         setLoadingPickups(true);
//         const rows = await getMerchantPickupLocations();
//         const activeRows = (rows || []).filter((row) => 
//           ["active", "approved", "pending"].includes(String(row.status || "active").toLowerCase())
//         );
//         setPickupLocations(activeRows);

//         const defaultLocation = activeRows.find((row) => row.is_default) || activeRows[0];
//         if (defaultLocation) form.setFieldsValue({ pickup_location_id: defaultLocation.id });
//       } catch (error) {
//         message.error("Could not load pickup locations.");
//       } finally {
//         setLoadingPickups(false);
//       }
//     }
//     loadPickupLocations();
//   }, [form]);

//   const selectedPickupLocation = useMemo(() => {
//     return pickupLocations.find((row) => Number(row.id) === Number(selectedPickupLocationId));
//   }, [pickupLocations, selectedPickupLocationId]);

//   const setDeliveryFromMap = (location) => {
//     const values = {
//       delivery_latitude: location?.latitude,
//       delivery_longitude: location?.longitude,
//     };
//     if (location?.address) values.delivery_address = location.address;
//     if (location?.city) values.delivery_city = location.city;
//     if (location?.area) values.delivery_area = location.area;

//     form.setFieldsValue(values);
//     setQuote(null);
//   };

//   async function calculateFare() {
//     try {
//       const values = await form.validateFields();
//       setLoadingQuote(true);
//       const data = await merchantQuoteShipment(buildPayload(values));
//       setQuote(data);
//       message.success("Fare calculated successfully.");
//     } catch (error) {
//       if (!error?.errorFields) message.error("Failed to calculate fare.");
//     } finally {
//       setLoadingQuote(false);
//     }
//   }

//   async function createShipment() {
//     if (!quote) {
//       message.warning("Please calculate fare first.");
//       return;
//     }
//     try {
//       const values = await form.validateFields();
//       setCreating(true);
//       const data = await merchantCreateShipment(buildPayload(values));
//       const shipmentId = data?.shipment?.id || data?.id;
//       message.success("Shipment created successfully!");
//       if (shipmentId) router.push(`/merchant/shipments/${shipmentId}`);
//     } catch (error) {
//       if (!error?.errorFields) message.error("Failed to create shipment.");
//     } finally {
//       setCreating(false);
//     }
//   }

//   return (
//     <Space direction="vertical" size={16} style={{ width: "100%" }}>
//       <Card>
//         <Title level={3}>Create Shipment</Title>
//       </Card>

//       <Row gutter={[16, 16]}>
//         <Col xs={24} xl={15}>
//           <Card title="Shipment Form">
//             <Form form={form} layout="vertical" onValuesChange={() => setQuote(null)}>
//               <Divider orientation="left">Delivery Location</Divider>
//               <DeliveryLocationPicker
//                 pickupLocation={selectedPickupLocation}
//                 value={{
//                   address: deliveryAddress,
//                   city: deliveryCity,
//                   area: deliveryArea,
//                   latitude: deliveryLatitude,
//                   longitude: deliveryLongitude,
//                 }}
//                 onChange={setDeliveryFromMap}
//               />

//               <Space wrap style={{ marginTop: 24 }}>
//                 <Button icon={<CalculatorOutlined />} loading={loadingQuote} onClick={calculateFare}>
//                   Check Fare & Route
//                 </Button>
//                 <Button type="primary" icon={<CheckCircleOutlined />} loading={creating} disabled={!quote} onClick={createShipment}>
//                   Create Shipment
//                 </Button>
//               </Space>
//             </Form>
//           </Card>
//         </Col>
//       </Row>
//     </Space>
//   );
// }