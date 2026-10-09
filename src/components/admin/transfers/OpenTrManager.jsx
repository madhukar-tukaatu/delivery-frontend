"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Empty, Input, Modal, Space, Switch, Table, Tag, Tooltip, Typography, message } from "antd";
import { DeleteOutlined, PlusOutlined, PrinterOutlined, SendOutlined, ThunderboltOutlined } from "@ant-design/icons";
import {
  addContainerItems,
  getContainer,
  getContainerCandidates,
  openTrPrint,
  removeContainerItems,
  setContainerAutoAppend,
} from "@/services/admin/transferService";

const { Text } = Typography;

function kg(v) {
  const n = Number(v || 0);
  return n ? `${n.toFixed(2)} kg` : "-";
}

function errText(e, fallback) {
  const errors = e?.response?.data?.errors;
  const first = errors ? Object.values(errors).flat()?.[0] : null;
  return first || e?.response?.data?.message || fallback;
}

/**
 * Edit an open TR (loaded, not dispatched yet): add ready parcels for the same
 * next hop, remove parcels, switch auto-add on, then dispatch. The trip cost is
 * entered at dispatch and split over the final parcel list.
 *
 * props: open, containerId, branchId (admin override), onClose, onChanged(container), onDispatch(container)
 */
export default function OpenTrManager({ open, containerId, branchId = null, onClose, onChanged, onDispatch }) {
  const [tr, setTr] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [loadedSel, setLoadedSel] = useState([]);
  const [candSel, setCandSel] = useState([]);
  const [reason, setReason] = useState("");
  const params = useMemo(() => (branchId ? { branch_id: branchId } : {}), [branchId]);

  const load = useCallback(async () => {
    if (!containerId) return;
    setLoading(true);
    try {
      const [c, cand] = await Promise.all([getContainer(containerId, params), getContainerCandidates(containerId, params)]);
      setTr(c);
      setCandidates(cand);
    } catch (e) {
      message.error(errText(e, "Failed to load TR"));
    } finally {
      setLoading(false);
    }
  }, [containerId, params]);

  useEffect(() => {
    if (!open) return;
    setLoadedSel([]);
    setCandSel([]);
    setReason("");
    load();
  }, [open, load]);

  const loaded = useMemo(() => (tr?.items || []).filter((i) => i.status === "added"), [tr]);
  const editable = !!tr?.can_edit;

  const add = async (ids) => {
    if (!ids.length) return;
    setBusy("add");
    try {
      const res = await addContainerItems(containerId, ids, params);
      message.success(res?.message || "Added");
      const skipped = Object.values(res?.skipped || {});
      if (skipped.length) message.warning(skipped.slice(0, 3).join(" "));
      setCandSel([]);
      await load();
      onChanged?.(res?.container);
    } catch (e) {
      message.error(errText(e, "Failed to add parcels"));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (ids) => {
    if (!ids.length) return;
    setBusy("remove");
    try {
      const res = await removeContainerItems(containerId, ids, reason, params);
      message.success(res?.message || "Removed");
      setLoadedSel([]);
      await load();
      onChanged?.(res?.container);
    } catch (e) {
      message.error(errText(e, "Failed to remove parcels"));
    } finally {
      setBusy(null);
    }
  };

  const toggleAuto = async (on) => {
    setBusy("auto");
    try {
      const res = await setContainerAutoAppend(containerId, on, params);
      message.success(res?.message || "Saved");
      setTr((p) => ({ ...p, auto_append: on }));
      onChanged?.(res);
    } catch (e) {
      message.error(errText(e, "Failed to update TR"));
    } finally {
      setBusy(null);
    }
  };

  const hereTag = (i) =>
    i.is_final_here ? <Tag color="green" style={{ margin: 0 }}>Last mile</Tag> : <Tag color="purple" style={{ margin: 0 }}>→ {i.destination_name || "onward"}</Tag>;

  const totalWeight = loaded.reduce((s, i) => s + Number(i.weight || 0), 0);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={920}
      destroyOnClose
      title={
        <Space size={8} wrap>
          <span>Edit {tr?.display_number || "TR"}</span>
          {tr ? (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {tr.from_branch?.name} → {tr.to_branch?.name}
            </Text>
          ) : null}
          {tr && tr.status !== "open" ? <Tag color="red">{tr.status}</Tag> : <Tag>Open (not dispatched)</Tag>}
        </Space>
      }
      footer={
        <Space wrap>
          <Button icon={<PrinterOutlined />} disabled={!tr} onClick={() => openTrPrint(containerId, "manifest", branchId)}>
            Manifest
          </Button>
          <Button onClick={onClose}>Close</Button>
          {editable ? (
            <Button type="primary" icon={<SendOutlined />} disabled={!loaded.length} onClick={() => onDispatch?.(tr)}>
              Dispatch {tr?.display_number} ({loaded.length})
            </Button>
          ) : null}
        </Space>
      }
    >
      {!tr && !loading ? (
        <Empty description="TR not found" />
      ) : (
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          {!editable && tr ? (
            <Alert type="info" showIcon message={`${tr.display_number} is ${tr.status}. Parcels can only be added or removed before dispatch.`} />
          ) : null}
          {editable ? (
            <Space size={8} wrap>
              <Tooltip title="Parcels sorted for transfer to this next hop later join this TR automatically until it is dispatched.">
                <Space size={4}>
                  <ThunderboltOutlined />
                  <Switch size="small" checked={!!tr?.auto_append} loading={busy === "auto"} onChange={toggleAuto} />
                  <Text>Auto-add new parcels for {tr?.to_branch?.name}</Text>
                </Space>
              </Tooltip>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Trip cost is entered at dispatch and split over the final list.
              </Text>
            </Space>
          ) : null}

          <div>
            <Space style={{ marginBottom: 6 }} wrap>
              <Text strong>On this TR ({loaded.length})</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{kg(totalWeight)}</Text>
              {editable ? (
                <>
                  <Input
                    size="small"
                    placeholder="Reason for removing (optional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={200}
                    style={{ width: 220 }}
                  />
                  <Button size="small" danger icon={<DeleteOutlined />} disabled={!loadedSel.length} loading={busy === "remove"} onClick={() => remove(loadedSel)}>
                    Remove ({loadedSel.length})
                  </Button>
                </>
              ) : null}
            </Space>
            <Table
              size="small"
              rowKey="shipment_id"
              loading={loading}
              dataSource={loaded}
              pagination={loaded.length > 10 ? { pageSize: 10, size: "small" } : false}
              rowSelection={editable ? { selectedRowKeys: loadedSel, onChange: setLoadedSel } : undefined}
              columns={[
                { title: "Parcel", dataIndex: "tracking_number", render: (v, i) => <Text strong style={{ fontSize: 12 }}>{v || `#${i.shipment_id}`}</Text> },
                { title: "Receiver", dataIndex: "receiver_name", render: (v) => v || "-" },
                { title: "At next hop", key: "here", render: (_, i) => hereTag(i) },
                { title: "Weight", dataIndex: "weight", align: "right", render: kg },
                editable
                  ? {
                      title: "",
                      key: "rm",
                      width: 50,
                      render: (_, i) => (
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} loading={busy === "remove"} onClick={() => remove([i.shipment_id])} />
                      ),
                    }
                  : null,
              ].filter(Boolean)}
            />
          </div>

          {editable ? (
            <div>
              <Space style={{ marginBottom: 6 }} wrap>
                <Text strong>Ready for {tr?.to_branch?.name}, not on a TR ({candidates.length})</Text>
                <Button size="small" type="primary" ghost icon={<PlusOutlined />} disabled={!candSel.length} loading={busy === "add"} onClick={() => add(candSel)}>
                  Add selected ({candSel.length})
                </Button>
                <Button size="small" icon={<PlusOutlined />} disabled={!candidates.length} loading={busy === "add"} onClick={() => add(candidates.map((c) => c.shipment_id))}>
                  Add all
                </Button>
              </Space>
              <Table
                size="small"
                rowKey="shipment_id"
                loading={loading}
                dataSource={candidates}
                pagination={candidates.length > 10 ? { pageSize: 10, size: "small" } : false}
                rowSelection={{ selectedRowKeys: candSel, onChange: setCandSel }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No other ready parcels for this next hop" /> }}
                columns={[
                  { title: "Parcel", dataIndex: "tracking_number", render: (v, i) => <Text strong style={{ fontSize: 12 }}>{v || `#${i.shipment_id}`}</Text> },
                  { title: "Receiver", dataIndex: "receiver_name", render: (v) => v || "-" },
                  { title: "At next hop", key: "here", render: (_, i) => hereTag(i) },
                  { title: "Weight", dataIndex: "weight", align: "right", render: kg },
                ]}
              />
            </div>
          ) : null}
        </Space>
      )}
    </Modal>
  );
}
