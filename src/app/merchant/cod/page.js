'use client';
import { SimpleTablePage, StatusTag } from '@/components/PageTools';
export default function ListPage(){const columns=[{title:'Shipment ID',dataIndex:'shipment_id'},{title:'POD Amount',dataIndex:'pod_amount'},{title:'Collected',dataIndex:'collected_amount'},{title:'Status',dataIndex:'status',render:v=><StatusTag value={v}/>}];return <SimpleTablePage title="Merchant POD" endpoint="/merchant/pod" columns={columns}/>;}
