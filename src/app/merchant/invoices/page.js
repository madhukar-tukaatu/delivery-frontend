'use client';
import { SimpleTablePage, StatusTag } from '@/components/PageTools';
export default function MerchantInvoicesPage(){const columns=[{title:'Invoice',dataIndex:'invoice_number'},{title:'Type',dataIndex:'type'},{title:'Total',dataIndex:'total_amount'},{title:'Status',dataIndex:'status',render:v=><StatusTag value={v}/>}];return <SimpleTablePage title="Invoices" endpoint="/merchant/invoices" columns={columns}/>;}
