"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./PageSlideNav.module.css";

const MAIN_SLIDES = [
  { href: "/services", label: "Services", desc: "Delivery services" },
  { href: "/pricing", label: "Pricing", desc: "Rate calculator" },
  { href: "/franchise", label: "Franchise", desc: "Partner network" },
  { href: "/about", label: "About", desc: "Our network & team" },
  { href: "/contact", label: "Contact", desc: "Pickups & support" },
];

export default function PageSlideNav() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Never render on home (story / film reels page)
  if (pathname === "/") return null;

  // Find index in MAIN_SLIDES
  let currentIndex = MAIN_SLIDES.findIndex((s) => s.href === pathname);

  // If on a sub-route (e.g. /services/info or /franchise/apply), match prefix
  if (currentIndex === -1) {
    currentIndex = MAIN_SLIDES.findIndex((s) => pathname.startsWith(s.href));
  }

  // If not found (e.g. legal pages), default to index 0
  if (currentIndex === -1) currentIndex = 0;

  const total = MAIN_SLIDES.length;
  const prevIndex = (currentIndex - 1 + total) % total;
  const nextIndex = (currentIndex + 1) % total;

  const prevSlide = MAIN_SLIDES[prevIndex];
  const nextSlide = MAIN_SLIDES[nextIndex];

  // Enable keyboard arrow navigation between pages
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.target &&
        (e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        router.push(nextSlide.href);
      } else if (e.key === "ArrowLeft") {
        router.push(prevSlide.href);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, nextSlide.href, prevSlide.href]);

  // Touch swipe listener between slides
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    function handleTouchStart(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }

    function handleTouchEnd(e) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;

      // Ensure horizontal swipe is dominant and over threshold (60px)
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) {
          // Swiped left -> Go to next slide
          router.push(nextSlide.href);
        } else {
          // Swiped right -> Go to prev slide
          router.push(prevSlide.href);
        }
      }
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [router, nextSlide.href, prevSlide.href]);

  if (!mounted) return null;

  return (
    <nav className={styles.navContainer} aria-label="Page slide navigation">
      {/* Previous Slide Arrow Button */}
      <Link
        href={prevSlide.href}
        className={`${styles.arrowBtn} ${styles.arrowLeft}`}
        aria-label={`Slide to previous page: ${prevSlide.label}`}
      >
        <ChevronLeft size={24} strokeWidth={2.4} className={styles.icon} />
        <span className={styles.labelPreview}>
          <span className={styles.arrowSymbol}>←</span> {prevSlide.label}
        </span>
      </Link>

      {/* Next Slide Arrow Button */}
      <Link
        href={nextSlide.href}
        className={`${styles.arrowBtn} ${styles.arrowRight}`}
        aria-label={`Slide to next page: ${nextSlide.label}`}
      >
        <span className={styles.labelPreview}>
          {nextSlide.label} <span className={styles.arrowSymbol}>→</span>
        </span>
        <ChevronRight size={24} strokeWidth={2.4} className={styles.icon} />
      </Link>
    </nav>
  );
}
