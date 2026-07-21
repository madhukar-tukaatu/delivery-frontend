import { AntdRegistry } from '@ant-design/nextjs-registry';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata = {
  title: 'Courier Delivery Gateway',
  description: 'Courier delivery gateway and operations system',
  icons: {
    icon: '/images/favicon.png',
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
