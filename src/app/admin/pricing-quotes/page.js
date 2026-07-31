"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { pricingQuotesApi, serviceTypesApi } from "@/lib/admin-pricing-api";
import {
  formatDateTime,
  money,
  quoteStatusColors,
} from "@/lib/pricing-formatters";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

export default function PricingQuotesPage() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [rows, setRows] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    search: "",
    status: undefined,
    service_type: undefined,
    date_from: undefined,
    date_to: undefined,
  });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (page = 1, pageSize = pagination.pageSize, nextFilters = filters) => {
    setLoading(true);
    try {
      const response = await pricingQuotesApi.list({
        page,
        per_page: pageSize,
        ...nextFilters,
      });
      const data = response.data || {};
      setRows(data.data || []);
      setPagination({
        current: data.current_page || page,
        pageSize: data.per_page || pageSize,
        total: data.total || 0,
      });
    } catch (error) {
      messageApi.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters, messageApi, pagination.pageSize]);

  useEffect(() => {
    load(1, 20, filters);
    serviceTypesApi.list({ per_page: 100 }).then((response) => {
      setServiceTypes(response.data?.data || []);
    }).catch(() => {});
  }, []);

  async function remove(record) {
    try {
      const response = await pricingQuotesApi.remove(record.id);
      messageApi.success(response.message || "Pricing quote deleted.");
      await load(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      messageApi.error(error.message);
    }
  }

  const columns = [
    {
      title: "Quote",
      dataIndex: "quote_number",
      fixed: "left",
      width: 230,
      render: (value, record) => (
        <Button type="link" onClick={() => router.push(`/admin/pricing-quotes/${record.id}`)}>
          {value}
        </Button>
      ),
    },
    {
      title: "Route",
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.pickup_branch?.name || "Unknown pickup"}</Text>
          <Text type="secondary">→ {record.delivery_branch?.name || "Unknown delivery"}</Text>
        </Space>
      ),
    },
    { title: "Store", dataIndex: "store_id", width: 90, render: (value) => value ?? "—" },
    { title: "Packets", dataIndex: "packet_count", width: 90 },
    { title: "Weight", dataIndex: "parcel_weight", width: 100, render: (value) => `${value} KG` },
    { title: "Service", dataIndex: "service_type", width: 120, render: (value) => <Tag>{value}</Tag> },
    { title: "Payment", dataIndex: "payment_type", width: 110, render: (value) => String(value || "—").toUpperCase() },
    { title: "Price", dataIndex: "final_price", width: 130, render: (value, record) => <Text strong>{money(value, record.currency)}</Text> },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (value) => <Tag color={quoteStatusColors[value] || "blue"}>{String(value || "unknown").toUpperCase()}</Tag>,
    },
    { title: "Created", dataIndex: "created_at", width: 180, render: formatDateTime },
    { title: "Expires", dataIndex: "expires_at", width: 180, render: formatDateTime },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 130,
      render: (_, record) => {
        const canDelete = ["expired", "cancelled", "rejected"].includes(record.status);
        return (
          <Space>
            <Button icon={<EyeOutlined />} onClick={() => router.push(`/admin/pricing-quotes/${record.id}`)} />
            <Popconfirm
              title="Delete this closed quote?"
              disabled={!canDelete}
              onConfirm={() => remove(record)}
            >
              <Button danger icon={<DeleteOutlined />} disabled={!canDelete} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Pricing Quotes</Title>
          <Text type="secondary">Inspect immutable pricing snapshots created by stores.</Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current, pagination.pageSize, filters)} loading={loading}>
            Refresh
          </Button>
        </Col>
      </Row>

      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={7}>
            <Input.Search
              allowClear
              placeholder="Quote number or address"
              onSearch={(search) => {
                const next = { ...filters, search };
                setFilters(next);
                load(1, pagination.pageSize, next);
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              placeholder="Status"
              style={{ width: "100%" }}
              options={["pending", "confirmed", "expired", "cancelled", "rejected"].map((value) => ({ value, label: value.toUpperCase() }))}
              onChange={(status) => {
                const next = { ...filters, status };
                setFilters(next);
                load(1, pagination.pageSize, next);
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              placeholder="Service type"
              style={{ width: "100%" }}
              options={serviceTypes.map((item) => ({ value: item.code, label: item.name }))}
              onChange={(service_type) => {
                const next = { ...filters, service_type };
                setFilters(next);
                load(1, pagination.pageSize, next);
              }}
            />
          </Col>
          <Col xs={24} lg={9}>
            <RangePicker
              style={{ width: "100%" }}
              onChange={(dates) => {
                const next = {
                  ...filters,
                  date_from: dates?.[0]?.format("YYYY-MM-DD"),
                  date_to: dates?.[1]?.format("YYYY-MM-DD"),
                };
                setFilters(next);
                load(1, pagination.pageSize, next);
              }}
            />
          </Col>
        </Row>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1800 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `${total} quotes`,
            onChange: (page, pageSize) => load(page, pageSize, filters),
          }}
        />
      </Card>
    </div>
  );
}
