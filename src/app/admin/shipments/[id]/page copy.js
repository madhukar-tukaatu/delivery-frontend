"use client";

import { useEffect, useState } from "react";
import { Card, Spin, message } from "antd";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import ShipmentDetailView from "@/features/shipments/components/ShipmentDetailView";

export default function ShipmentDetailPage() {
  const params = useParams();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadShipment = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/admin/shipments/${params.id}`);
      setShipment(response.data.data || response.data);
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not load shipment.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (values) => {
    await api.post(`/admin/shipments/${params.id}/status`, values);
    await loadShipment();
  };

  useEffect(() => {
    if (params.id) {
      loadShipment();
    }
  }, [params.id]);

  if (loading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  return (
    <ShipmentDetailView shipment={shipment} onUpdateStatus={updateStatus} />
  );
}
