'use client';
import { SimpleTablePage } from '@/components/PageTools';
export default function ApiLogsPage(){const columns=[{title:'Merchant',dataIndex:'merchant_id'},{title:'Endpoint',dataIndex:'endpoint'},{title:'Method',dataIndex:'method'},{title:'Status',dataIndex:'status_code'},{title:'IP',dataIndex:'ip_address'},{title:'Created',dataIndex:'created_at'}];return <SimpleTablePage title="Gateway API Logs" endpoint="/admin/api-logs" columns={columns}/>;}
