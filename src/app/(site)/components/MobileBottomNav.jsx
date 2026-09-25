"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PackageSearch, Truck, Calculator, Headphones } from "lucide-react";
import styles from "./MobileBottomNav.module.css";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tracking", label: "Track", icon: PackageSearch },
  { href: "/services", label: "Services", icon: Truck },
  { href: "/pricing", label: "Rates", icon: Calculator },
  { href: "/contact", label: "Support", icon: Headphones },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNav} aria-label="Mobile Navigation">
      <div className={styles.inner}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.tab} ${isActive ? styles.active : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className={styles.iconWrapper}>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                {isActive && <span className={styles.activeDot} />}
              </div>
              <span className={styles.label}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
