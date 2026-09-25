'use client';
import { Button, Card, Form, Input, Timeline, Typography, Alert } from 'antd';
import { useState } from 'react';
import api from '@/lib/api';
import Header from '../(site)/components/Header';
import Footer from '../(site)/components/Footer';
import PublicHero from '../(site)/components/PublicHero';
import '../(site)/public-pages.css';
export default function TrackPage() {
  const [result,setResult]=useState(null);const [error,setError]=useState(null);const [loading,setLoading]=useState(false);
  async function submit(values) {
    setError(null);setResult(null);setLoading(true);
    try {const res=await api.get(`/public/track/${encodeURIComponent(values.tracking_number.trim())}`);setResult(res.data.data);}
    catch(err) {setError(err?.response?.data?.message||'We could not find that parcel. Check your tracking number and try again.');}
    finally {setLoading(false);}
  }
  return <div className="public-site"><Header /><main className="public-page">
    <PublicHero compact eyebrow="Track a parcel" title="Your parcel’s journey." accent="All in one place." description="Enter your tracking number for the latest status and delivery updates." />
    <section className="public-form-section"><div><Card>
      <Form layout="vertical" onFinish={submit}><Form.Item label="Tracking number" name="tracking_number" rules={[{required:true,whitespace:true,message:'Enter a tracking number.'}]}><Input size="large" placeholder="Enter tracking number" autoComplete="off" /></Form.Item><Button type="primary" htmlType="submit" loading={loading} size="large">Track parcel</Button></Form>
      {error && <Alert style={{marginTop:24}} type="error" showIcon message={error} />}
      {result && <div style={{marginTop:24}}><Typography.Title level={2}>{result.tracking_number}</Typography.Title><Typography.Paragraph>Status: <strong>{result.status}</strong></Typography.Paragraph><Timeline items={(result.events||[]).map(e=>({children:`${e.status} - ${e.description||''} (${e.created_at})`}))} /></div>}
    </Card></div></section>
  </main><Footer showCta={false} /></div>;
}
