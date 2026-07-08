'use client';

import { useState } from 'react';
import { Alert, Button, Card, Space, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { syncAccessPermissions } from '@/services/accessSyncService';

const { Title, Paragraph, Text } = Typography;

export default function AccessSyncPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const data = await syncAccessPermissions();
      setResult(data);
      message.success(data?.message || 'Permissions synced successfully.');
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Permission sync failed.';
      message.error(msg);
      setResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Title level={3}>Permission Sync</Title>
        <Paragraph>
          Use this after adding new protected backend routes. It scans named admin, merchant and staff routes,
          creates missing permissions, refreshes Super Admin permissions and clears permission cache.
        </Paragraph>

        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={handleSync}
        >
          Sync Permissions Now
        </Button>
      </Card>

      {result && (
        <Alert
          type={result.success === false ? 'error' : 'success'}
          showIcon
          message={result.message || 'Sync completed'}
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              {typeof result.total_permissions !== 'undefined' && (
                <Text>Total permissions: {result.total_permissions}</Text>
              )}
              {result.console_output && (
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{result.console_output}</pre>
              )}
            </Space>
          }
        />
      )}
    </Space>
  );
}
