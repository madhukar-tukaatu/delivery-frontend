"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Collapse, Popconfirm, Space, Tag, Typography, message } from "antd";
import { CarOutlined, PhoneOutlined, ReloadOutlined, SendOutlined } from "@ant-design/icons";
import { staffGetRuns, staffStartRun, runErrorText } from "@/services/admin/deliveryRunService";
import { ITEM_STATUS_META, OUTCOME_META, RUN_STATUS_META, areaOf, rs, vehicleText } from "@/components/admin/delivery-runs/runMeta";

const { Text } = Typography;

/**
 * Rider view of assigned DR runs on /staff/deliveries: parcels in stop order.
 * Tapping a stop opens the normal delivery drawer, so arrived / POD cash or
 * online / delivered / failed keep working exactly as before.
 *
 * props:
 *  - deliveries: the rider's delivery rows (to open the matching drawer)
 *  - onOpenDelivery(delivery)
 *  - onChanged(): reload deliveries after the run is started
 */
export default function StaffRunPanel({ deliveries = [], onOpenDelivery, onChanged }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await staffGetRuns();
      setRuns(data.active);
    } catch {
      // Older backends without DR runs: hide the panel.
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever the rider's deliveries reload (after any delivery action).
  useEffect(() => {
    load();
  }, [load, deliveries]);

  const start = async (run) => {
    setStarting(run.id);
    try {
      const res = await staffStartRun(run.id);
      message.success(res.message || "Run started.");
      await load();
      onChanged?.();
    } catch (e) {
      message.error(runErrorText(e, "Could not start the run."));
    } finally {
      setStarting(null);
    }
  };

  const openStop = (item) => {
    const row = deliveries.find((d) => Number(d.id) === Number(item.delivery_id));
    if (row) {
      onOpenDelivery?.(row);
    } else if (item.status === "queued") {
      message.info("Start the run first. The parcel opens here once it is out for delivery.");
    } else {
      message.info("Refresh deliveries to open this parcel.");
    }
  };

  if (!runs.length) return null;

  return (
    <Card
      size="small"
      style={{ marginBottom: 16, borderRadius: 12, borderTop: "3px solid #13c2c2" }}
      title={
        <Space>
          <CarOutlined />
          <span>My delivery runs</span>
        </Space>
      }
      extra={<Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={load} />}
    >
      <Collapse
        size="small"
        defaultActiveKey={runs.slice(0, 1).map((r) => String(r.id))}
        items={runs.map((run) => {
          const meta = RUN_STATUS_META[run.status] || { label: run.status, color: "default" };
          const items = (run.items || []).filter((i) => i.status !== "removed");
          return {
            key: String(run.id),
            label: (
              <Space wrap size={6}>
                <Text strong>{run.run_number}</Text>
                <Tag color={meta.color} style={{ margin: 0 }}>
                  {meta.label}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {run.delivered_count}/{run.expected_count} delivered · COD {rs(run.cod_expected)}
                  {Number(run.cod_collected) ? ` · cash ${rs(run.cod_collected)}` : ""}
                </Text>
              </Space>
            ),
            extra:
              run.status === "assigned" ? (
                <span onClick={(e) => e.stopPropagation()} role="presentation">
                  <Popconfirm
                    title={`Start ${run.run_number}?`}
                    description={`Confirm you collected all ${run.expected_count} parcels from the branch.`}
                    onConfirm={() => start(run)}
                  >
                    <Button type="primary" size="small" icon={<SendOutlined />} loading={starting === run.id}>
                      Start run
                    </Button>
                  </Popconfirm>
                </span>
              ) : null,
            children: (
              <Space direction="vertical" style={{ width: "100%" }} size={6}>
                {run.branch?.name || vehicleText(run.vehicle_type, run.vehicle_number) || run.notes ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {[run.branch?.name, vehicleText(run.vehicle_type, run.vehicle_number)].filter(Boolean).join(" · ")}
                    {run.notes ? ` · ${run.notes}` : ""}
                  </Text>
                ) : null}
                {run.status === "completed" ? (
                  <Text type="success">All stops done. Hand over cash {rs(run.cod_collected)} and returned parcels at the branch.</Text>
                ) : null}
                {items.map((i) => {
                  const st = ITEM_STATUS_META[i.status] || { label: i.status, color: "default" };
                  const outcome = OUTCOME_META[i.outcome];
                  const done = ["delivered", "failed"].includes(i.status);
                  return (
                    <div
                      key={i.item_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openStop(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openStop(i);
                      }}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #f0f0f0",
                        background: done ? "#fafafa" : "#fff",
                        cursor: "pointer",
                        opacity: done ? 0.75 : 1,
                      }}
                    >
                      <div
                        style={{
                          minWidth: 28,
                          height: 28,
                          borderRadius: 14,
                          background: done ? "#d9d9d9" : "#13c2c2",
                          color: "#fff",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {i.sequence}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Space size={4} wrap>
                          <Text strong style={{ fontFamily: "monospace", fontSize: 12 }}>
                            {i.tracking_number}
                          </Text>
                          <Tag color={st.color} style={{ margin: 0 }}>
                            {i.status === "out_for_delivery" && i.arrived ? "Arrived" : st.label}
                          </Tag>
                          {outcome ? (
                            <Tag color={outcome.color} style={{ margin: 0 }}>
                              {outcome.label}
                            </Tag>
                          ) : null}
                          {Number(i.cod_amount) > 0 ? (
                            <Tag color="gold" style={{ margin: 0 }}>
                              COD {rs(i.cod_amount)}
                            </Tag>
                          ) : (
                            <Tag style={{ margin: 0 }}>Prepaid</Tag>
                          )}
                        </Space>
                        <div style={{ fontSize: 13 }}>{i.receiver_name || "-"}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {areaOf(i)} · {i.delivery_address || "-"}
                        </Text>
                        {i.status === "failed" && i.reason ? (
                          <div style={{ fontSize: 11, color: "#cf1322" }}>{i.reason}</div>
                        ) : null}
                      </div>
                      {i.receiver_phone ? (
                        <a
                          href={`tel:${i.receiver_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Call ${i.receiver_name || "receiver"}`}
                          style={{ alignSelf: "center" }}
                        >
                          <PhoneOutlined style={{ fontSize: 18 }} />
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </Space>
            ),
          };
        })}
      />
    </Card>
  );
}
