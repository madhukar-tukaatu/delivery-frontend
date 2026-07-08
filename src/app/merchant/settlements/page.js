'use client';
import { SimpleTablePage, StatusTag } from '@/components/PageTools';
export default function ListPage(){const columns=[{title:'Number',dataIndex:'settlement_number'},{title:'COD',dataIndex:'total_cod_collected'},{title:'Payable',dataIndex:'final_payable_amount'},{title:'Status',dataIndex:'status',render:v=><StatusTag value={v}/>}];return <SimpleTablePage title="Merchant Settlements" endpoint="/merchant/settlements" columns={columns}/>;}
