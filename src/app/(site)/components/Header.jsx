"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  X,
  Truck,
  Calculator,
  PackageSearch,
  Building2,
  Info,
  Headphones,
  ArrowRight,
  Phone,
  Mail,
  ChevronRight,
  Search,
} from "lucide-react";
import styles from "./Header.module.css";

const navItems = [
  { href: "/services", label: "Services", subtitle: "Express delivery & business logistics", icon: Truck },
  { href: "/pricing", label: "Pricing", subtitle: "Instant rate calculator across Nepal", icon: Calculator },
  { href: "/tracking", label: "Track Parcel", subtitle: "Real-time delivery milestones", icon: PackageSearch },
  { href: "/franchise", label: "Franchise", subtitle: "Partner with Tukaatu in your district", icon: Building2 },
  { href: "/about", label: "About", subtitle: "Our network, promise and team", icon: Info },
  { href: "/contact", label: "Contact", subtitle: "Customer care & pickup booking", icon: Headphones },
];

export default function Header({ transparent = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [quickTrack, setQuickTrack] = useState("");
  const menuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  function handleQuickTrack(e) {
    e.preventDefault();
    const val = quickTrack.trim();
    if (!val) return;
    setOpen(false);
    router.push(`/tracking?tracking=${encodeURIComponent(val)}`);
  }

  const isTransparent = transparent && !scrolled;

  return (
    <>
      <header
        className={[
          styles.header,
          transparent ? styles.fixed : styles.sticky,
          isTransparent ? styles.clear : styles.solid,
        ].join(" ")}
      >
        <Link href="/" className={styles.logo}>
          <Image
            src="/images/logo.png"
            alt="Tukaatu Express"
            width={140}
            height={40}
            className={styles.logoImg}
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav id="primary-navigation" aria-label="Main navigation" className={styles.nav}>
          <Link href="/services">Services</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/franchise">Franchise</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        <div className={styles.actions}>
          <Link href="/login" className={styles.track}>Login →</Link>
        </div>

        {/* Mobile Hamburger Trigger */}
        <button
          type="button"
          className={styles.menu}
          onClick={() => setOpen((v) => !v)}
          ref={menuRef}
          aria-expanded={open}
          aria-controls="mobile-navigation-drawer"
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          <span className={open ? styles.bar1open : ""} />
          <span className={open ? styles.bar2open : ""} />
          <span className={open ? styles.bar3open : ""} />
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {open && (
        <div
          className={styles.drawerBackdrop}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="mobile-navigation-drawer"
        className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}
        aria-label="Mobile Navigation Drawer"
      >
        <div className={styles.drawerHeader}>
          <Link href="/" onClick={() => setOpen(false)} className={styles.drawerLogo}>
            <Image
              src="/images/logo.png"
              alt="Tukaatu Express"
              width={124}
              height={36}
              className={styles.drawerLogoImg}
            />
          </Link>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Track Input */}
        <form onSubmit={handleQuickTrack} className={styles.drawerTrackForm}>
          <Search size={16} className={styles.drawerTrackIcon} />
          <input
            type="text"
            placeholder="Track your parcel..."
            value={quickTrack}
            onChange={(e) => setQuickTrack(e.target.value)}
            className={styles.drawerTrackInput}
            autoComplete="off"
          />
          <button type="submit" className={styles.drawerTrackBtn} aria-label="Track parcel">
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Navigation Links */}
        <div className={styles.drawerList}>
          {navItems.map(({ href, label, subtitle, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={styles.drawerItem}
            >
              <div className={styles.drawerItemIcon}>
                <Icon size={18} />
              </div>
              <div className={styles.drawerItemText}>
                <strong>{label}</strong>
                <small>{subtitle}</small>
              </div>
              <ChevronRight size={16} className={styles.drawerItemArrow} />
            </Link>
          ))}
        </div>

        {/* Merchant Card */}
        <div className={styles.drawerMerchant}>
          <div className={styles.drawerMerchantBadge}>MERCHANT PORTAL</div>
          <h4>Partner with Tukaatu</h4>
          <p>Next-day settlement, automated pickups and live shipment dashboard.</p>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className={styles.drawerMerchantBtn}
          >
            Merchant Login <ArrowRight size={15} />
          </Link>
        </div>

        {/* Direct Contact Shortcuts */}
        <div className={styles.drawerSupport}>
          <span className={styles.drawerSupportTitle}>SUPPORT & HELP</span>
          <div className={styles.drawerSupportButtons}>
            <a href="tel:+977014444444" className={styles.drawerSupportBtn}>
              <Phone size={14} /> Call Hub
            </a>
            <a href="mailto:hello@tukaatuexpress.com" className={styles.drawerSupportBtn}>
              <Mail size={14} /> Email Team
            </a>
          </div>
        </div>

        <div className={styles.drawerFooter}>
          <p>Tukaatu Express • Built for Nepal</p>
        </div>
      </aside>
    </>
  );
}
