import { AntdRegistry } from '@ant-design/nextjs-registry';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata = {
  title: 'Courier Delivery Gateway',
  description: 'Courier delivery gateway and operations system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
