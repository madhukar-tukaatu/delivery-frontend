'use client';
import { SimpleTablePage, StatusTag } from '@/components/PageTools';
export default function ListPage(){const columns=[{title:'Shipment ID',dataIndex:'shipment_id'},{title:'Staff ID',dataIndex:'delivery_staff_id'},{title:'Date',dataIndex:'assigned_date'},{title:'Status',dataIndex:'status',render:v=><StatusTag value={v}/>}];return <SimpleTablePage title="Delivery Assignments" endpoint="/admin/deliveries" columns={columns}/>;}
