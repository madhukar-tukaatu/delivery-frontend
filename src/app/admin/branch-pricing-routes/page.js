"use client";

import React, { useState } from "react";
import { Button, Card, Drawer, Layout, Space, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import BranchPricingList from "./BranchPricingList";
import BranchPricingForm from "./BranchPricingForm";

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * Branch Pricing Routes Page
 * Main page for managing branch pricing with transfer routes
 */
export default function BranchPricingRoutesPage() {
  const [mode, setMode] = useState("list"); // 'list' or 'form'
  const [editingPricing, setEditingPricing] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleCreateNew() {
    setEditingPricing(null);
    setMode("form");
  }

  function handleEdit(pricing) {
    setEditingPricing(pricing);
    setMode("form");
  }

  function handleSuccess() {
    setMode("list");
    setEditingPricing(null);
    setRefreshTrigger((prev) => prev + 1);
  }

  function handleCancel() {
    setMode("list");
    setEditingPricing(null);
  }

  return (
    <Content style={{ padding: "24px" }}>
      {mode === "list" ? (
        // List View
        <div>
          <Card
            style={{ marginBottom: 24 }}
            bodyStyle={{ paddingBottom: 0 }}
          >
            <div>
              <Title level={2} style={{ margin: 0 }}>
                Branch Pricing Management
              </Title>
              <Text type="secondary">
                Configure delivery pricing with automatic transfer route setup
              </Text>
            </div>
          </Card>

          <BranchPricingList
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            refreshTrigger={refreshTrigger}
          />
        </div>
      ) : (
        // Form View (Edit/Create)
        <div>
          <Card
            style={{ marginBottom: 24 }}
            bodyStyle={{ paddingBottom: 0 }}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={handleCancel}
              >
                Back to List
              </Button>
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  {editingPricing ? "Edit Branch Pricing" : "Create New Pricing"}
                </Title>
                <Text type="secondary">
                  {editingPricing
                    ? "Update pricing and service types"
                    : "Set up pricing for a new branch route with automatic service type configuration"}
                </Text>
              </div>
            </Space>
          </Card>

          <Card>
            <BranchPricingForm
              pricingData={editingPricing}
              onSuccess={handleSuccess}
            />
          </Card>
        </div>
      )}
    </Content>
  );
}
