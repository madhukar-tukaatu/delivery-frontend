// components/Navbar.js
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full bg-white border-b border-gray-100 z-50">
      <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            T
          </div>
          <div>
            <div className="font-bold text-2xl tracking-tight">Tukaatu Express</div>
            <div className="text-[10px] text-gray-500 -mt-1">NEPAL</div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/" className="hover:text-blue-600 transition">Home</Link>
          <Link href="/services" className="hover:text-blue-600 transition">Services</Link>
          <Link href="/delivery" className="hover:text-blue-600 transition">Delivery</Link>
          <Link href="/pricing" className="hover:text-blue-600 transition">Pricing</Link>
          <Link href="/about" className="hover:text-blue-600 transition">About Us</Link>
          <Link href="/contact" className="hover:text-blue-600 transition">Contact</Link>
        </div>

        <Link
          href="/login"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
        >
          Login
        </Link>
      </div>
    </nav>
  );
}