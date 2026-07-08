'use client';
import { Card, Statistic, Typography } from 'antd';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
export default function DashboardPage() { const [stats, setStats] = useState({}); useEffect(() => { api.get('/staff/dashboard').then((res) => setStats(res.data.data)).catch(() => {}); }, []); const items = [['Branches', stats.branches], ['Merchants', stats.merchants], ['Shipments', stats.shipments], ['Today', stats.today_shipments], ['Delivered', stats.delivered_shipments], ['Pending', stats.pending_shipments], ['COD Pending', stats.cod_pending], ['Assignments', stats.delivery_assignments]]; return <div><Typography.Title level={3}>Staff Dashboard</Typography.Title><div className="stat-grid">{items.map(([label, value]) => <Card key={label}><Statistic title={label} value={value || 0} /></Card>)}</div></div>; }
