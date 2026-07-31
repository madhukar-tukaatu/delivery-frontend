'use client';

import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, InputNumber, Radio, Row, Space, Tag, Typography, message } from 'antd';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getRoutingQuote } from '@/services/routingService';

const { Text } = Typography;

function PinSelector({ activePin, onPick }) {
  useMapEvents({
    click(event) {
      onPick(activePin, event.latlng);
    },
  });
  return null;
}

function markerIcon(label) {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `<div class="custom-map-pin-inner">${label}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

export default function RoutingMapPicker({ value = {}, onChange }) {
  const [activePin, setActivePin] = useState('pickup');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  const pickup = value.pickup || null;
  const delivery = value.delivery || null;
  const weight = value.weight || 1;
  const codAmount = value.pod_amount || 0;

  const pickupIcon = useMemo(() => markerIcon('P'), []);
  const deliveryIcon = useMemo(() => markerIcon('D'), []);

  function update(next) {
    onChange?.({ ...value, ...next });
  }

  function handlePick(type, latlng) {
    update({ [type]: { lat: Number(latlng.lat.toFixed(7)), lng: Number(latlng.lng.toFixed(7)) } });
    setQuote(null);
  }

  async function calculate() {
    if (!pickup || !delivery) {
      message.error('Please select pickup and delivery pins first.');
      return;
    }
    setLoading(true);
    try {
      const data = await getRoutingQuote({
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        delivery_lat: delivery.lat,
        delivery_lng: delivery.lng,
        weight,
        pod_amount: codAmount,
      });
      setQuote(data);
      update({ quote: data });
      message.success('Route and delivery charge calculated.');
    } catch (error) {
      message.error(error?.response?.data?.message || 'Unable to calculate route.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Map Routing" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          type="info"
          showIcon
          message="Select pickup and delivery pins on the map. The system will auto-assign nearest origin/destination branches and calculate route charge."
        />

        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Radio.Group value={activePin} onChange={(e) => setActivePin(e.target.value)} optionType="button" buttonStyle="solid">
              <Radio.Button value="pickup">Pickup Pin</Radio.Button>
              <Radio.Button value="delivery">Delivery Pin</Radio.Button>
            </Radio.Group>
          </Col>
          <Col xs={12} md={4}>
            <Text>Weight KG</Text>
            <InputNumber min={0.1} step={0.1} value={weight} style={{ width: '100%' }} onChange={(v) => update({ weight: v || 1 })} />
          </Col>
          <Col xs={12} md={4}>
            <Text>POD Amount</Text>
            <InputNumber min={0} value={codAmount} style={{ width: '100%' }} onChange={(v) => update({ pod_amount: v || 0 })} />
          </Col>
          <Col xs={24} md={8} style={{ display: 'flex', alignItems: 'end' }}>
            <Button type="primary" onClick={calculate} loading={loading} block>Calculate Route & Charge</Button>
          </Col>
        </Row>

        <div style={{ height: 420, borderRadius: 10, overflow: 'hidden', border: '1px solid #eee' }}>
          <MapContainer center={[27.7172, 85.324]} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <PinSelector activePin={activePin} onPick={handlePick} />
            {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
            {delivery && <Marker position={[delivery.lat, delivery.lng]} icon={deliveryIcon} />}
          </MapContainer>
        </div>

        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Tag color={pickup ? 'green' : 'default'}>Pickup: {pickup ? `${pickup.lat}, ${pickup.lng}` : 'not selected'}</Tag>
          </Col>
          <Col xs={24} md={12}>
            <Tag color={delivery ? 'blue' : 'default'}>Delivery: {delivery ? `${delivery.lat}, ${delivery.lng}` : 'not selected'}</Tag>
          </Col>
        </Row>

        {quote && (
          <Descriptions bordered size="small" column={1} title="Calculated Route">
            <Descriptions.Item label="Origin">
              {quote.origin?.branch?.name} {quote.origin?.sub_branch ? ` / ${quote.origin.sub_branch.name}` : ''}
            </Descriptions.Item>
            <Descriptions.Item label="Destination">
              {quote.destination?.branch?.name} {quote.destination?.sub_branch ? ` / ${quote.destination.sub_branch.name}` : ''}
            </Descriptions.Item>
            <Descriptions.Item label="Distance">{quote.tariff?.route_distance_km} km</Descriptions.Item>
            <Descriptions.Item label="Route Fee">NPR {quote.tariff?.route_fee}</Descriptions.Item>
            <Descriptions.Item label="Delivery Charge">NPR {quote.tariff?.delivery_charge}</Descriptions.Item>
            <Descriptions.Item label="POD Charge">NPR {quote.tariff?.pod_charge}</Descriptions.Item>
            <Descriptions.Item label="Estimated Time">{quote.tariff?.estimated_delivery_time}</Descriptions.Item>
          </Descriptions>
        )}
      </Space>
    </Card>
  );
}
