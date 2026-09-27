"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
  PackageSearch,
  Truck,
} from "lucide-react";
import styles from "./CinematicHero.module.css";

const scenes = [
  {
    file: "order",
    title: "It starts with a click.",
    label: "Customer order",
    description:
      "A customer finds something they love. One order sets the journey in motion.",
  },
  {
    file: "store",
    title: "An order becomes a parcel.",
    label: "Order received by store",
    description:
      "The store receives the order, packs it with care and gets it ready for pickup.",
  },
  {
    file: "pickup",
    title: "A handover. A promise.",
    label: "Courier picks up",
    description:
      "Our courier collects the parcel. From here, every handover brings it closer.",
  },
  {
    file: "origin",
    title: "The journey takes shape.",
    label: "Origin branch",
    description:
      "At the origin branch, the parcel is scanned, sorted and prepared for its route.",
  },
  {
    file: "transport",
    title: "Across the roads of Nepal.",
    label: "Transport",
    description:
      "Between towns and through the hills, your parcel travels toward its destination.",
  },
  {
    file: "destination",
    title: "Closer with every stop.",
    label: "Destination branch",
    description:
      "The local team receives the parcel and prepares it for the final stretch.",
  },
  {
    file: "rider",
    title: "One last ride.",
    label: "Rider delivers",
    description:
      "A delivery rider sets off through the neighbourhood with your parcel on board.",
  },
  {
    file: "door",
    title: "A parcel. A happy doorstep.",
    label: "Customer’s door",
    description:
      "From a customer’s click to the customer’s door. The journey comes full circle.",
  },
];

export default function CinematicHero() {
  const root = useRef(null);
  const frames = useRef([]);
  const redirected = useRef(false);
  const [active, setActive] = useState(0);
  const [tracking, setTracking] = useState("");
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  function scrollToSlide(targetIndex) {
    if (!root.current) return;
    const clamped = Math.max(0, Math.min(scenes.length - 1, targetIndex));
    const rect = root.current.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const rootTop = scrollY + rect.top;
    const total = Math.max(1, rect.height - window.innerHeight);
    const targetProgress = clamped === 0 ? 0 : (clamped + 0.15) / 7.8;
    const targetY = rootTop + targetProgress * total;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }

  function prevSlide() {
    scrollToSlide(active - 1);
  }

  function nextSlide() {
    scrollToSlide(active + 1);
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.target &&
        (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        scrollToSlide(active + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        scrollToSlide(active - 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active]);

  useEffect(() => {
    setLoaded(true);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    function update() {
      frame = 0;
      if (!root.current || media.matches) return;
      const rect = root.current.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight);
      const progress = media.matches
        ? 0
        : Math.min(1, Math.max(0, -rect.top / total));
      const position = progress * 7.8;
      const index = Math.min(7, Math.floor(position));
      const fraction = position - index;
      frames.current.forEach((el, i) => {
        if (!el) return;
        const local = Math.max(0, Math.min(1, position - i));
        const fade =
          i === index
            ? 1
            : i === index + 1
            ? Math.max(0, (fraction - 0.68) / 0.32)
            : 0;
        el.style.opacity = String(fade);
        el.style.zIndex = String(i);
        el.style.transform = `scale(${1.025 + local * 0.085}) translate3d(${
          (local - 0.5) * (i % 2 ? 1.8 : -1.8)
        }%,0,0)`;
        el.style.visibility = fade > 0 ? "visible" : "hidden";
      });
      setActive(index);
      if (progress >= 0.995 && !redirected.current) {
        redirected.current = true;
        router.replace("/services", { scroll: true });
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const preference = () => {
      update();
    };
    preference();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", preference);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", preference);
    };
  }, [router]);

  function track(event) {
    event.preventDefault();
    const value = tracking.trim();
    if (!value) {
      event.currentTarget.elements.tracking.setCustomValidity(
        "Enter a tracking number."
      );
      event.currentTarget.elements.tracking.reportValidity();
      return;
    }
    router.push(`/tracking?tracking=${encodeURIComponent(value)}`);
  }

  const scene = scenes[active];

  return (
    <section
      ref={root}
      id="how-it-works"
      className={styles.story}
      aria-label="From a customer’s order to their door"
    >
      <div className={styles.screen}>
        <div className={styles.film} aria-hidden="true">
          {scenes.map((item, i) => (
            <div
              key={item.file}
              ref={(el) => (frames.current[i] = el)}
              className={styles.frame}
              style={{
                opacity: i === 0 ? 1 : 0,
                visibility: i === 0 ? "visible" : "hidden",
              }}
            >
              {(i === 0 || loaded) && (
                <img
                  src={`/images/experience/cinematic/${item.file}.webp`}
                  alt=""
                  width="1600"
                  height="900"
                  fetchPriority={i === 0 ? "high" : "low"}
                  decoding="async"
                  onLoad={i === 0 ? () => setLoaded(true) : undefined}
                  onError={i === 0 ? () => setLoaded(true) : undefined}
                />
              )}
            </div>
          ))}
        </div>

        <div className={styles.wash} />

        {/* Floating Side Slide Arrows */}
        <button
          type="button"
          onClick={prevSlide}
          disabled={active === 0}
          aria-label="Previous slide"
          className={`${styles.slideArrow} ${styles.slideArrowPrev}`}
        >
          <ChevronLeft size={26} strokeWidth={2.2} />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          disabled={active === scenes.length - 1}
          aria-label="Next slide"
          className={`${styles.slideArrow} ${styles.slideArrowNext}`}
        >
          <ChevronRight size={26} strokeWidth={2.2} />
        </button>

        <div className={styles.topline}>
          <span>
            <i /> BUILT IN NEPAL. MOVING NEPAL.
          </span>
          <Link href="/services">
            Skip story <ArrowRight size={14} />
          </Link>
        </div>

        <div className={styles.copy}>
          <div className={styles.chapterHeader}>
            <p className={styles.chapter}>
              0{active + 1} <span>/ 08</span> <b>{scene.label}</b>
            </p>
            <div className={styles.slideArrowGroup}>
              <button
                type="button"
                onClick={prevSlide}
                disabled={active === 0}
                aria-label="Previous slide"
                className={styles.miniSlideArrow}
              >
                <ChevronLeft size={16} strokeWidth={2.4} />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                disabled={active === scenes.length - 1}
                aria-label="Next slide"
                className={styles.miniSlideArrow}
              >
                <ChevronRight size={16} strokeWidth={2.4} />
              </button>
            </div>
          </div>

          {active === 0 ? (
            <h1>
              Every parcel.
              <br />
              <em>
                Anywhere
                <br className={styles.desktopBreak} /> in Nepal.
              </em>
            </h1>
          ) : (
            <h2 key={scene.file}>{scene.title}</h2>
          )}

          <p className={styles.description}>
            {active === 0
              ? "Fast, trackable delivery for people and growing businesses."
              : scene.description}
          </p>

          <div className={styles.filmHint}>
            <ArrowDown size={16} />
            <span>
              {active === 7
                ? "Delivered. Continue scrolling to our services."
                : "Scroll or use arrows to slide through the story"}
            </span>
          </div>
        </div>

        <div className={styles.sceneCaption}>
          <span>ORDER TO DOOR</span>
          <strong>{scene.title}</strong>
          <small>Illustrative Nepal delivery story</small>
        </div>

        <div className={styles.dock}>
          <div className={styles.actions}>
            <form onSubmit={track} aria-label="Track a parcel">
              <div className={styles.formHeading}>
                <label htmlFor="cinema-tracking">
                  <PackageSearch size={21} /> Track your parcel
                </label>
                <span className={styles.assurance}>
                  <i /> Live updates
                </span>
              </div>
              <div className={styles.trackField}>
                <Search size={19} aria-hidden="true" />
                <input
                  id="cinema-tracking"
                  name="tracking"
                  value={tracking}
                  onChange={(e) => {
                    e.target.setCustomValidity("");
                    setTracking(e.target.value);
                  }}
                  required
                  maxLength={100}
                  autoComplete="off"
                  placeholder="Your tracking number"
                />
                <button type="submit">
                  Track parcel <ArrowRight size={17} />
                </button>
              </div>
            </form>
            <div className={styles.sendActions}>
              <span>SENDING SOMETHING?</span>
              <div className={styles.links}>
                <Link href="/pricing">
                  Get a quote <ArrowRight size={16} />
                </Link>
                <Link href="/contact">
                  <Truck size={17} /> Book a pickup
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
