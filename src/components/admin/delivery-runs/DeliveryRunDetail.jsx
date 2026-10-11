"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  OrderedListOutlined,
  PlusOutlined,
  PrinterOutlined,
  SendOutlined,
  StopOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import {
  addRunItems,
  assignRunRider,
  cancelRun,
  closeRun,
  dispatchRun,
  getDeliveryRun,
  getReadyForDelivery,
  getRunRiders,
  removeRunItems,
  runErrorText,
  sequenceRun,
} from "@/services/admin/deliveryRunService";
import {
  ITEM_STATUS_META,
  OUTCOME_META,
  RUN_STATUS_META,
  VEHICLE_OPTIONS,
  areaOf,
  fmtDate,
  rs,
  vehicleText,
} from "@/components/admin/delivery-runs/runMeta";

const { Text } = Typography;

export function RunStatusTag({ status }) {
  const meta = RUN_STATUS_META[status] || { label: status, color: "default" };
  return (
    <Tag color={meta.color} style={{ margin: 0 }}>
      {meta.label}
    </Tag>
  );
}

export function ItemStatusTags({ item }) {
  const meta = ITEM_STATUS_META[item.status] || { label: item.status, color: "default" };
  const outcome = OUTCOME_META[item.outcome];
  return (
    <Space size={2} wrap>
      <Tag color={meta.color} style={{ margin: 0 }}>
        {meta.label}
      </Tag>
      {item.status === "out_for_delivery" && item.arrived ? (
        <Tag color="blue" style={{ margin: 0 }}>
          Arrived
        </Tag>
      ) : null}
      {outcome ? (
        <Tag color={outcome.color} style={{ margin: 0 }}>
          {outcome.label}
        </Tag>
      ) : null}
      {item.attempt > 1 ? <Tag style={{ margin: 0 }}>Attempt {item.attempt}</Tag> : null}
    </Space>
  );
}

function RiderSelect({ riders, value, onChange, loading }) {
  return (
    <Select
      showSearch
      allowClear
      loading={loading}
      placeholder="Choose rider"
      value={value ?? undefined}
      onChange={onChange}
      optionFilterProp="label"
      style={{ width: "100%" }}
      options={riders.map((r) => ({
        value: r.id,
        label: `${r.name}${r.phone ? ` · ${r.phone}` : ""}${r.is_rider ? "" : ` (${String(r.role || "staff").replace(/_/g, " ")})`}`,
        title: `${r.active_deliveries} active deliveries, ${r.active_runs} active runs`,
      }))}
      optionRender={(opt) => {
        const r = riders.find((x) => x.id === opt.value);
        return (
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <span>{opt.label}</span>
            {r ? (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {r.active_deliveries} active · {r.active_runs} run{r.active_runs === 1 ? "" : "s"}
              </Text>
            ) : null}
          </Space>
        );
      }}
    />
  );
}

/**
 * Selected DR on the right side of the board: parcels in stop order with
 * outcome chips, and the actions that fit the run's status.
 */
export default function DeliveryRunDetail({ runId, branchId = null, canManage = false, onChanged }) {
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [riders, setRiders] = useState([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [riderModal, setRiderModal] = useState(false);
  const [riderForm, setRiderForm] = useState({ rider_user_id: null, vehicle_type: null, vehicle_number: "" });
  const [addModal, setAddModal] = useState(false);
  const [readyRows, setReadyRows] = useState([]);
  const [readyLoading, setReadyLoading] = useState(false);
  const [addKeys, setAddKeys] = useState([]);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [closeModal, setCloseModal] = useState(false);
  const [closeForm, setCloseForm] = useState({ cash_received: 0, deposit_cash: true, notes: "", items: {} });

  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const data = await getDeliveryRun(runId, branchId);
      setRun(data);
    } catch (e) {
      message.error(runErrorText(e, "Could not load the run."));
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [runId, branchId]);

  useEffect(() => {
    setSelectedKeys([]);
    load();
  }, [load]);

  const items = useMemo(() => (run?.items || []).filter((i) => i.status !== "removed"), [run]);
  const removed = useMemo(() => (run?.items || []).filter((i) => i.status === "removed"), [run]);
  const editable = !!run?.editable && canManage;
  const closable = canManage && ["out_for_delivery", "completed"].includes(run?.status);
  const openItems = useMemo(
    () => items.filter((i) => i.status === "out_for_delivery" || (i.status === "failed" && !i.outcome)),
    [items]
  );

  const afterChange = useCallback(
    (data, msg) => {
      const fresh = data?.run || data;
      if (fresh?.id) setRun(fresh);
      if (msg) message.success(msg);
      onChanged?.(fresh);
    },
    [onChanged]
  );

  const act = useCallback(
    async (key, fn) => {
      setBusy(key);
      try {
        const res = await fn();
        afterChange(res?.data, res?.message);
        const skipped = res?.data?.skipped;
        if (skipped && Object.keys(skipped).length) {
          message.warning(Object.values(skipped).slice(0, 3).join(" "));
        }
        return true;
      } catch (e) {
        message.error(runErrorText(e));
        return false;
      } finally {
        setBusy("");
      }
    },
    [afterChange]
  );

  const loadRiders = useCallback(async () => {
    if (!run?.id) return;
    setRidersLoading(true);
    try {
      setRiders(await getRunRiders({ run_id: run.id }, branchId));
    } catch (e) {
      message.error(runErrorText(e, "Could not load riders."));
    } finally {
      setRidersLoading(false);
    }
  }, [run?.id, branchId]);

  const openRiderModal = () => {
    setRiderForm({
      rider_user_id: run?.rider?.id ?? null,
      vehicle_type: run?.vehicle_type ?? null,
      vehicle_number: run?.vehicle_number ?? "",
    });
    setRiderModal(true);
    loadRiders();
  };

  const openAddModal = async () => {
    setAddKeys([]);
    setAddModal(true);
    setReadyLoading(true);
    try {
      setReadyRows(await getReadyForDelivery({}, run?.branch?.id || branchId));
    } catch (e) {
      message.error(runErrorText(e, "Could not load ready parcels."));
    } finally {
      setReadyLoading(false);
    }
  };

  const openCloseModal = () => {
    const choices = {};
    openItems.forEach((i) => {
      choices[i.item_id] = { action: "reattempt", reason: "" };
    });
    setCloseForm({ cash_received: Number(run?.cod_collected || 0), deposit_cash: true, notes: "", items: choices });
    setCloseModal(true);
  };

  const move = async (index, delta) => {
    const ids = items.map((i) => i.item_id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await act("seq", () => sequenceRun(run.id, ids, branchId));
  };

  const cashExpected = Number(run?.cod_collected || 0);
  const variance = Math.round((Number(closeForm.cash_received || 0) - cashExpected) * 100) / 100;

  if (!runId) {
    return (
      <Card style={{ borderRadius: 12, minHeight: 420 }}>
        <Empty description="Select a DR on the left, or tick ready parcels and create a new run." style={{ marginTop: 80 }} />
      </Card>
    );
  }

  const columns = [
    {
      title: "#",
      dataIndex: "sequence",
      width: 70,
      render: (seq, row, index) => (
        <Space size={2}>
          <Text strong>{seq}</Text>
          {canManage && !["closed", "cancelled"].includes(run?.status) && items.length > 1 ? (
            <Space size={0} direction="vertical">
              <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={index === 0 || !!busy} onClick={() => move(index, -1)} />
              <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={index === items.length - 1 || !!busy} onClick={() => move(index, 1)} />
            </Space>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Parcel",
      key: "parcel",
      render: (_, r) => (
        <div style={{ minWidth: 150 }}>
          <Text strong style={{ fontFamily: "monospace" }}>
            {r.tracking_number || `#${r.shipment_id}`}
          </Text>
          <div style={{ fontSize: 12 }}>
            {r.receiver_name || "-"}
            {r.receiver_phone ? (
              <>
                {" · "}
                <a href={`tel:${r.receiver_phone}`}>{r.receiver_phone}</a>
              </>
            ) : null}
          </div>
          {r.merchant?.name ? (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.merchant.name}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: "Address",
      key: "address",
      render: (_, r) => (
        <div style={{ maxWidth: 240, fontSize: 12 }}>
          <Tag style={{ margin: "0 0 2px" }}>{areaOf(r)}</Tag>
          <div>{r.delivery_address || "-"}</div>
        </div>
      ),
    },
    {
      title: "COD",
      key: "cod",
      width: 120,
      render: (_, r) =>
        Number(r.cod_amount) > 0 ? (
          <div>
            <Text strong>{rs(r.cod_amount)}</Text>
            {r.status === "delivered" ? (
              <div style={{ fontSize: 11 }}>
                <Text type={r.payment_method === "online" ? "secondary" : "success"}>
                  {r.payment_method === "online" ? "Online (to merchant)" : `Cash ${rs(r.collected_amount)}`}
                </Text>
              </div>
            ) : null}
          </div>
        ) : (
          <Text type="secondary">Prepaid</Text>
        ),
    },
    {
      title: "Status",
      key: "status",
      width: 170,
      render: (_, r) => (
        <div>
          <ItemStatusTags item={r} />
          {r.reason && r.status === "failed" ? (
            <div style={{ fontSize: 11, color: "#cf1322", marginTop: 2 }}>{r.reason}</div>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      {!run ? (
        <Card style={{ borderRadius: 12 }}>
          <Empty description="Run not found" />
        </Card>
      ) : (
        <Card
          style={{ borderRadius: 12 }}
          title={
            <Space wrap size={8}>
              <Text strong style={{ fontSize: 18 }}>
                {run.run_number}
              </Text>
              <RunStatusTag status={run.status} />
              {run.branch?.name ? <Text type="secondary">{run.branch.name}</Text> : null}
            </Space>
          }
          extra={
            <Space wrap>
              <Button
                icon={<PrinterOutlined />}
                href={`/admin/deliveries/runs/${run.id}/print?type=sheet${branchId ? `&branch_id=${branchId}` : ""}`}
                target="_blank"
              >
                Run sheet
              </Button>
              <Button
                icon={<PrinterOutlined />}
                href={`/admin/deliveries/runs/${run.id}/print?type=label${branchId ? `&branch_id=${branchId}` : ""}`}
                target="_blank"
              >
                Label
              </Button>
            </Space>
          }
        >
          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            <Col xs={12} md={6}>
              <Statistic title="Parcels" value={run.expected_count} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Delivered" value={run.delivered_count} valueStyle={{ color: "#389e0d" }} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Failed" value={run.failed_count} valueStyle={{ color: run.failed_count ? "#cf1322" : undefined }} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Pending" value={run.pending_count} />
            </Col>
            <Col xs={12} md={8}>
              <Statistic title="COD expected" value={rs(run.cod_expected)} valueStyle={{ fontSize: 18 }} />
            </Col>
            <Col xs={12} md={8}>
              <Statistic title="Cash collected" value={rs(run.cod_collected)} valueStyle={{ fontSize: 18, color: "#389e0d" }} />
            </Col>
            <Col xs={12} md={8}>
              <Statistic title="Online (paid to merchant)" value={rs(run.online_collected)} valueStyle={{ fontSize: 18 }} />
            </Col>
          </Row>

          <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Rider">
              {run.rider ? (
                <span>
                  {run.rider.name}
                  {run.rider.phone ? (
                    <>
                      {" · "}
                      <a href={`tel:${run.rider.phone}`}>{run.rider.phone}</a>
                    </>
                  ) : null}
                </span>
              ) : (
                <Text type="warning">Not assigned</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Vehicle">
              {vehicleText(run.vehicle_type, run.vehicle_number) || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {fmtDate(run.created_at)}
              {run.created_by?.name ? ` · ${run.created_by.name}` : ""}
            </Descriptions.Item>
            <Descriptions.Item label="Dispatched">{fmtDate(run.dispatched_at)}</Descriptions.Item>
            {run.closed_at ? (
              <>
                <Descriptions.Item label="Closed">
                  {fmtDate(run.closed_at)}
                  {run.closed_by?.name ? ` · ${run.closed_by.name}` : ""}
                </Descriptions.Item>
                <Descriptions.Item label="Cash handover">
                  {rs(run.cash_received)}{" "}
                  {Number(run.cash_variance) ? (
                    <Tag color={Number(run.cash_variance) < 0 ? "red" : "orange"}>
                      {Number(run.cash_variance) < 0 ? "Short" : "Over"} {rs(Math.abs(Number(run.cash_variance)))}
                    </Tag>
                  ) : (
                    <Tag color="green">Matches</Tag>
                  )}
                  {run.cash_deposited ? <Tag color="blue">Deposited to branch POD</Tag> : null}
                </Descriptions.Item>
                <Descriptions.Item label="Result" span={2}>
                  {run.delivered_count} delivered · {run.reattempt_count} queued for re-delivery · {run.returned_count} return to merchant
                  {run.close_notes ? <div style={{ marginTop: 4 }}>Note: {run.close_notes}</div> : null}
                </Descriptions.Item>
              </>
            ) : null}
            {run.cancelled_at ? (
              <Descriptions.Item label="Cancelled" span={2}>
                {fmtDate(run.cancelled_at)}
                {run.cancel_reason ? ` · ${run.cancel_reason}` : ""}
              </Descriptions.Item>
            ) : null}
            {run.notes ? (
              <Descriptions.Item label="Notes" span={2}>
                {run.notes}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          {run.status === "completed" ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="All parcels are done on the road. Close the run when the rider hands over cash and returned parcels."
            />
          ) : null}

          {canManage ? (
            <Space wrap style={{ marginBottom: 12 }}>
              {editable ? (
                <>
                  <Button icon={<UserSwitchOutlined />} onClick={openRiderModal}>
                    {run.rider ? "Change rider" : "Assign rider"}
                  </Button>
                  <Button icon={<PlusOutlined />} onClick={openAddModal}>
                    Add parcels
                  </Button>
                  <Popconfirm
                    title={`Remove ${selectedKeys.length} parcel(s) from ${run.run_number}?`}
                    description="They go back to Ready for delivery."
                    disabled={!selectedKeys.length}
                    onConfirm={async () => {
                      const ids = items.filter((i) => selectedKeys.includes(i.item_id)).map((i) => i.shipment_id);
                      const ok = await act("remove", () => removeRunItems(run.id, ids, null, branchId));
                      if (ok) setSelectedKeys([]);
                    }}
                  >
                    <Button danger icon={<DeleteOutlined />} disabled={!selectedKeys.length} loading={busy === "remove"}>
                      Remove{selectedKeys.length ? ` (${selectedKeys.length})` : ""}
                    </Button>
                  </Popconfirm>
                  <Button icon={<OrderedListOutlined />} loading={busy === "seq"} onClick={() => act("seq", () => sequenceRun(run.id, null, branchId))}>
                    Auto order by area
                  </Button>
                  <Popconfirm
                    title={`Hand ${run.run_number} to ${run.rider?.name || "the rider"}?`}
                    description={`${items.length} parcel(s) go out for delivery. COD to collect: ${rs(run.cod_expected)}.`}
                    disabled={!run.rider || !items.length}
                    onConfirm={() => act("dispatch", () => dispatchRun(run.id, {}, branchId))}
                  >
                    <Tooltip title={!run.rider ? "Assign a rider first" : !items.length ? "Add parcels first" : ""}>
                      <Button type="primary" icon={<SendOutlined />} disabled={!run.rider || !items.length} loading={busy === "dispatch"}>
                        Dispatch run
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                  <Button danger icon={<StopOutlined />} onClick={() => { setCancelReason(""); setCancelModal(true); }}>
                    Cancel run
                  </Button>
                </>
              ) : null}
              {closable ? (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={openCloseModal}>
                  Close &amp; reconcile
                </Button>
              ) : null}
            </Space>
          ) : null}

          <Table
            size="small"
            rowKey="item_id"
            columns={columns}
            dataSource={items}
            pagination={false}
            scroll={{ x: 760 }}
            rowSelection={
              editable
                ? { selectedRowKeys: selectedKeys, onChange: setSelectedKeys }
                : undefined
            }
            locale={{ emptyText: "No parcels on this run" }}
          />

          {removed.length ? (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Removed: {removed.map((r) => r.tracking_number).join(", ")}
              </Text>
            </div>
          ) : null}
        </Card>
      )}

      <Modal
        title={run?.rider ? `Change rider for ${run?.run_number}` : `Assign rider to ${run?.run_number}`}
        open={riderModal}
        onCancel={() => setRiderModal(false)}
        okText="Save"
        confirmLoading={busy === "rider"}
        okButtonProps={{ disabled: !riderForm.rider_user_id }}
        onOk={async () => {
          const ok = await act("rider", () =>
            assignRunRider(
              run.id,
              {
                rider_user_id: riderForm.rider_user_id,
                vehicle_type: riderForm.vehicle_type || null,
                vehicle_number: riderForm.vehicle_number || null,
              },
              branchId
            )
          );
          if (ok) setRiderModal(false);
        }}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text type="secondary">Only active riders and staff of {run?.branch?.name || "this branch"} are listed. The rider is notified.</Text>
          <RiderSelect
            riders={riders}
            loading={ridersLoading}
            value={riderForm.rider_user_id}
            onChange={(v) => setRiderForm((f) => ({ ...f, rider_user_id: v ?? null }))}
          />
          <Space.Compact style={{ width: "100%" }}>
            <Select
              allowClear
              placeholder="Vehicle"
              style={{ width: "40%" }}
              value={riderForm.vehicle_type ?? undefined}
              options={VEHICLE_OPTIONS}
              onChange={(v) => setRiderForm((f) => ({ ...f, vehicle_type: v ?? null }))}
            />
            <Input
              placeholder="Vehicle number (optional)"
              value={riderForm.vehicle_number}
              onChange={(e) => setRiderForm((f) => ({ ...f, vehicle_number: e.target.value }))}
            />
          </Space.Compact>
        </Space>
      </Modal>

      <Modal
        title={`Add parcels to ${run?.run_number || "run"}`}
        open={addModal}
        width={760}
        onCancel={() => setAddModal(false)}
        okText={`Add ${addKeys.length || ""}`}
        okButtonProps={{ disabled: !addKeys.length }}
        confirmLoading={busy === "add"}
        onOk={async () => {
          const ok = await act("add", () => addRunItems(run.id, addKeys, branchId));
          if (ok) setAddModal(false);
        }}
        destroyOnHidden
      >
        <Table
          size="small"
          rowKey="shipment_id"
          loading={readyLoading}
          dataSource={readyRows}
          pagination={{ pageSize: 10, size: "small" }}
          rowSelection={{ selectedRowKeys: addKeys, onChange: setAddKeys }}
          columns={[
            { title: "Tracking", dataIndex: "tracking_number", render: (v) => <Text style={{ fontFamily: "monospace" }}>{v}</Text> },
            { title: "Area", key: "area", render: (_, r) => areaOf(r) },
            { title: "Receiver", dataIndex: "receiver_name" },
            { title: "COD", dataIndex: "cod_amount", render: (v) => (Number(v) > 0 ? rs(v) : "Prepaid") },
          ]}
          locale={{ emptyText: "No parcels are ready for delivery." }}
        />
      </Modal>

      <Modal
        title={`Cancel ${run?.run_number || "run"}?`}
        open={cancelModal}
        onCancel={() => setCancelModal(false)}
        okText="Cancel run"
        okButtonProps={{ danger: true }}
        confirmLoading={busy === "cancel"}
        onOk={async () => {
          const ok = await act("cancel", () => cancelRun(run.id, cancelReason || null, branchId));
          if (ok) setCancelModal(false);
        }}
      >
        <Text type="secondary">All parcels go back to Ready for delivery.</Text>
        <Input.TextArea
          rows={2}
          style={{ marginTop: 8 }}
          placeholder="Reason (optional)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </Modal>

      <Modal
        title={`Close & reconcile ${run?.run_number || ""}`}
        open={closeModal}
        width={760}
        onCancel={() => setCloseModal(false)}
        okText="Close run"
        confirmLoading={busy === "close"}
        okButtonProps={{ disabled: Math.abs(variance) >= 0.01 && !closeForm.notes.trim() }}
        onOk={async () => {
          const ok = await act("close", () =>
            closeRun(
              run.id,
              {
                cash_received: Number(closeForm.cash_received || 0),
                deposit_cash: closeForm.deposit_cash,
                notes: closeForm.notes.trim() || null,
                items: Object.entries(closeForm.items).map(([id, c]) => ({
                  item_id: Number(id),
                  action: c.action,
                  reason: c.reason?.trim() || null,
                })),
              },
              branchId
            )
          );
          if (ok) setCloseModal(false);
        }}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Card size="small" title="Cash from rider">
            <Row gutter={12} align="middle">
              <Col xs={24} md={8}>
                <Statistic title="Cash POD collected" value={rs(cashExpected)} valueStyle={{ fontSize: 18 }} />
              </Col>
              <Col xs={24} md={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Cash handed over
                </Text>
                <InputNumber
                  min={0}
                  step={10}
                  style={{ width: "100%" }}
                  prefix="Rs"
                  value={closeForm.cash_received}
                  onChange={(v) => setCloseForm((f) => ({ ...f, cash_received: v ?? 0 }))}
                />
              </Col>
              <Col xs={24} md={8}>
                {Math.abs(variance) >= 0.01 ? (
                  <Tag color={variance < 0 ? "red" : "orange"} style={{ fontSize: 13, padding: "4px 8px" }}>
                    {variance < 0 ? "Short" : "Over"} {rs(Math.abs(variance))}
                  </Tag>
                ) : (
                  <Tag color="green" style={{ fontSize: 13, padding: "4px 8px" }}>
                    Matches
                  </Tag>
                )}
              </Col>
            </Row>
            <Space style={{ marginTop: 8 }}>
              <Switch
                size="small"
                checked={closeForm.deposit_cash}
                onChange={(v) => setCloseForm((f) => ({ ...f, deposit_cash: v }))}
              />
              <Text>Deposit collected cash POD to branch (creates the POD deposit, merchant settlement becomes ready)</Text>
            </Space>
            {Number(run?.online_collected) > 0 ? (
              <div style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Online POD {rs(run.online_collected)} was paid directly to the merchant and is not part of the cash.
                </Text>
              </div>
            ) : null}
          </Card>

          {openItems.length ? (
            <Card size="small" title={`Not delivered (${openItems.length})`}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Parcels still on the road are marked failed and come back to the branch. Choose what happens next.
              </Text>
              {openItems.map((i) => {
                const choice = closeForm.items[i.item_id] || { action: "reattempt", reason: "" };
                return (
                  <Row key={i.item_id} gutter={8} align="middle" style={{ marginTop: 8 }}>
                    <Col xs={24} md={8}>
                      <Text strong style={{ fontFamily: "monospace" }}>
                        {i.tracking_number}
                      </Text>
                      <div style={{ fontSize: 11 }}>
                        <ItemStatusTags item={i} />
                      </div>
                    </Col>
                    <Col xs={12} md={6}>
                      <Select
                        style={{ width: "100%" }}
                        value={choice.action}
                        onChange={(v) =>
                          setCloseForm((f) => ({ ...f, items: { ...f.items, [i.item_id]: { ...choice, action: v } } }))
                        }
                        options={[
                          { value: "reattempt", label: "Re-deliver" },
                          { value: "return", label: "Return to merchant" },
                        ]}
                      />
                    </Col>
                    <Col xs={12} md={10}>
                      <Input
                        placeholder={i.reason || "Reason (optional)"}
                        value={choice.reason}
                        onChange={(e) =>
                          setCloseForm((f) => ({
                            ...f,
                            items: { ...f.items, [i.item_id]: { ...choice, reason: e.target.value } },
                          }))
                        }
                      />
                    </Col>
                  </Row>
                );
              })}
            </Card>
          ) : (
            <Alert type="success" showIcon message="Every parcel on this run was delivered." />
          )}

          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Note {Math.abs(variance) >= 0.01 ? "(required: explain the cash difference)" : "(optional)"}
            </Text>
            <Input.TextArea
              rows={2}
              value={closeForm.notes}
              status={Math.abs(variance) >= 0.01 && !closeForm.notes.trim() ? "error" : undefined}
              onChange={(e) => setCloseForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </Space>
      </Modal>
    </Spin>
  );
}
