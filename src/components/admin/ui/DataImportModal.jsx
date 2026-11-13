"use client";

import { useState } from "react";
import {
  Modal,
  Upload,
  Button,
  Space,
  Typography,
  Table,
  Tag,
  Alert,
  Divider,
  Progress,
  Checkbox,
  message,
} from "antd";
import {
  InboxOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { parseCsv, validateImportRows, downloadCsvTemplate } from "@/utils/csvHelper";

const { Text, Title, Paragraph } = Typography;
const { Dragger } = Upload;

/**
 * Universal Data Import Modal
 *
 * @param {Object} props
 * @param {boolean} props.open - Modal visibility
 * @param {() => void} props.onClose - Close callback
 * @param {string} props.entityTitle - e.g. "Customers", "Shipments", "Merchants"
 * @param {Array<Object>} props.columns - Schema columns [{ key, label, required, sampleValue, validate }]
 * @param {Array<Object>} props.sampleRows - Sample rows for template download
 * @param {(validRows: Array<Object>, allRows: Array<Object>) => Promise<any>} props.onImport - Import handler function
 * @param {() => void} [props.onSuccess] - Callback when import finishes successfully
 */
export default function DataImportModal({
  open,
  onClose,
  entityTitle = "Records",
  columns = [],
  sampleRows = [],
  onImport,
  onSuccess,
}) {
  const [fileList, setFileList] = useState([]);
  const [parsedData, setParsedData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const resetState = () => {
    setFileList([]);
    setParsedData(null);
    setValidationResult(null);
    setIsImporting(false);
    setImportProgress(0);
  };

  const handleClose = () => {
    if (isImporting) return;
    resetState();
    onClose?.();
  };

  const handleDownloadTemplate = () => {
    try {
      const cleanName = entityTitle.toLowerCase().replace(/\s+/g, "_");
      downloadCsvTemplate({
        filename: `${cleanName}_template.csv`,
        columns,
        sampleRows,
      });
      message.success("CSV template downloaded.");
    } catch {
      message.error("Failed to download template.");
    }
  };

  const handleFileChange = (info) => {
    const file = info.file;
    if (!file) return;

    // Use latest file
    const actualFile = file.originFileObj || file;
    setFileList([file]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const { headers, rows } = parseCsv(text);

        if (!rows || rows.length === 0) {
          message.warning("The uploaded file does not contain any data rows.");
          setParsedData(null);
          setValidationResult(null);
          return;
        }

        const validation = validateImportRows(rows, columns);
        setParsedData({ headers, rows });
        setValidationResult(validation);
        message.success(`Parsed ${rows.length} rows successfully.`);
      } catch (err) {
        message.error("Failed to parse CSV file: " + (err.message || "Unknown error"));
        setParsedData(null);
        setValidationResult(null);
      }
    };
    reader.onerror = () => {
      message.error("Failed to read file.");
    };
    reader.readAsText(actualFile);
  };

  const handlePerformImport = async () => {
    if (!validationResult || !onImport) return;

    const rowsToImport = skipInvalid
      ? validationResult.validRows.map((v) => v.row)
      : parsedData.rows;

    if (rowsToImport.length === 0) {
      message.warning("No valid records to import.");
      return;
    }

    try {
      setIsImporting(true);
      setImportProgress(25);
      await onImport(rowsToImport, parsedData.rows);
      setImportProgress(100);
      message.success(`Successfully imported ${rowsToImport.length} ${entityTitle.toLowerCase()}!`);
      onSuccess?.();
      handleClose();
    } catch (err) {
      message.error(err?.response?.data?.message || err?.message || "Import failed. Please check your data format.");
    } finally {
      setIsImporting(false);
    }
  };

  // Preview table columns (first 4-6 columns for compactness)
  const previewColumns = columns.slice(0, 6).map((col) => ({
    title: (
      <span>
        {col.label || col.title || col.key}
        {col.required && <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>}
      </span>
    ),
    dataIndex: col.key || col.dataIndex,
    key: col.key || col.dataIndex,
    ellipsis: true,
    render: (val) => String(val || "-"),
  }));

  const validCount = validationResult?.validRows?.length || 0;
  const invalidCount = validationResult?.invalidRows?.length || 0;
  const totalCount = parsedData?.rows?.length || 0;

  return (
    <Modal
      title={
        <Space align="center">
          <FileExcelOutlined style={{ color: "#10B981", fontSize: 18 }} />
          <span>Import {entityTitle} (CSV)</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={720}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={isImporting}>
          Cancel
        </Button>,
        <Button
          key="import"
          type="primary"
          icon={<UploadOutlined />}
          onClick={handlePerformImport}
          loading={isImporting}
          disabled={!parsedData || totalCount === 0 || (skipInvalid && validCount === 0)}
          style={{ background: "#0891B2", borderColor: "#0891B2" }}
        >
          {isImporting
            ? "Importing..."
            : `Import ${skipInvalid ? validCount : totalCount} Records`}
        </Button>,
      ]}
      styles={{ body: { maxHeight: "75vh", overflowY: "auto", paddingRight: 8 } }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Step 1: Download Template */}
        <div
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Text strong style={{ fontSize: 13, display: "block" }}>
              1. Download CSV Template
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Get the official CSV template with correct headers and sample format.
            </Text>
          </div>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
            style={{ borderColor: "#0891B2", color: "#0891B2" }}
          >
            Download Sample CSV
          </Button>
        </div>

        {/* Step 2: Upload CSV */}
        <div>
          <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
            2. Upload Your CSV File
          </Text>
          <Dragger
            name="file"
            multiple={false}
            accept=".csv,text/csv,text/plain"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleFileChange}
            onRemove={() => resetState()}
            showUploadList={true}
            style={{
              padding: "16px 0",
              background: "#F0F9FB",
              borderColor: "#0891B2",
              borderRadius: 8,
            }}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 6 }}>
              <InboxOutlined style={{ color: "#0891B2", fontSize: 32 }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>
              Click or drag CSV file to this area to upload
            </p>
            <p className="ant-upload-hint" style={{ fontSize: 11, color: "#64748B", margin: 0 }}>
              Supports CSV files formatted with standard comma delimiters.
            </p>
          </Dragger>
        </div>

        {/* Progress bar during active import */}
        {isImporting && (
          <div>
            <Text style={{ fontSize: 12 }}>Importing records into database...</Text>
            <Progress percent={importProgress} status="active" strokeColor="#0891B2" />
          </div>
        )}

        {/* Step 3: Validation & Preview */}
        {validationResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <Text strong style={{ fontSize: 13 }}>
                3. Data Validation & Preview
              </Text>
              <Space size={6}>
                <Tag color="blue">{totalCount} Total Rows</Tag>
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  {validCount} Valid
                </Tag>
                {invalidCount > 0 && (
                  <Tag color="error" icon={<ExclamationCircleOutlined />}>
                    {invalidCount} Issues
                  </Tag>
                )}
              </Space>
            </div>

            {/* Error summary */}
            {invalidCount > 0 && (
              <Alert
                type="warning"
                showIcon
                message={
                  <div style={{ fontSize: 12 }}>
                    <span>{invalidCount} rows have validation warnings. </span>
                    <Checkbox
                      checked={skipInvalid}
                      onChange={(e) => setSkipInvalid(e.target.checked)}
                      style={{ marginLeft: 8, fontSize: 12 }}
                    >
                      Skip invalid rows and import {validCount} valid records
                    </Checkbox>
                  </div>
                }
                description={
                  <div style={{ maxHeight: 60, overflowY: "auto", fontSize: 11, marginTop: 4 }}>
                    {validationResult.invalidRows.slice(0, 3).map((err, i) => (
                      <div key={i}>
                        Row {err.rowNum}: {err.errors.join(", ")}
                      </div>
                    ))}
                    {invalidCount > 3 && <div>...and {invalidCount - 3} more rows with issues</div>}
                  </div>
                }
              />
            )}

            {/* Table Preview */}
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 6, overflow: "hidden" }}>
              <Table
                size="small"
                columns={previewColumns}
                dataSource={parsedData.rows.slice(0, 5).map((r, i) => ({ ...r, key: i }))}
                pagination={false}
                scroll={{ x: true }}
              />
              {totalCount > 5 && (
                <div style={{ padding: "4px 8px", background: "#F8FAFC", fontSize: 11, color: "#64748B", textAlign: "right" }}>
                  Showing first 5 of {totalCount} records
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
