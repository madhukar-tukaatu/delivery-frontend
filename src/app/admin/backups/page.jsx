'use client';
import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, Table, Space, Popconfirm, Typography, message, Modal, Badge, Switch, TimePicker, Tabs } from 'antd';
import { DownloadOutlined, DeleteOutlined, ReloadOutlined, MailOutlined, ExclamationCircleOutlined, ScheduleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';
import { InputNumber } from '@/components/PageTools';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export default function BackupsPage() {
  const [backups, setBackups] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(7);
  const [activeTab, setActiveTab] = useState('1');

  useEffect(() => {
    fetchBackups();
    fetchSchedules();
  }, []);

  async function fetchBackups() {
    setRefreshing(true);
    try {
      const response = await api.get('/admin/backups');
      setBackups(response.data.data.backups || []);
    } catch (error) {
      message.error('Failed to load backups');
    } finally {
      setRefreshing(false);
    }
  }

  async function fetchSchedules() {
    try {
      const response = await api.get('/admin/backups/schedules');
      setSchedules(response.data.data.schedules || []);
    } catch (error) {
      // Schedules table might not exist yet
      setSchedules([]);
    }
  }

  async function handleCreateBackup() {
    setLoading(true);
    try {
      await api.post('/admin/backups', { email: null });
      message.success('Backup created successfully');
      await fetchBackups();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  }

  async function handleBackupWithEmail() {
    if (!email) {
      message.warning('Please enter an email address');
      return;
    }
    
    setEmailLoading(true);
    try {
      await api.post('/admin/backups', { email });
      message.success('Backup created and sent to ' + email);
      setEmailModalOpen(false);
      setEmail('');
      await fetchBackups();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create backup');
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleTriggerBackup(type) {
    setLoading(true);
    try {
      await api.post('/admin/backups/trigger', { type });
      message.success(`Backup created: ${type}`);
      await fetchBackups();
      await fetchSchedules();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateSchedule(id, updates) {
    try {
      await api.put(`/admin/backups/schedules/${id}`, updates);
      message.success('Schedule updated');
      await fetchSchedules();
    } catch (error) {
      message.error('Failed to update schedule');
    }
  }

  async function handleCleanupBackups() {
    setCleanupLoading(true);
    try {
      await api.post('/admin/backups/cleanup', { days: cleanupDays });
      message.success(`Backups older than ${cleanupDays} days cleaned up`);
      await fetchBackups();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to cleanup backups');
    } finally {
      setCleanupLoading(false);
    }
  }

  async function handleDelete(filename) {
    try {
      await api.delete(`/admin/backups/${filename}`);
      message.success('Backup deleted');
      await fetchBackups();
    } catch (error) {
      message.error('Failed to delete backup');
    }
  }

  function handleDownload(filename) {
    const baseUrl = typeof window !== 'undefined' 
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.tukaatuexpress.com/api/v1')
      : 'https://api.tukaatuexpress.com/api/v1';
    const link = document.createElement('a');
    link.href = `${baseUrl}/admin/backups/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const columns = [
    {
      title: 'Backup File',
      dataIndex: 'filename',
      key: 'filename',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: 'Size',
      dataIndex: 'size_formatted',
      key: 'size_formatted',
    },
    {
      title: 'Created',
      dataIndex: 'created_at_formatted',
      key: 'created_at_formatted',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={() => handleDownload(record.filename)}
            size="small"
          >
            Download
          </Button>
          <Popconfirm
            title="Delete backup?"
            description="Are you sure you want to delete this backup?"
            onConfirm={() => handleDelete(record.filename)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              icon={<DeleteOutlined />} 
              danger 
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const scheduleColumns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (text) => <Text strong>{text.toUpperCase()}</Text>,
    },
    {
      title: 'Schedule',
      key: 'schedule',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text>{record.cron_time || '02:00'}</Text>
          {record.cron_day && <Text type="secondary">{record.cron_day}</Text>}
          {record.cron_day_of_month && <Text type="secondary">Day {record.cron_day_of_month}</Text>}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'enabled',
      render: (_, record) => (
        <Switch 
          checked={record.enabled} 
          onChange={(checked) => handleUpdateSchedule(record.id, { enabled: checked })}
          size="small"
        />
      ),
    },
    {
      title: 'Last Run',
      dataIndex: 'last_run_at',
      key: 'last_run_at',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : 'Never',
    },
    {
      title: 'Next Run',
      dataIndex: 'next_run_at',
      key: 'next_run_at',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          icon={<PlayCircleOutlined />} 
          onClick={() => handleTriggerBackup(record.type)}
          loading={loading}
          size="small"
          disabled={!record.enabled}
        >
          Run Now
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <Title level={3} style={{ marginBottom: 24 }}>
        Database Backup
      </Title>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Backups" key="1">
          <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button 
              type="primary" 
              icon={<MailOutlined />} 
              onClick={() => setEmailModalOpen(true)}
              loading={loading}
            >
              Create Backup & Email
            </Button>

            <Button 
              onClick={handleCreateBackup}
              loading={loading}
            >
              Create Backup Only
            </Button>

            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchBackups}
              loading={refreshing}
            >
              Refresh
            </Button>
          </div>

          <Card title="Cleanup Configuration" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ marginRight: 8 }}>Keep backups for (days):</label>
                <InputNumber
                  min={1}
                  max={365}
                  value={cleanupDays}
                  onChange={(value) => setCleanupDays(value || 7)}
                  style={{ width: 100 }}
                />
              </div>
              <Button 
                type="primary" 
                danger 
                icon={<ExclamationCircleOutlined />}
                onClick={handleCleanupBackups}
                loading={cleanupLoading}
              >
                Delete Backups Older Than {cleanupDays} Days
              </Button>
            </div>
            <p style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
              This will permanently delete backup files older than the specified number of days.
            </p>
          </Card>

          <Table
            columns={columns}
            dataSource={backups}
            rowKey="filename"
            pagination={{ pageSize: 10 }}
            loading={refreshing}
          />
        </TabPane>

        <TabPane tab="Backup Schedules" key="2">
          <div style={{ marginBottom: 24 }}>
            <Card title="Scheduled Backups">
              <Table
                columns={scheduleColumns}
                dataSource={schedules}
                rowKey="id"
                pagination={false}
                loading={refreshing}
              />
            </Card>
            <div style={{ marginTop: 16, fontSize: 13, color: '#6b7280' }}>
              <p><strong>Daily:</strong> Runs at {schedules.find(s => s.type === 'daily')?.cron_time || '02:00'} every day</p>
              <p><strong>Weekly:</strong> Runs at {schedules.find(s => s.type === 'weekly')?.cron_time || '03:00'} on Sunday</p>
              <p><strong>Monthly:</strong> Runs at {schedules.find(s => s.type === 'monthly')?.cron_time || '04:00'} on 1st of each month</p>
            </div>
          </div>
        </TabPane>
      </Tabs>

      <Modal
        title="Create Backup & Email"
        open={emailModalOpen}
        onCancel={() => setEmailModalOpen(false)}
        footer={null}
      >
        <p style={{ marginBottom: 16 }}>
          Enter the email address where you'd like to receive the backup file.
        </p>
        <Form layout="vertical">
          <Form.Item label="Email Address">
            <Input
              placeholder="Enter recipient email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              suffix={<Text type="secondary">Backup will be attached as .sql file</Text>}
            />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button 
              type="primary" 
              onClick={handleBackupWithEmail}
              loading={emailLoading}
            >
              Create & Send
            </Button>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}
