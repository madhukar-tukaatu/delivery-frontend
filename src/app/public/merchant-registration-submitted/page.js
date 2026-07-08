import { Card, Result } from 'antd';

export default function MerchantRegistrationSubmittedPage() {
  return (
    <div style={{ maxWidth: 800, margin: '60px auto', padding: 16 }}>
      <Card>
        <Result
          status="success"
          title="Registration submitted"
          subTitle="Your merchant account is pending document verification. You will be able to create shipments after super admin approval."
        />
      </Card>
    </div>
  );
}
