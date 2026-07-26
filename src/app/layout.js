import { AntdRegistry } from '@ant-design/nextjs-registry';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata = {
  title: 'Courier Delivery Gateway',
  description: 'Courier delivery gateway and operations system',
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
    <html lang="en">
      <body>
        <AntdRegistry
          theme={{
            token: {
              colorPrimary: '#027196',
              colorLink: '#027196',
              borderRadius: 10,
              fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
            },
            components: {
              Menu: {
                darkItemBg: '#071722',
                darkSubMenuItemBg: '#0a1f2e',
                darkItemSelectedBg: '#027196',
                darkItemHoverBg: 'rgba(2,113,150,0.18)',
              },
              Layout: {
                siderBg: '#071722',
                headerBg: '#ffffff',
              },
            },
          }}
        >
          {children}
        </AntdRegistry>
      </body>
    </html>
  );
}
