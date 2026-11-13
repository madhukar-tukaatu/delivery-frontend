"use client";

import { useState } from "react";
import { Button, Dropdown, Space, Tooltip, message } from "antd";
import {
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
  PlusOutlined,
  DownOutlined,
} from "@ant-design/icons";
import DataImportModal from "./DataImportModal";
import { exportToCsv } from "@/utils/csvHelper";

/**
 * Standardized Compact Export & Import Toolbar
 *
 * @param {Object} props
 * @param {string} props.entityTitle - e.g. "Customers"
 * @param {Array<Object>} props.columns - Columns definition for both export & import template
 * @param {Array<Object>} props.data - Current table/page data for export
 * @param {Array<Object>} [props.sampleRows] - Sample rows for import template
 * @param {() => Promise<any>|Array<Object>} [props.onExportAll] - Optional async handler to fetch & export all records
 * @param {(validRows: Array<Object>) => Promise<any>} props.onImport - Callback when rows are imported
 * @param {() => void} [props.onRefresh] - Refresh data callback
 * @param {() => void} [props.onAdd] - Add new record callback
 * @param {string} [props.addText] - Text for add button (e.g. "Add Customer")
 * @param {boolean} [props.loading] - Loading state for refresh/export
 * @param {React.ReactNode} [props.extra] - Additional buttons
 * @param {"small"|"middle"} [props.size="small"] - Button size
 */
export default function ExportImportToolbar({
  entityTitle = "Records",
  columns = [],
  data = [],
  sampleRows = [],
  onExportAll,
  onImport,
  onRefresh,
  onAdd,
  addText,
  loading = false,
  extra,
  size = "small",
}) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (isFull = true) => {
    try {
      setExporting(true);
      let recordsToExport = data;
      if (isFull && typeof onExportAll === "function") {
        message.loading({ content: `Fetching full dataset for ${entityTitle}...`, key: "export_progress", duration: 0 });
        const fullData = await onExportAll();
        message.destroy("export_progress");
        if (Array.isArray(fullData) && fullData.length > 0) {
          recordsToExport = fullData;
        }
      }

      if (!recordsToExport || recordsToExport.length === 0) {
        message.warning(`No records available to export for ${entityTitle}.`);
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const cleanName = entityTitle.toLowerCase().replace(/\s+/g, "_");
      const scopeSuffix = isFull ? "all" : "page";
      exportToCsv({
        filename: `${cleanName}_${scopeSuffix}_${dateStr}.csv`,
        columns,
        data: recordsToExport,
      });
      message.success(
        `Exported ${recordsToExport.length} ${entityTitle.toLowerCase()} (${isFull ? "Full Dataset" : "Current Page"}).`
      );
    } catch (err) {
      message.destroy("export_progress");
      message.error("Export failed: " + (err?.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  };

  const exportMenuItems = [
    {
      key: "all",
      label: `Export All ${entityTitle} (Full Dataset)`,
      icon: <DownloadOutlined style={{ color: "#0891B2" }} />,
      onClick: () => handleExport(true),
    },
    {
      key: "page",
      label: `Export Current Page Only (${data.length} rows)`,
      icon: <DownloadOutlined />,
      onClick: () => handleExport(false),
    },
  ];

  return (
    <>
      <Space size={6} wrap align="center">
        {onAdd && (
          <Button
            type="primary"
            size={size}
            icon={<PlusOutlined />}
            onClick={onAdd}
            style={{
              background: "#FBBF24",
              borderColor: "#FBBF24",
              color: "#0F172A",
              fontWeight: 600,
            }}
          >
            {addText || `Add ${entityTitle}`}
          </Button>
        )}

        <Dropdown.Button
          size={size}
          icon={<DownOutlined />}
          loading={exporting}
          onClick={() => handleExport(true)}
          menu={{ items: exportMenuItems }}
          style={{ borderColor: "#CBD5E1" }}
        >
          <DownloadOutlined /> Export
        </Dropdown.Button>

        {onImport && (
          <Tooltip title={`Import ${entityTitle} from CSV`}>
            <Button
              size={size}
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
              style={{ borderColor: "#0891B2", color: "#0891B2", background: "#fff" }}
            >
              Import
            </Button>
          </Tooltip>
        )}

        {onRefresh && (
          <Tooltip title="Refresh data">
            <Button
              size={size}
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              loading={loading}
              style={{ borderColor: "#CBD5E1", background: "#fff", color: "#64748B" }}
            />
          </Tooltip>
        )}

        {extra}
      </Space>

      {onImport && (
        <DataImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          entityTitle={entityTitle}
          columns={columns}
          sampleRows={sampleRows}
          onImport={onImport}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
