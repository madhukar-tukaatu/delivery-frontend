"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col ,
  DatePicker,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  SwapOutlined,
  ReloadOutlined,
  MailOutlined,
  ThunderboltOutlined,
  ArrowRightOutlined,
  BankOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import StatCard, { StatCardGrid } from "@/components/admin/ui/StatCard";
import { useIsFinanceHq } from "@/components/admin/billing/BranchScopeNotice";
import { usePermissions } from "@/hooks/usePermission";
import api from "@/lib/api";
import {
  EmptyState,
  StatusTag,
  apiError,
  branchList,
  formatDate,
  formatDateTime,
  formatRs,
  toNumber,
  unwrap,
} from "@/components/admin/billing/financeKit";
import { RoutePath } from "@/components/admin/billing/interBranchKit";
import ShipmentSettlementDrawer from "@/components/admin/billing/ShipmentSettlementDrawer";
import ShipmentSplitTable from "@/components/admin/billing/ShipmentSplitTable";
import CounterpartyBreakdownDrawer from "@/components/admin/billing/CounterpartyBreakdownDrawer";

const { Text, Paragraph } = Typography;

const STATEMENT_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "paid", label: "Paid" },
  { value: "received", label: "Received" },
];

const dateParams = (range) => ({
  from: range?.[0] ? range[0].format("YYYY-MM-DD") : undefined,
  to: range?.[1] ? range[1].format("YYYY-MM-DD") : undefined,
});

function Amount({ v, type, strong }) {
  const n = toNumber(v);
  return (
    <Text strong={strong} type={n === 0 ? "secondary" : type} style={{ fontVariantNumeric: "tabular-nums" }}>
      {n === 0 ? "-" : formatRs(n)}
    </Text>
  );
}

function NetAmount({ v }) {
  const n = toNumber(v);
  if (Math.abs(n) < 0.005) return <Text type="secondary">Even</Text>;
  return (
    <Tooltip title={n > 0 ? "They owe you" : "You owe them"}>
      <Text strong style={{ color: n > 0 ? "#389e0d" : "#cf1322", fontVariantNumeric: "tabular-nums" }}>
        {n > 0 ? "+" : "−"} {formatRs(Math.abs(n))}
      </Text>
    </Tooltip>
  );
}

/* ---------- Branch position: per counterparty ---------- */

function CounterpartyTable({ data, loading, onStatements, onShipments, onOpenBreakdown, viewBranchName }) {
  const rows = data?.counterparties || [];
  const bucket = (side, key) => ({
    dataIndex: [side, key],
    align: "right",
    width: 120,
    render: (_, r) => <Amount v={r[side]?.[key]} type={side === "to_pay" ? "danger" : "success"} />,
  });
  const totals = data?.totals || {};
  const columns = [
    {
      title: "Counterparty branch",
      dataIndex: "branch_name",
      fixed: "left",
      width: 220,
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <Text strong>{v}</Text>
          {toNumber(r.net_due) < 0 ? (
            <Tag color="volcano" style={{ fontSize: 10 }}>You owe them</Tag>
          ) : toNumber(r.net_due) > 0 ? (
            <Tag color="green" style={{ fontSize: 10 }}>They owe you</Tag>
          ) : (
            <Tag style={{ fontSize: 10 }}>Settled</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "You pay them",
      children: [
        { title: "Unsettled", ...bucket("to_pay", "unsettled") },
        { title: "On statement (unpaid)", ...bucket("to_pay", "on_statement") },
        { title: "Paid, awaiting receipt", ...bucket("to_pay", "paid") },
      ],
    },
    {
      title: "They pay you",
      children: [
        { title: "Unsettled", ...bucket("to_receive", "unsettled") },
        { title: "On statement (unpaid)", ...bucket("to_receive", "on_statement") },
        { title: "Paid, awaiting receipt", ...bucket("to_receive", "paid") },
      ],
    },
    { title: "Net due", dataIndex: "net_due", align: "right", width: 130, render: (v) => <NetAmount v={v} /> },
    {
      title: "Bill not paid",
      align: "right",
      width: 130,
      render: (_, r) => {
        const p = toNumber(r.to_pay?.awaiting_bill);
        const g = toNumber(r.to_receive?.awaiting_bill);
        if (!p && !g) return <Text type="secondary">-</Text>;
        return (
          <Tooltip title="Shares waiting for the store / marketplace bill to be paid; not due yet.">
            <Space direction="vertical" size={0} style={{ alignItems: "flex-end" }}>
              {p ? <Text type="secondary" style={{ fontSize: 12 }}>pay {formatRs(p)}</Text> : null}
              {g ? <Text type="secondary" style={{ fontSize: 12 }}>receive {formatRs(g)}</Text> : null}
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: "Actions",
      width: 230,
      render: (_, r) => (
        <Space size={4} wrap>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<FileTextOutlined />}
            onClick={() => onOpenBreakdown?.(r.branch_id, r.branch_name)}
          >
            Breakdown
          </Button>
          <Button size="small" onClick={() => onStatements(r.branch_id)}>Statements</Button>
          <Button size="small" onClick={() => onShipments(r.branch_id)}>Shipments</Button>
        </Space>
      ),
    },
  ];
  const sum = (side, key) => toNumber(totals?.[side]?.[key]);
  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {/* Branch Manager Settlement Explainer Card */}
      <Card
        size="small"
        style={{
          background: "linear-gradient(90deg, #f0f5ff 0%, #fbfdff 100%)",
          border: "1px solid #adc6ff",
        }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} md={16}>
            <Space align="start">
              <InfoCircleOutlined style={{ color: "#1677ff", fontSize: 18, marginTop: 3 }} />
              <div>
                <Text strong style={{ fontSize: 14, color: "#0958d9", display: "block" }}>
                  How Settlements Work for {viewBranchName || "Your Branch"}:
                </Text>
                <Paragraph type="secondary" style={{ margin: "2px 0 0 0", fontSize: 12 }}>
                  The branch that collected the delivery charge (or merchant invoice) pays the other branches their earned shares.
                  You pay other branches when you collected fees for parcels they delivered. Other branches pay you when they collected fees for parcels you delivered.
                  Line-haul TR vehicle transport is 100% managed and funded directly by HQ.
                </Paragraph>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: "right" }}>
            <Space wrap>
              {toNumber(totals.to_pay?.due) > 0 && (
                <Tag color="volcano" style={{ padding: "4px 8px", fontSize: 12 }}>
                  To Pay: {formatRs(totals.to_pay?.due)}
                </Tag>
              )}
              {toNumber(totals.to_receive?.due) > 0 && (
                <Tag color="green" style={{ padding: "4px 8px", fontSize: 12 }}>
                  To Receive: {formatRs(totals.to_receive?.due)}
                </Tag>
              )}
              <Tag color={toNumber(totals.net_due) <= 0 ? "red" : "blue"} style={{ padding: "4px 8px", fontSize: 12, fontWeight: "bold" }}>
                Net: {formatRs(totals.net_due)}
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        rowKey="branch_id"
        size="middle"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        bordered
        scroll={{ x: 1350 }}
        expandable={{
          expandedRowRender: (r) => {
            const isPayable = toNumber(r.net_due) < 0;
            return (
              <Card size="small" style={{ background: "#fafafa", margin: "4px 0" }}>
                <Row justify="space-between" align="middle" gutter={[12, 12]}>
                  <Col xs={24} md={16}>
                    <Text strong style={{ color: isPayable ? "#cf1322" : "#389e0d", fontSize: 13, display: "block", marginBottom: 4 }}>
                      {isPayable ? "📤 Outgoing Payable Explanation:" : "📥 Incoming Receivable Explanation:"}
                    </Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                      {isPayable ? (
                        <>
                          <strong>{viewBranchName || "Kathmandu"}</strong> collected delivery charges from merchants for shipments delivered by <strong>{r.branch_name}</strong>.
                          You owe <strong>{r.branch_name}</strong> their delivery share ({formatRs(Math.abs(toNumber(r.net_due)))} net after 5% HQ commission).
                        </>
                      ) : (
                        <>
                          <strong>{r.branch_name}</strong> collected delivery charges for shipments that <strong>{viewBranchName || "Kathmandu"}</strong> delivered.
                          They owe you your net delivery share ({formatRs(Math.abs(toNumber(r.net_due)))}).
                        </>
                      )}
                    </Paragraph>
                  </Col>
                  <Col xs={24} md={8} style={{ textAlign: "right" }}>
                    <Space wrap>
                      <Button
                        size="small"
                        type="primary"
                        icon={<FileTextOutlined />}
                        onClick={() => onOpenBreakdown?.(r.branch_id, r.branch_name)}
                      >
                        Itemized Breakdown
                      </Button>
                      <Button size="small" onClick={() => onStatements(r.branch_id)}>
                        View Statement
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Card>
            );
          },
        }}
        locale={{ emptyText: <EmptyState title="Nothing between branches" hint="This branch has no shares with other branches in this period." /> }}
        summary={() =>
          rows.length ? (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: "#fafafa" }}>
                <Table.Summary.Cell index={0}><Text strong>Total</Text></Table.Summary.Cell>
                {["unsettled", "on_statement", "paid"].map((k, i) => (
                  <Table.Summary.Cell key={`p${k}`} index={1 + i} align="right"><Amount v={sum("to_pay", k)} type="danger" strong /></Table.Summary.Cell>
                ))}
                {["unsettled", "on_statement", "paid"].map((k, i) => (
                  <Table.Summary.Cell key={`r${k}`} index={4 + i} align="right"><Amount v={sum("to_receive", k)} type="success" strong /></Table.Summary.Cell>
                ))}
                <Table.Summary.Cell index={7} align="right"><NetAmount v={totals.net_due} /></Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatRs(toNumber(totals.pending_bill_pay) + toNumber(totals.pending_bill_receive))}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9} />
              </Table.Summary.Row>
            </Table.Summary>
          ) : null
        }
      />
    </Space>
  );
}

/* ---------- HQ: all branches ---------- */

function AllBranchesView({ data, loading, onPick }) {
  const branches = data?.branches || [];
  const pairs = data?.pairs || [];
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card size="small" title="Per-branch summary" extra={<Text type="secondary">Click a branch to open its view</Text>}>
        <Table
          rowKey="branch_id"
          size="middle"
          loading={loading}
          dataSource={branches}
          pagination={false}
          scroll={{ x: 1100 }}
          onRow={(r) => ({ onClick: () => onPick(r.branch_id), style: { cursor: "pointer" } })}
          locale={{ emptyText: <EmptyState title="No inter-branch shares" hint="Nothing has moved between branches in this period." /> }}
          columns={[
            { title: "Branch", dataIndex: "branch_name", fixed: "left", render: (v) => <a>{v}</a> },
            { title: "To pay (due)", dataIndex: "to_pay_due", align: "right", render: (v) => <Amount v={v} type="danger" /> },
            { title: "To receive (due)", dataIndex: "to_receive_due", align: "right", render: (v) => <Amount v={v} type="success" /> },
            { title: "Net", dataIndex: "net_due", align: "right", render: (v) => <NetAmount v={v} /> },
            {
              title: "Paid, awaiting receipt",
              align: "right",
              render: (_, r) => (
                <Space direction="vertical" size={0} style={{ alignItems: "flex-end" }}>
                  {toNumber(r.paid_out_awaiting) ? <Text style={{ fontSize: 12 }}>out {formatRs(r.paid_out_awaiting)}</Text> : null}
                  {toNumber(r.paid_in_awaiting) ? <Text style={{ fontSize: 12 }}>in {formatRs(r.paid_in_awaiting)}</Text> : null}
                  {!toNumber(r.paid_out_awaiting) && !toNumber(r.paid_in_awaiting) ? <Text type="secondary">-</Text> : null}
                </Space>
              ),
            },
            {
              title: "Bill not paid",
              align: "right",
              render: (_, r) => <Amount v={toNumber(r.pending_bill_pay) + toNumber(r.pending_bill_receive)} />,
            },
            {
              title: "Settled",
              align: "right",
              render: (_, r) => <Amount v={toNumber(r.settled_paid) + toNumber(r.settled_received)} />,
            },
            { title: "Counterparties", dataIndex: "counterparty_count", align: "center" },
          ]}
        />
      </Card>

      <Card size="small" title="Who owes whom">
        <Table
          rowKey={(r) => `${r.payer_branch_id}-${r.payee_branch_id}`}
          size="small"
          loading={loading}
          dataSource={pairs}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: <EmptyState title="No dues" /> }}
          columns={[
            {
              title: "Pays → Receives",
              render: (_, r) => (
                <Space size={6} wrap>
                  <Text strong>{r.payer_branch_name}</Text>
                  <ArrowRightOutlined style={{ fontSize: 10, color: "#8c8c8c" }} />
                  <Text strong>{r.payee_branch_name}</Text>
                </Space>
              ),
            },
            { title: "Unsettled", dataIndex: "unsettled", align: "right", render: (v) => <Amount v={v} /> },
            { title: "On statement", dataIndex: "on_statement", align: "right", render: (v) => <Amount v={v} /> },
            { title: "Paid, awaiting receipt", dataIndex: "paid", align: "right", render: (v) => <Amount v={v} /> },
            { title: "Due", dataIndex: "due", align: "right", render: (v) => <Amount v={v} strong /> },
            { title: "Bill not paid", dataIndex: "awaiting_bill", align: "right", render: (v) => <Amount v={v} /> },
            { title: "Shipments", dataIndex: "shipments", align: "center" },
          ]}
        />
      </Card>
    </Space>
  );
}

/* ---------- Page ---------- */

export default function InterBranchSettlementsPage() {
  const isHq = useIsFinanceHq();
  const { branchId, branchName, loading: permLoading } = usePermissions();

  const [branches, setBranches] = useState([]);
  const [hqBranch, setHqBranch] = useState(); // undefined = all branches
  const [range, setRange] = useState(null);
  const [tab, setTab] = useState("position");

  const viewBranch = isHq ? hqBranch : branchId ? Number(branchId) : undefined;
  const viewBranchName = isHq
    ? branches.find((b) => Number(b.id) === Number(hqBranch))?.name
    : branchName || (branchId ? `Branch #${branchId}` : null);

  // position
  const [position, setPosition] = useState(null);
  const [posLoading, setPosLoading] = useState(false);

  // statements
  const [stRows, setStRows] = useState([]);
  const [stTotals, setStTotals] = useState({});
  const [stLoading, setStLoading] = useState(false);
  const [stPage, setStPage] = useState({ current: 1, pageSize: 25, total: 0 });
  const [stFilters, setStFilters] = useState({ status: "", direction: undefined, counterparty: undefined, search: "" });

  // shipments
  const [shRows, setShRows] = useState([]);
  const [shSummary, setShSummary] = useState({});
  const [shViewerIds, setShViewerIds] = useState([]);
  const [shLoading, setShLoading] = useState(false);
  const [shPage, setShPage] = useState({ current: 1, pageSize: 25, total: 0 });
  const [shFilters, setShFilters] = useState({ search: "", status: undefined, role: undefined, counterparty: undefined, mode: undefined });

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settleId, setSettleId] = useState(null);
  const [cpDrawer, setCpDrawer] = useState({ open: false, id: null, name: "" });
  const [payRef, setPayRef] = useState({ open: false, id: null, ref: "" });
  const [hamro, setHamro] = useState(null);
  const [genRange, setGenRange] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!isHq) return;
    api
      .get("/admin/branches", { params: { per_page: 200 } })
      .then((r) => setBranches(branchList(r)))
      .catch(() => setBranches([]));
  }, [isHq]);

  const loadPosition = useCallback(async () => {
    if (permLoading) return;
    setPosLoading(true);
    try {
      const params = { ...dateParams(range), branch_id: isHq ? hqBranch : undefined };
      setPosition(unwrap(await api.get("/admin/inter-branch-settlements/position", { params })));
    } catch (e) {
      setPosition(null);
      message.error(apiError(e, "Could not load the branch position."));
    } finally {
      setPosLoading(false);
    }
  }, [range, isHq, hqBranch, permLoading]);

  const loadStatements = useCallback(
    async (page = 1, pageSize = stPage.pageSize) => {
      if (permLoading) return;
      setStLoading(true);
      try {
        const p = unwrap(
          await api.get("/admin/inter-branch-settlements", {
            params: {
              page,
              per_page: pageSize,
              status: stFilters.status || undefined,
              direction: viewBranch ? stFilters.direction : undefined,
              counterparty_id: stFilters.counterparty,
              search: stFilters.search || undefined,
              branch_id: isHq ? hqBranch : undefined,
              ...dateParams(range),
            },
          })
        );
        setStRows(p?.data || []);
        setStTotals(p?.status_totals || {});
        setStPage({ current: p?.current_page || page, pageSize: p?.per_page || pageSize, total: p?.total || 0 });
      } catch (e) {
        message.error(apiError(e, "Could not load statements."));
      } finally {
        setStLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stFilters, range, isHq, hqBranch, viewBranch, permLoading]
  );

  const loadShipments = useCallback(
    async (page = 1, pageSize = shPage.pageSize) => {
      if (permLoading) return;
      setShLoading(true);
      try {
        const d = unwrap(
          await api.get("/admin/inter-branch-settlements/shipments", {
            params: {
              page,
              per_page: pageSize,
              search: shFilters.search || undefined,
              status: shFilters.status,
              role: shFilters.role,
              counterparty_id: shFilters.counterparty,
              collection_mode: shFilters.mode,
              branch_id: isHq ? hqBranch : undefined,
              ...dateParams(range),
            },
          })
        );
        const p = d?.shipments || {};
        setShRows(p.data || []);
        setShSummary(d?.summary || {});
        setShViewerIds((d?.viewer_branch_ids || []).map(Number));
        setShPage({ current: p.current_page || page, pageSize: p.per_page || pageSize, total: p.total || 0 });
      } catch (e) {
        message.error(apiError(e, "Could not load shipments."));
      } finally {
        setShLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shFilters.status, shFilters.role, shFilters.counterparty, shFilters.mode, shFilters.search, range, isHq, hqBranch, permLoading]
  );

  useEffect(() => {
    loadPosition();
  }, [loadPosition]);

  useEffect(() => {
    loadStatements(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stFilters.status, stFilters.direction, stFilters.counterparty, range, hqBranch, permLoading]);

  useEffect(() => {
    loadShipments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shFilters.status, shFilters.role, shFilters.counterparty, shFilters.mode, range, hqBranch, permLoading]);

  // Picking another HQ branch clears branch-relative filters.
  useEffect(() => {
    setStFilters((f) => ({ ...f, direction: undefined, counterparty: undefined }));
    setShFilters((f) => ({ ...f, counterparty: undefined, status: undefined, role: undefined }));
  }, [hqBranch]);

  function refreshAll() {
    loadPosition();
    loadStatements(stPage.current);
    loadShipments(shPage.current);
  }

  async function openDetail(id) {
    setDetail({ id });
    setDetailLoading(true);
    try {
      setDetail(unwrap(await api.get(`/admin/inter-branch-settlements/${id}`)));
    } catch (e) {
      setDetail(null);
      message.error(apiError(e, "Could not load the statement."));
    } finally {
      setDetailLoading(false);
    }
  }

  async function generate() {
    setGenerating(true);
    try {
      const body = genRange?.[0]
        ? { from: genRange[0].format("YYYY-MM-DD"), to: genRange[1].format("YYYY-MM-DD") }
        : { period: "weekly" };
      const res = await api.post("/admin/inter-branch-settlements/generate", body);
      message.success(res?.data?.message || "Statements generated.");
      refreshAll();
    } catch (e) {
      message.error(apiError(e, "Generate failed."));
    } finally {
      setGenerating(false);
    }
  }

  async function act(st, action, body = {}, okMsg = "Done") {
    setBusy(`${st.id}:${action}`);
    try {
      const res = await api.post(`/admin/inter-branch-settlements/${st.id}/${action}`, body);
      const d = unwrap(res);
      if (action === "send-email") message.success(d?.to?.length ? `Emailed to ${d.to.join(", ")}` : res?.data?.message || "Statement emailed.");
      else if (action === "pay-hamropay") {
        setHamro({ statement: st, session: d });
        message.success("HamroPay session created. Finish the payment, then mark it paid.");
      } else message.success(res?.data?.message || okMsg);
      refreshAll();
      if (detail?.id === st.id) openDetail(st.id);
    } catch (e) {
      message.error(apiError(e, "Action failed."));
    } finally {
      setBusy(null);
    }
  }

  const myIds = useMemo(() => (viewBranch ? [Number(viewBranch)] : []), [viewBranch]);
  const isMine = (id) => myIds.includes(Number(id));
  const canPayer = (st) => isHq || (!isHq && Number(st.from_branch_id) === Number(branchId));
  const canReceiver = (st) => isHq || (!isHq && Number(st.to_branch_id) === Number(branchId));

  function directionTag(st) {
    if (isMine(st.from_branch_id)) return <Tag color="volcano">You pay</Tag>;
    if (isMine(st.to_branch_id)) return <Tag color="green">You receive</Tag>;
    return null;
  }

  function StatementActions({ st }) {
    const b = (a) => busy === `${st.id}:${a}`;
    return (
      <Space wrap size={4} onClick={(e) => e.stopPropagation()}>
        {st.status === "draft" && canPayer(st) ? (
          <Button size="small" loading={b("issue")} onClick={() => act(st, "issue", {}, "Statement issued.")}>
            Issue
          </Button>
        ) : null}
        {["draft", "issued"].includes(st.status) && canPayer(st) ? (
          <>
            <Button size="small" type="primary" loading={b("pay-hamropay")} onClick={() => act(st, "pay-hamropay")}>
              Pay via HamroPay
            </Button>
            <Button size="small" onClick={() => setPayRef({ open: true, id: st.id, st, ref: "" })}>
              Mark paid
            </Button>
          </>
        ) : null}
        {["issued", "paid"].includes(st.status) && canReceiver(st) ? (
          <Popconfirm title="Confirm the money reached the receiving branch?" onConfirm={() => act(st, "mark-received", {}, "Marked received.")}>
            <Button size="small" type="primary" ghost loading={b("mark-received")}>
              Mark received
            </Button>
          </Popconfirm>
        ) : null}
        <Popconfirm title="Email this statement to both branches?" onConfirm={() => act(st, "send-email")}>
          <Button size="small" icon={<MailOutlined />} loading={b("send-email")}>
            Email
          </Button>
        </Popconfirm>
      </Space>
    );
  }

  const counterpartyOptions = useMemo(() => {
    if (isHq && !hqBranch) return branches.map((b) => ({ value: b.id, label: b.name }));
    return (position?.counterparties || []).map((c) => ({ value: c.branch_id, label: c.branch_name }));
  }, [isHq, hqBranch, branches, position]);

  const statementColumns = [
    {
      title: "Statement",
      fixed: "left",
      width: 230,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => openDetail(r.id)}>{r.statement_number}</a>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {formatDate(r.period_start)} – {formatDate(r.period_end)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Direction",
      width: 300,
      render: (_, r) => (
        <Space size={6} wrap>
          {directionTag(r)}
          <Text strong={isMine(r.from_branch_id)}>{r.from_branch?.name || `#${r.from_branch_id}`}</Text>
          <ArrowRightOutlined style={{ fontSize: 10, color: "#8c8c8c" }} />
          <Text strong={isMine(r.to_branch_id)}>{r.to_branch?.name || `#${r.to_branch_id}`}</Text>
        </Space>
      ),
    },
    { title: "Parcels", dataIndex: "line_count", align: "center", width: 80 },
    {
      title: "Amount",
      dataIndex: "total_amount",
      align: "right",
      width: 130,
      render: (v, r) => (
        <Text strong style={{ color: isMine(r.from_branch_id) ? "#cf1322" : isMine(r.to_branch_id) ? "#389e0d" : undefined }}>
          {formatRs(v)}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 150,
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <StatusTag status={v} label={v === "paid" ? "Paid, awaiting receipt" : undefined} />
          {r.paid_at ? <Text type="secondary" style={{ fontSize: 11 }}>paid {formatDate(r.paid_at)}</Text> : null}
        </Space>
      ),
    },
    { title: "Actions", width: 380, render: (_, r) => <StatementActions st={r} /> },
  ];

  /* ---- summary cards ---- */
  const t = position?.totals || {};
  const allMode = position?.mode === "all";
  const cards = allMode ? (
    <StatCardGrid>
      <StatCard label="Due between branches" value={formatRs(t.due)} hint="Unsettled + on statement, not paid" variant="primary" />
      <StatCard label="Paid, awaiting receipt" value={formatRs(t.paid)} hint="Paying branch marked paid" variant="accent" />
      <StatCard label="Pending (bill not paid)" value={formatRs(t.awaiting_bill)} hint="Store / marketplace bill unpaid" variant="warning" />
      <StatCard label="Received" value={formatRs(t.received)} hint={`${position?.branches?.length || 0} branches involved`} variant="success" />
    </StatCardGrid>
  ) : (
    <StatCardGrid>
      <StatCard label="To pay" value={formatRs(t.to_pay?.due)} hint={`Unsettled ${formatRs(t.to_pay?.unsettled)} · on statement ${formatRs(t.to_pay?.on_statement)}`} variant="danger" />
      <StatCard label="To receive" value={formatRs(t.to_receive?.due)} hint={`Unsettled ${formatRs(t.to_receive?.unsettled)} · on statement ${formatRs(t.to_receive?.on_statement)}`} variant="success" />
      <StatCard
        label="Net"
        value={Math.abs(toNumber(t.net_due)) < 0.005 ? "Even" : `${toNumber(t.net_due) > 0 ? "+" : "−"} ${formatRs(Math.abs(toNumber(t.net_due)))}`}
        hint={toNumber(t.net_due) > 0 ? "Other branches owe you" : toNumber(t.net_due) < 0 ? "You owe other branches" : "Nothing due"}
        variant={toNumber(t.net_due) >= 0 ? "primary" : "warning"}
      />
      <StatCard
        label="Pending (bill not paid)"
        value={formatRs(toNumber(t.pending_bill_pay) + toNumber(t.pending_bill_receive))}
        hint={`Pay ${formatRs(t.pending_bill_pay)} · receive ${formatRs(t.pending_bill_receive)}`}
        variant="warning"
      />
    </StatCardGrid>
  );

  const stCount = (s) => (s ? stTotals?.[s]?.count || 0 : Object.values(stTotals || {}).reduce((a, x) => a + (x?.count || 0), 0));

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Inter-branch settlements"
        subtitle="The branch that collected a transfer's delivery charge pays the other branches their shares."
        icon={<SwapOutlined />}
        actions={
          <Button icon={<ReloadOutlined />} onClick={refreshAll}>
            Refresh
          </Button>
        }
      />

      <Card size="small">
        <Space wrap size={12} style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap size={12}>
            {isHq ? (
              <Select
                showSearch
                optionFilterProp="label"
                style={{ width: 260 }}
                value={hqBranch ?? "all"}
                onChange={(v) => setHqBranch(v === "all" ? undefined : v)}
                options={[{ value: "all", label: "All branches" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
                suffixIcon={<BankOutlined />}
              />
            ) : (
              <Tooltip title="Branch users only see their own branch.">
                <Tag icon={<BankOutlined />} color="blue" style={{ padding: "4px 10px", fontSize: 13 }}>
                  {viewBranchName || "No branch assigned"}
                </Tag>
              </Tooltip>
            )}
            <DatePicker.RangePicker value={range} onChange={setRange} placeholder={["Delivered from", "to"]} allowEmpty={[true, true]} />
          </Space>
          {!permLoading && (isHq || branchId) ? (
            <Space wrap>
              <DatePicker.RangePicker value={genRange} onChange={setGenRange} placeholder={["Generate from", "to"]} />
              <Popconfirm
                title={`${genRange?.[0] ? "Generate statements for these dates" : "Generate statements for the last 7 days"}${isHq ? "" : " (your branch only)"}?`}
                onConfirm={generate}
              >
                <Button icon={<ThunderboltOutlined />} loading={generating}>
                  {genRange?.[0] ? "Generate for dates" : "Generate last 7 days"}
                </Button>
              </Popconfirm>
            </Space>
          ) : null}
        </Space>
      </Card>

      {!isHq && !permLoading && !branchId ? (
        <Alert type="warning" showIcon message="No branch is assigned to your account, so no settlements are shown." />
      ) : null}

      {posLoading && !position ? <Skeleton active paragraph={{ rows: 2 }} /> : cards}

      <Card styles={{ body: { paddingTop: 4 } }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: "position",
              label: allMode ? "All branches" : "To pay & to receive",
              children: allMode ? (
                <AllBranchesView data={position} loading={posLoading} onPick={(id) => setHqBranch(id)} />
              ) : (
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Text type="secondary">
                    {viewBranchName ? <Text strong>{viewBranchName}</Text> : "This branch"}: what you owe and are owed, per branch.
                    Unsettled shares go on the next statement; paid statements wait for the other branch to confirm receipt.
                  </Text>
                  <CounterpartyTable
                    data={position}
                    loading={posLoading}
                    viewBranchName={viewBranchName}
                    onOpenBreakdown={(id, name) => setCpDrawer({ open: true, id, name })}
                    onStatements={(id) => {
                      setStFilters((f) => ({ ...f, counterparty: id }));
                      setTab("statements");
                    }}
                    onShipments={(id) => {
                      setShFilters((f) => ({ ...f, counterparty: id }));
                      setTab("shipments");
                    }}
                  />
                </Space>
              ),
            },
            {
              key: "statements",
              label: `Statements${stCount("") ? ` (${stCount("")})` : ""}`,
              children: (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <Segmented
                    value={stFilters.status}
                    onChange={(v) => setStFilters((f) => ({ ...f, status: v }))}
                    options={STATEMENT_TABS.map((s) => ({
                      value: s.value,
                      label: (
                        <span>
                          {s.label}
                          {stCount(s.value) ? <Text type="secondary"> {stCount(s.value)}</Text> : null}
                        </span>
                      ),
                    }))}
                  />
                  <Space wrap>
                    {viewBranch ? (
                      <Select
                        allowClear
                        placeholder="Direction"
                        style={{ width: 170 }}
                        value={stFilters.direction}
                        onChange={(v) => setStFilters((f) => ({ ...f, direction: v }))}
                        options={[
                          { label: "You pay", value: "payable" },
                          { label: "You receive", value: "receivable" },
                        ]}
                      />
                    ) : null}
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder={viewBranch ? "Counterparty branch" : "Branch"}
                      style={{ width: 220 }}
                      value={stFilters.counterparty}
                      onChange={(v) => setStFilters((f) => ({ ...f, counterparty: v }))}
                      options={counterpartyOptions}
                    />
                    <Input.Search
                      allowClear
                      placeholder="Statement number"
                      style={{ width: 220 }}
                      value={stFilters.search}
                      onChange={(e) => setStFilters((f) => ({ ...f, search: e.target.value }))}
                      onSearch={() => loadStatements(1)}
                    />
                  </Space>
                  <Table
                    rowKey="id"
                    loading={stLoading}
                    dataSource={stRows}
                    columns={statementColumns}
                    scroll={{ x: 1250 }}
                    onRow={(r) => ({ onClick: () => openDetail(r.id), style: { cursor: "pointer" } })}
                    pagination={{ ...stPage, showSizeChanger: true, showTotal: (n) => `${n} statements`, onChange: (p, ps) => loadStatements(p, ps) }}
                    locale={{ emptyText: <EmptyState title="No statements" hint="Statements are generated weekly from eligible shares." /> }}
                  />
                </Space>
              ),
            },
            {
              key: "shipments",
              label: "Shipments",
              children: (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <Space wrap>
                    <Input.Search
                      allowClear
                      placeholder="Tracking number"
                      style={{ width: 220 }}
                      value={shFilters.search}
                      onChange={(e) => setShFilters((f) => ({ ...f, search: e.target.value }))}
                      onSearch={() => loadShipments(1)}
                    />
                    <Select
                      allowClear
                      placeholder={viewBranch ? "Your share status" : "Share status"}
                      style={{ width: 170 }}
                      value={shFilters.status}
                      onChange={(v) => setShFilters((f) => ({ ...f, status: v }))}
                      options={[
                        { label: "Pending", value: "pending" },
                        { label: "On statement", value: "on_statement" },
                        { label: "Settled", value: "settled" },
                      ]}
                    />
                    <Select
                      allowClear
                      placeholder={viewBranch ? "Your role" : "Role"}
                      style={{ width: 140 }}
                      value={shFilters.role}
                      onChange={(v) => setShFilters((f) => ({ ...f, role: v }))}
                      options={[
                        { label: "Origin", value: "origin" },
                        { label: "Transit", value: "transit" },
                        { label: "Delivery", value: "delivery" },
                      ]}
                    />
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder={viewBranch ? "With branch" : "Branch"}
                      style={{ width: 200 }}
                      value={shFilters.counterparty}
                      onChange={(v) => setShFilters((f) => ({ ...f, counterparty: v }))}
                      options={counterpartyOptions}
                    />
                    <Select
                      allowClear
                      placeholder="Collection"
                      style={{ width: 190 }}
                      value={shFilters.mode}
                      onChange={(v) => setShFilters((f) => ({ ...f, mode: v }))}
                      options={[
                        { label: "Customer paid at door", value: "customer" },
                        { label: "Store invoice", value: "merchant_invoice" },
                        { label: "Marketplace invoice", value: "company_invoice" },
                      ]}
                    />
                  </Space>
                  <Space wrap size={16}>
                    <Text type="secondary">
                      {shSummary.shipments || 0} shipments · fare <Text strong>{formatRs(shSummary.fare)}</Text> · transport {formatRs(shSummary.transport)} · extra km{" "}
                      {formatRs(shSummary.extra_distance)} · HQ {formatRs(shSummary.hq_commission)}
                    </Text>
                    {shSummary.your_allocation !== null && shSummary.your_allocation !== undefined ? (
                      <Text type="secondary">
                        Your share <Text strong>{formatRs(shSummary.your_allocation)}</Text> · your net <Text strong>{formatRs(shSummary.your_net)}</Text>
                      </Text>
                    ) : null}
                  </Space>
                  <ShipmentSplitTable
                    rows={shRows}
                    loading={shLoading}
                    pagination={shPage}
                    onChange={(p, ps) => loadShipments(p, ps)}
                    showYours={shViewerIds.length > 0}
                    viewerIds={shViewerIds}
                    onOpen={setSettleId}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
        The origin branch bills the store (or the marketplace for free delivery). Once that bill is paid, each other branch's share goes on
        a weekly statement from the branch that holds the money. When the customer paid the delivery charge at the door, the delivery
        branch holds it and pays the others. Customer COD money is not part of this. Dates are Nepal time.
      </Paragraph>

      {/* Statement drawer */}
      <Drawer
        open={!!detail}
        width={Math.min(1080, typeof window !== "undefined" ? window.innerWidth : 1080)}
        onClose={() => setDetail(null)}
        title={detail?.statement_number || "Statement"}
        extra={detail?.status ? <StatementActions st={detail} /> : null}
      >
        {detailLoading && !detail?.statement_number ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : detail?.statement_number ? (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Pays">
                <Space size={6}>
                  {isMine(detail.from_branch_id) ? <Tag color="volcano">You</Tag> : null}
                  {detail.from_branch?.name || `#${detail.from_branch_id}`}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Receives">
                <Space size={6}>
                  {isMine(detail.to_branch_id) ? <Tag color="green">You</Tag> : null}
                  {detail.to_branch?.name || `#${detail.to_branch_id}`}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Period">
                {formatDate(detail.period_start)} – {formatDate(detail.period_end)}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusTag status={detail.status} label={detail.status === "paid" ? "Paid, awaiting receipt" : undefined} />
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <Text strong>{formatRs(detail.total_amount)}</Text> · {detail.line_count} parcel{Number(detail.line_count) === 1 ? "" : "s"}
              </Descriptions.Item>
              <Descriptions.Item label="Reference">{detail.payment_reference || "-"}</Descriptions.Item>
              <Descriptions.Item label="Paid">{detail.paid_at ? formatDateTime(detail.paid_at) : "-"}</Descriptions.Item>
              <Descriptions.Item label="Received">{detail.received_at ? formatDateTime(detail.received_at) : "-"}</Descriptions.Item>
            </Descriptions>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={detail.lines || []}
              scroll={{ x: 1100 }}
              locale={{ emptyText: <EmptyState title="No lines" /> }}
              columns={[
                {
                  title: "Tracking",
                  render: (_, l) => (
                    <Space direction="vertical" size={0}>
                      <a onClick={() => setSettleId(l.shipment_id)}>{l.shipment?.tracking_number || `#${l.shipment_id}`}</a>
                      {l.merchant_name ? <Text type="secondary" style={{ fontSize: 11 }}>{l.merchant_name}</Text> : null}
                    </Space>
                  ),
                },
                { title: "Delivered", dataIndex: "delivered_at", render: (v) => formatDate(v) },
                { title: "Route", render: (_, l) => <RoutePath route={l.route} /> },
                { title: "Role", dataIndex: "role", render: (v) => <Text style={{ textTransform: "capitalize" }}>{v}</Text> },
                { title: "Share", dataIndex: "share_amount", align: "right", render: (v) => formatRs(v) },
                { title: "Transport", dataIndex: "transport_amount", align: "right", render: (v) => formatRs(v, { blankZero: true }) },
                { title: "Extra km", dataIndex: "extra_distance_amount", align: "right", render: (v) => formatRs(v, { blankZero: true }) },
                { title: "Allocation", dataIndex: "amount", align: "right", render: (v) => <Text strong>{formatRs(v)}</Text> },
                {
                  title: "",
                  render: (_, l) => (
                    <Button size="small" onClick={() => setSettleId(l.shipment_id)}>
                      Breakdown
                    </Button>
                  ),
                },
              ]}
              summary={(ls) => (
                <Table.Summary.Row style={{ background: "#fafafa" }}>
                  <Table.Summary.Cell index={0} colSpan={7}>
                    <Text strong>Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">
                    <Text strong>{formatRs(ls.reduce((a, l) => a + toNumber(l.amount), 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} />
                </Table.Summary.Row>
              )}
            />
          </Space>
        ) : null}
      </Drawer>

      <ShipmentSettlementDrawer open={!!settleId} shipmentId={settleId} onClose={() => setSettleId(null)} />

      <CounterpartyBreakdownDrawer
        open={cpDrawer.open}
        onClose={() => setCpDrawer({ open: false, id: null, name: "" })}
        viewBranchId={viewBranch}
        viewBranchName={viewBranchName}
        counterpartyId={cpDrawer.id}
        counterpartyName={cpDrawer.name}
        onOpenShipment={(id) => setSettleId(id)}
      />

      <Modal
        open={payRef.open}
        title="Mark statement paid"
        okText="Mark paid"
        confirmLoading={busy === `${payRef.id}:mark-paid`}
        onCancel={() => setPayRef({ open: false, id: null, ref: "" })}
        onOk={async () => {
          await act(payRef.st || { id: payRef.id }, "mark-paid", { payment_reference: payRef.ref || undefined }, "Marked paid.");
          setPayRef({ open: false, id: null, ref: "" });
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          {payRef.st ? (
            <Text>
              {payRef.st.from_branch?.name} pays {payRef.st.to_branch?.name} <Text strong>{formatRs(payRef.st.total_amount)}</Text>
            </Text>
          ) : null}
          <Input
            placeholder="Payment reference (bank / HamroPay transaction id)"
            value={payRef.ref}
            onChange={(e) => setPayRef((p) => ({ ...p, ref: e.target.value }))}
          />
        </Space>
      </Modal>

      <Modal open={Boolean(hamro)} title="HamroPay session created" onCancel={() => setHamro(null)} footer={<Button onClick={() => setHamro(null)}>Close</Button>}>
        {hamro ? (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Statement">{hamro.statement?.statement_number}</Descriptions.Item>
            <Descriptions.Item label="Amount">{formatRs(hamro.statement?.total_amount)}</Descriptions.Item>
            {hamro.session?.merchant_txn_id ? (
              <Descriptions.Item label="Transaction id">
                <Text copyable>{hamro.session.merchant_txn_id}</Text>
              </Descriptions.Item>
            ) : null}
            {hamro.session?.gateway_url ? (
              <Descriptions.Item label="Gateway">
                <Text copyable>{hamro.session.gateway_url}</Text>
              </Descriptions.Item>
            ) : null}
          </Descriptions>
        ) : null}
      </Modal>
    </Space>
  );
}
