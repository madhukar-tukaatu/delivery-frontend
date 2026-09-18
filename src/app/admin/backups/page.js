'use client';
import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, Table, Space, Popconfirm, Typography, message, Modal, Badge } from 'antd';
import { DownloadOutlined, DeleteOutlined, ReloadOutlined, MailOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function BackupsPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState('');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    fetchBackups();
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
    // Download via API endpoint
    const link = document.createElement('a');
    link.href = `/api/v1/admin/backups/${filename}`;
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

  return (
    <Card>
      <Title level={3} style={{ marginBottom: 24 }}>
        Database Backup
      </Title>

      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
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

      <Table
        columns={columns}
        dataSource={backups}
        rowKey="filename"
        pagination={{ pageSize: 10 }}
        loading={refreshing}
      />

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
