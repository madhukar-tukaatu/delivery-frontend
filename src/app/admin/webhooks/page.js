'use client';
import api from '@/lib/api';
import { Button, SimpleTablePage, StatusTag, message } from '@/components/PageTools';
export default function WebhookLogsPage(){const columns=[{title:'Event',dataIndex:'event'},{title:'URL',dataIndex:'webhook_url'},{title:'Status',dataIndex:'status',render:v=><StatusTag value={v}/>},{title:'Attempts',dataIndex:'attempt_count'},{title:'Response',dataIndex:'response_status_code'},{title:'Action',render:(_,r)=><Button size="small" onClick={()=>api.post(`/admin/webhook-logs/${r.id}/retry`).then(()=>message.success('Retry sent'))}>Retry</Button>}];return <SimpleTablePage title="Webhook Logs" endpoint="/admin/webhook-logs" columns={columns}/>;}
