import BrandTheme from '@/components/BrandTheme';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata = {
  title: 'Tukaatu Express',
  description: 'Tukaatu Express and operations system',
  icons: {
    icon: [
      { url: '/images/favicon.png?v=2', type: 'image/png' },
      { url: '/icon.png?v=2', type: 'image/png' },
      { url: '/favicon.ico?v=2' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: '/icon.png?v=2',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AntdRegistry><BrandTheme>{children}</BrandTheme></AntdRegistry>
      </body>
    </html>
  );
}
