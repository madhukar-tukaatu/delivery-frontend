// app/layout.js
// import "./globals.css";

export const metadata = {
  title: "Tukaatu Express | Courier Delivery Across Nepal",
  description: "Fast, reliable courier delivery, real-time tracking, and merchant delivery management in Nepal.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}