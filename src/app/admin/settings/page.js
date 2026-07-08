'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { Button, Card, Form, Input, SimpleTablePage, message } from '@/components/PageTools';
export default function SettingsPage(){const[refresh,setRefresh]=useState(0);async function submit(values){await api.post('/admin/settings',values);message.success('Saved');setRefresh(Date.now());}const columns=[{title:'Key',dataIndex:'key'},{title:'Value',dataIndex:'value'},{title:'Type',dataIndex:'type'}];return <><Card style={{marginBottom:16}} title="Add / Update Setting"><Form layout="inline" onFinish={submit}><Form.Item name="key" rules={[{required:true}]}><Input placeholder="key"/></Form.Item><Form.Item name="value"><Input placeholder="value"/></Form.Item><Button type="primary" htmlType="submit">Save</Button></Form></Card><SimpleTablePage title="Settings" endpoint="/admin/settings" columns={columns} reloadKey={refresh}/></>;}
