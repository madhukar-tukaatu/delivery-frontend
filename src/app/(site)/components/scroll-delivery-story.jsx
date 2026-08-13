"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  House,
  MapPin,
  Package,
  Truck,
  Warehouse,
} from "lucide-react";

import styles from "./scroll-delivery-story.module.css";

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
  {
    id: "pickup",
    number: "01",
    eyebrow: "PICKUP",
    title: "We collect your parcel.",
    description:
      "From your doorstep or business location, Tukaatu starts the journey with a secure pickup.",
    icon: Package,
    location: "Kathmandu",
    color: "blue",
  },
  {
    id: "origin",
    number: "02",
    eyebrow: "ORIGIN BRANCH",
    title: "Sorted at the origin branch.",
    description:
      "Your parcel is scanned, sorted and prepared for its next movement through the network.",
    icon: Warehouse,
    location: "Kathmandu Branch",
    color: "cyan",
  },
  {
    id: "transfer",
    number: "03",
    eyebrow: "BRANCH TRANSFER",
    title: "Moving across Nepal.",
    description:
      "Our branch network connects your parcel to its destination through coordinated transfers.",
    icon: Truck,
    location: "Kathmandu → Pokhara",
    color: "purple",
  },
  {
    id: "destination",
    number: "04",
    eyebrow: "DESTINATION BRANCH",
    title: "Arrived at the destination.",
    description:
      "The parcel reaches the destination branch and is prepared for final-mile delivery.",
    icon: Warehouse,
    location: "Pokhara Branch",
    color: "green",
  },
  {
    id: "delivery",
    number: "05",
    eyebrow: "FINAL MILE",
    title: "Delivered to your door.",
    description:
      "A local rider takes over and completes the final journey to your doorstep.",
    icon: House,
    location: "Your doorstep",
    color: "green",
  },
];

function StageIcon({ stage }) {
  const Icon = stage.icon;

  return (
    <div className={styles.stageIcon}>
      <Icon size={22} strokeWidth={2} />
    </div>
  );
}

export default function ScrollDeliveryStory() {
  const sectionRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);

  const parcelRef = useRef(null);
  const parcelGlowRef = useRef(null);

  const routeProgressRef = useRef(null);

  const nodeRefs = useRef([]);
  const cardRefs = useRef([]);

  const [activeStage, setActiveStage] = useState(0);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const parcel = parcelRef.current;
    const parcelGlow = parcelGlowRef.current;
    const routeProgress = routeProgressRef.current;

    if (!section || !scene || !camera || !parcel || !routeProgress) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      const nodes = nodeRefs.current.filter(Boolean);
      const cards = cardRefs.current.filter(Boolean);

      /*
       * Initial 3D state
       */
      gsap.set(camera, {
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scale: 1,
        x: 0,
        y: 0,
        transformPerspective: 1400,
        transformOrigin: "50% 50%",
      });

      gsap.set(parcel, {
        x: 0,
        y: 0,
        z: 80,
        scale: 0.85,
        rotationY: 0,
        rotationZ: 0,
      });

      gsap.set(parcelGlow, {
        scale: 0.7,
        opacity: 0.5,
      });

      gsap.set(nodes, {
        scale: 0.8,
        opacity: 0.35,
        rotationX: 18,
      });

      gsap.set(cards, {
        opacity: 0,
        y: 60,
        rotateX: 18,
      });

      /*
       * Build one large timeline controlled by scroll.
       *
       * scrub makes the animation follow the user's scroll position.
       */
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=4200",
          scrub: 1.1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,

          onUpdate: (self) => {
            const progress = self.progress;

            let stage = Math.floor(progress * STAGES.length);

            if (stage >= STAGES.length) {
              stage = STAGES.length - 1;
            }

            setActiveStage(stage);
          },
        },
      });

      /*
       * INTRO
       */
      timeline
        .to(camera, {
          scale: 1.05,
          rotationX: 4,
          rotationY: -3,
          duration: 0.5,
          ease: "power2.out",
        })

        /*
         * STAGE 1 — PICKUP
         */
        .to(nodes[0], {
          scale: 1.15,
          opacity: 1,
          rotationX: 0,
          duration: 0.5,
          ease: "power3.out",
        })

        .to(
          parcel,
          {
            x: -300,
            y: 40,
            z: 140,
            scale: 1,
            rotationY: 360,
            duration: 1,
            ease: "power2.inOut",
          },
          "<"
        )

        .to(
          parcelGlow,
          {
            x: -300,
            y: 40,
            scale: 1.3,
            opacity: 0.9,
            duration: 1,
            ease: "power2.inOut",
          },
          "<"
        )

        .to(cards[0], {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.45,
          ease: "power3.out",
        })

        /*
         * Move camera toward origin branch
         */
        .to(
          camera,
          {
            x: -70,
            y: -20,
            rotationY: 5,
            rotationX: -2,
            scale: 1.08,
            duration: 0.7,
            ease: "power2.inOut",
          },
          "+=0.15"
        )

        .to(
          cards[0],
          {
            opacity: 0,
            y: -50,
            rotateX: -15,
            duration: 0.35,
          },
          "<"
        )

        /*
         * STAGE 2 — ORIGIN
         */
        .to(nodes[1], {
          scale: 1.15,
          opacity: 1,
          rotationX: 0,
          duration: 0.5,
          ease: "power3.out",
        })

        .to(
          parcel,
          {
            x: -120,
            y: -80,
            z: 180,
            rotationY: 720,
            scale: 1.05,
            duration: 0.9,
            ease: "power2.inOut",
          },
          "<"
        )

        .to(
          parcelGlow,
          {
            x: -120,
            y: -80,
            scale: 1.5,
            duration: 0.9,
            ease: "power2.inOut",
          },
          "<"
        )

        .to(cards[1], {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.45,
          ease: "power3.out",
        })

        /*
         * Route begins
         */
        .to(routeProgress, {
          strokeDashoffset: 0,
          duration: 1,
          ease: "none",
        })

        /*
         * STAGE 3 — TRANSFER
         */
        .to(
          camera,
          {
            x: 70,
            y: 15,
            rotationY: -7,
            rotationX: 4,
            scale: 1.12,
            duration: 0.7,
            ease: "power2.inOut",
          },
          "+=0.1"
        )

        .to(
          cards[1],
          {
            opacity: 0,
            y: -50,
            rotateX: -15,
            duration: 0.35,
          },
          "<"
        )

        .to(nodes[2], {
          scale: 1.2,
          opacity: 1,
          rotationX: 0,
          duration: 0.5,
          ease: "power3.out",
        })

        .to(
          parcel,
          {
            x: 80,
            y: 45,
            z: 260,
            scale: 1.1,
            rotationY: 1080,
            rotationZ: 12,
            duration: 1.1,
            ease: "power2.inOut",
          },
          "<"
        )

        .to(
          parcelGlow,
          {
            x: 80,
            y: 45,
            scale: 1.8,
            duration: 1.1,
            ease: "power2.inOut",
          },
          "<"
        )

        .to(cards[2], {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.45,
          ease: "power3.out",
        })

        /*
         * Strong camera movement during transfer
         */
        .to(
          camera,
          {
            x: 130,
            y: -30,
            rotationY: 10,
            rotationX: -5,
            rotationZ: -1,
            scale: 1.17,
            duration: 0.8,
            ease: "power3.inOut",
          },
          "+=0.15"
        )

        .to(
          cards[2],
          {
            opacity: 0,
            y: -60,
            rotateX: -18,
            duration: 0.35,
          },
          "<"
        )

        /*
         * STAGE 4 — DESTINATION
         */
        .to(nodes[3], {
          scale: 1.2,
          opacity: 1,
          rotationX: 0,
          duration: 0.5,
          ease: "power3.out",
        })

        .to(
          parcel,
          {
            x: 220,
            y: -35,
            z: 200,
            rotationY: 1440,
            rotationZ: 0,
            scale: 1.05,
            duration: 0.9,
            ease: "power2.inOut",
          },
          "<"
        )

        .to(
          parcelGlow,
          {
            x: 220,
            y: -35,
            scale: 1.5,
            duration: 0.9,
            ease: "power2.inOut",
          },
          "<"
        )

        .to(cards[3], {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.45,
          ease: "power3.out",
        })

        /*
         * Camera returns toward destination
         */
        .to(
          camera,
          {
            x: 100,
            y: 10,
            rotationY: -4,
            rotationX: 2,
            scale: 1.08,
            duration: 0.7,
            ease: "power2.inOut",
          },
          "+=0.1"
        )

        .to(
          cards[3],
          {
            opacity: 0,
            y: -50,
            rotateX: -15,
            duration: 0.35,
          },
          "<"
        )

        /*
         * STAGE 5 — FINAL DELIVERY
         */
        .to(nodes[4], {
          scale: 1.25,
          opacity: 1,
          rotationX: 0,
          duration: 0.5,
          ease: "power3.out",
        })

        .to(
          parcel,
          {
            x: 330,
            y: 90,
            z: 110,
            scale: 0.9,
            rotationY: 1800,
            duration: 1,
            ease: "power2.inOut",
          },
          "<"
        )

        .to(
          parcelGlow,
          {
            x: 330,
            y: 90,
            scale: 1.2,
            duration: 1,
            ease: "power2.inOut",
          },
          "<"
        )

        .to(cards[4], {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.55,
          ease: "power3.out",
        })

        /*
         * Final camera reveal
         */
        .to(
          camera,
          {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scale: 1,
            duration: 0.8,
            ease: "power3.out",
          },
          "+=0.15"
        );

      /*
       * Floating ambient animation
       */
      gsap.to(".delivery-floating", {
        y: -12,
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.2,
      });

      /*
       * Particle animation
       */
      gsap.to(".delivery-particle", {
        y: -40,
        opacity: 0.15,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.25,
      });
    }, section);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.story}>
      <div className={styles.backgroundGrid} />

      <div className={styles.glowOne} />
      <div className={styles.glowTwo} />

      {/* Floating particles */}
      <div className={`${styles.particle} delivery-particle ${styles.p1}`} />
      <div className={`${styles.particle} delivery-particle ${styles.p2}`} />
      <div className={`${styles.particle} delivery-particle ${styles.p3}`} />
      <div className={`${styles.particle} delivery-particle ${styles.p4}`} />
      <div className={`${styles.particle} delivery-particle ${styles.p5}`} />

      <div className={styles.storyInner}>
        {/* LEFT CONTENT */}
        <div className={styles.copyColumn}>
          <div className={styles.eyebrow}>
            <span className={styles.liveDot} />
            TUUKAATU DELIVERY NETWORK
          </div>

          <h2>
            One parcel.
            <br />
            <span>One connected journey.</span>
          </h2>

          <p className={styles.intro}>
            From the moment we pick up your parcel to the moment it reaches
            your doorstep, every movement is connected, tracked and visible.
          </p>

          <div className={styles.progressList}>
            {STAGES.map((stage, index) => {
              const Icon = stage.icon;

              return (
                <div
                  key={stage.id}
                  className={`${styles.progressItem} ${
                    activeStage === index ? styles.progressActive : ""
                  }`}
                >
                  <div className={styles.progressNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className={styles.progressLine}>
                    <div className={styles.progressDot}>
                      <Icon size={13} />
                    </div>
                  </div>

                  <div className={styles.progressText}>
                    <span>{stage.eyebrow}</span>
                    <strong>{stage.location}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3D SCENE */}
        <div ref={sceneRef} className={styles.scene}>
          <div className={styles.scenePerspective}>
            <div ref={cameraRef} className={styles.camera}>
              {/* Ground */}
              <div className={styles.ground}>
                <div className={styles.groundRing} />
                <div className={styles.groundRingTwo} />
              </div>

              {/* Route SVG */}
              <svg
                className={styles.routeSvg}
                viewBox="0 0 800 500"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="routeGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>

                  <filter id="routeGlow">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Shadow route */}
                <path
                  d="M 90 390 C 180 330, 160 170, 300 190 C 430 215, 430 80, 570 130 C 650 160, 620 300, 730 330"
                  className={styles.routeShadow}
                />

                {/* Main route */}
                <path
                  ref={routeProgressRef}
                  d="M 90 390 C 180 330, 160 170, 300 190 C 430 215, 430 80, 570 130 C 650 160, 620 300, 730 330"
                  className={styles.routeMain}
                  stroke="url(#routeGradient)"
                  filter="url(#routeGlow)"
                />
              </svg>

              {/* Network nodes */}
              {STAGES.map((stage, index) => (
                <div
                  key={stage.id}
                  ref={(element) => {
                    nodeRefs.current[index] = element;
                  }}
                  className={`${styles.node} delivery-floating node-${index}`}
                >
                  <div className={styles.nodePulse} />

                  <div className={styles.nodeCore}>
                    <StageIcon stage={stage} />
                  </div>

                  <div className={styles.nodeLabel}>
                    <span>{stage.number}</span>
                    {stage.location}
                  </div>
                </div>
              ))}

              {/* Parcel */}
              <div
                ref={parcelGlowRef}
                className={styles.parcelGlow}
              />

              <div
                ref={parcelRef}
                className={styles.parcel}
              >
                <div className={styles.parcelBox}>
                  <div className={styles.parcelTop} />
                  <div className={styles.parcelFront}>
                    <Package size={27} />
                  </div>
                  <div className={styles.parcelSide} />
                  <div className={styles.parcelTape} />
                </div>

                <div className={styles.parcelLabel}>
                  <span>TKT</span>
                  <strong>849251</strong>
                </div>
              </div>

              {/* Delivery card */}
              <div className={styles.liveCard}>
                <div className={styles.liveCardTop}>
                  <span className={styles.liveIndicator}>
                    <span />
                    LIVE
                  </span>

                  <span>TRACKING</span>
                </div>

                <div className={styles.liveRoute}>
                  <MapPin size={15} />
                  <span>Kathmandu</span>
                  <ArrowRight size={14} />
                  <span>Pokhara</span>
                </div>

                <div className={styles.liveMeta}>
                  <div>
                    <Clock3 size={14} />
                    <span>On route</span>
                  </div>

                  <div>
                    <CheckCircle2 size={14} />
                    <span>Tracked</span>
                  </div>
                </div>
              </div>

              {/* Stage cards */}
              {STAGES.map((stage, index) => (
                <div
                  key={stage.id}
                  ref={(element) => {
                    cardRefs.current[index] = element;
                  }}
                  className={`${styles.stageCard} stage-card-${index}`}
                >
                  <div className={styles.stageCardNumber}>
                    {stage.number}
                  </div>

                  <div className={styles.stageCardIcon}>
                    <stage.icon size={20} />
                  </div>

                  <div>
                    <span>{stage.eyebrow}</span>
                    <strong>{stage.title}</strong>
                    <p>{stage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <div className={styles.scrollHint}>
            <span>SCROLL TO MOVE THE PARCEL</span>
            <div className={styles.scrollArrow}>
              ↓
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className={styles.bottomStats}>
        <div>
          <strong>Nationwide</strong>
          <span>delivery network</span>
        </div>

        <div>
          <strong>Real-time</strong>
          <span>parcel visibility</span>
        </div>

        <div>
          <strong>Doorstep</strong>
          <span>final-mile delivery</span>
        </div>
      </div>
    </section>
  );
}