'use client';
import { SimpleTablePage, StatusTag } from '@/components/PageTools';
export default function ListPage(){const columns=[{title:'Invoice',dataIndex:'invoice_number'},{title:'Merchant ID',dataIndex:'merchant_id'},{title:'Type',dataIndex:'type'},{title:'Total',dataIndex:'total_amount'},{title:'Status',dataIndex:'status',render:v=><StatusTag value={v}/>}];return <SimpleTablePage title="Invoices" endpoint="/admin/invoices" columns={columns}/>;}
