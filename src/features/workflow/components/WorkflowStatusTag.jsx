'use client';

import { Tag } from 'antd';
import { colorForStatus, labelForStatus } from '@/config/workflowStatus';

export default function WorkflowStatusTag({ status }) {
  return <Tag color={colorForStatus(status)}>{labelForStatus(status)}</Tag>;
}
