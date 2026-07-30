// app/layout.js
// import "./globals.css";

export const metadata = {
  title: "Tukaatu Express | Courier Delivery Across Nepal",
  description: "Fast, reliable courier delivery, real-time tracking, and merchant delivery management in Nepal.",
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
      <body>{children}</body>
    </html>
  );
}