"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./DeliveryExperience.module.css";

gsap.registerPlugin(ScrollTrigger);

const SCENES = {
  pickup: 0,
  origin: 0.22,
  road: 0.48,
  destination: 0.7,
  delivery: 0.9,
};

export default function DeliveryExperience() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);

  const pickupBgRef = useRef(null);
  const originBgRef = useRef(null);
  const roadBgRef = useRef(null);
  const destinationBgRef = useRef(null);
  const deliveryBgRef = useRef(null);

  const cameraRef = useRef(null);
  const vehicleRef = useRef(null);
  const parcelRef = useRef(null);
  const routeRef = useRef(null);
  const routeGlowRef = useRef(null);

  const pickupCardRef = useRef(null);
  const originCardRef = useRef(null);
  const roadCardRef = useRef(null);
  const destinationCardRef = useRef(null);
  const deliveryCardRef = useRef(null);

  const pickupStatusRef = useRef(null);
  const scanStatusRef = useRef(null);
  const transitStatusRef = useRef(null);
  const destinationStatusRef = useRef(null);
  const deliveredStatusRef = useRef(null);

  const originBranchRef = useRef(null);
  const destinationBranchRef = useRef(null);
  const houseRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;

    if (!section || !stage) {
      return undefined;
    }

    const context = gsap.context(() => {
      const backgrounds = [
        pickupBgRef.current,
        originBgRef.current,
        roadBgRef.current,
        destinationBgRef.current,
        deliveryBgRef.current,
      ];

      const cards = [
        pickupCardRef.current,
        originCardRef.current,
        roadCardRef.current,
        destinationCardRef.current,
        deliveryCardRef.current,
      ];

      gsap.set(backgrounds, {
        opacity: 0,
        scale: 1.12,
      });

      gsap.set(pickupBgRef.current, {
        opacity: 1,
        scale: 1,
      });

      gsap.set(cards, {
        opacity: 0,
        y: 45,
        scale: 0.96,
      });

      gsap.set(pickupCardRef.current, {
        opacity: 1,
        y: 0,
        scale: 1,
      });

      gsap.set(cameraRef.current, {
        scale: 1,
        x: 0,
        y: 0,
        rotationX: 0,
        rotationY: 0,
      });

      gsap.set(vehicleRef.current, {
        x: -260,
        y: 70,
        scale: 0.72,
        opacity: 0,
        rotation: -2,
      });

      gsap.set(parcelRef.current, {
        x: -40,
        y: 5,
        scale: 1,
        rotation: 0,
        opacity: 1,
      });

      gsap.set(routeRef.current, {
        strokeDasharray: 1400,
        strokeDashoffset: 1400,
      });

      gsap.set(routeGlowRef.current, {
        strokeDasharray: 1400,
        strokeDashoffset: 1400,
        opacity: 0,
      });

      gsap.set(
        [
          originBranchRef.current,
          destinationBranchRef.current,
          houseRef.current,
        ],
        {
          opacity: 0,
          scale: 0.7,
          y: 25,
        }
      );

      gsap.set(
        [
          pickupStatusRef.current,
          scanStatusRef.current,
          transitStatusRef.current,
          destinationStatusRef.current,
          deliveredStatusRef.current,
        ],
        {
          opacity: 0,
          y: 18,
        }
      );

      const timeline = gsap.timeline({
        defaults: {
          ease: "none",
        },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=4200",
          pin: true,
          scrub: 2.2,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          fastScrollEnd: false,
          preventOverlaps: true,
        },
      });

      /*
       * ------------------------------------------------------------
       * SCENE 01 — MERCHANT PICKUP
       * ------------------------------------------------------------
       */

      timeline
        .to(
          cameraRef.current,
          {
            scale: 1.05,
            x: 0,
            y: -8,
            duration: 1,
          },
          0
        )
        .to(
          pickupBgRef.current,
          {
            scale: 1.08,
            duration: 1,
          },
          0
        )
        .to(
          pickupStatusRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
          },
          0.15
        )
        .to(
          vehicleRef.current,
          {
            x: 70,
            y: 30,
            scale: 0.9,
            opacity: 1,
            rotation: 0,
            duration: 1.2,
          },
          0.2
        )
        .to(
          parcelRef.current,
          {
            x: 90,
            y: -15,
            rotation: -8,
            duration: 0.7,
          },
          0.55
        )
        .to(
          pickupCardRef.current,
          {
            opacity: 0,
            y: -30,
            scale: 0.98,
            duration: 0.35,
          },
          0.85
        );

      /*
       * ------------------------------------------------------------
       * SCENE 02 — ORIGIN BRANCH
       * ------------------------------------------------------------
       */

      timeline
        .to(
          pickupBgRef.current,
          {
            opacity: 0,
            scale: 1.18,
            duration: 0.6,
          },
          0.9
        )
        .to(
          originBgRef.current,
          {
            opacity: 1,
            scale: 1,
            duration: 0.75,
          },
          0.95
        )
        .to(
          cameraRef.current,
          {
            scale: 1.18,
            x: 0,
            y: -12,
            rotationY: -1,
            duration: 0.8,
          },
          0.95
        )
        .to(
          originBranchRef.current,
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.55,
          },
          1.02
        )
        .to(
          originCardRef.current,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
          },
          1.05
        )
        .to(
          scanStatusRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
          },
          1.25
        )
        .to(
          parcelRef.current,
          {
            x: 0,
            y: 0,
            scale: 0.85,
            rotation: 0,
            duration: 0.7,
          },
          1.05
        )
        .to(
          vehicleRef.current,
          {
            x: 0,
            y: 0,
            scale: 0.78,
            opacity: 0.45,
            duration: 0.7,
          },
          1.05
        )
        .to(
          parcelRef.current,
          {
            scale: 0.92,
            duration: 0.3,
          },
          1.55
        )
        .to(
          originCardRef.current,
          {
            opacity: 0,
            y: -25,
            duration: 0.35,
          },
          1.72
        );

      /*
       * ------------------------------------------------------------
       * SCENE 03 — NEPAL ROAD / BRANCH TRANSFER
       * ------------------------------------------------------------
       */

      timeline
        .to(
          originBgRef.current,
          {
            opacity: 0,
            scale: 1.18,
            duration: 0.65,
          },
          1.75
        )
        .to(
          roadBgRef.current,
          {
            opacity: 1,
            scale: 1,
            duration: 0.75,
          },
          1.8
        )
        .to(
          cameraRef.current,
          {
            scale: 1,
            x: 0,
            y: 0,
            rotationY: 0,
            duration: 0.75,
          },
          1.8
        )
        .to(
          roadCardRef.current,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
          },
          1.9
        )
        .to(
          transitStatusRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
          },
          2
        )
        .to(
          routeRef.current,
          {
            strokeDashoffset: 0,
            duration: 1.65,
          },
          2
        )
        .to(
          routeGlowRef.current,
          {
            strokeDashoffset: 0,
            opacity: 0.7,
            duration: 1.65,
          },
          2
        )
        .to(
          vehicleRef.current,
          {
            x: 330,
            y: -65,
            scale: 0.7,
            opacity: 1,
            rotation: 2,
            duration: 1.65,
          },
          2
        )
        .to(
          parcelRef.current,
          {
            x: 330,
            y: -65,
            scale: 0.7,
            rotation: 8,
            duration: 1.65,
          },
          2
        )
        .to(
          roadBgRef.current,
          {
            scale: 1.08,
            duration: 1.7,
          },
          2
        )
        .to(
          roadCardRef.current,
          {
            opacity: 0,
            y: -35,
            duration: 0.35,
          },
          3.55
        );

      /*
       * ------------------------------------------------------------
       * SCENE 04 — DESTINATION BRANCH
       * ------------------------------------------------------------
       */

      timeline
        .to(
          roadBgRef.current,
          {
            opacity: 0,
            scale: 1.2,
            duration: 0.6,
          },
          3.6
        )
        .to(
          destinationBgRef.current,
          {
            opacity: 1,
            scale: 1,
            duration: 0.75,
          },
          3.65
        )
        .to(
          cameraRef.current,
          {
            scale: 1.2,
            x: 0,
            y: -10,
            duration: 0.8,
          },
          3.65
        )
        .to(
          destinationBranchRef.current,
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.55,
          },
          3.75
        )
        .to(
          destinationCardRef.current,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
          },
          3.8
        )
        .to(
          destinationStatusRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
          },
          4
        )
        .to(
          vehicleRef.current,
          {
            x: 0,
            y: 10,
            scale: 0.75,
            opacity: 0.45,
            rotation: 0,
            duration: 0.75,
          },
          3.75
        )
        .to(
          parcelRef.current,
          {
            x: 0,
            y: 0,
            scale: 0.95,
            rotation: 0,
            duration: 0.75,
          },
          3.75
        )
        .to(
          destinationCardRef.current,
          {
            opacity: 0,
            y: -30,
            duration: 0.35,
          },
          4.45
        );

      /*
       * ------------------------------------------------------------
       * SCENE 05 — LAST MILE DELIVERY
       * ------------------------------------------------------------
       */

      timeline
        .to(
          destinationBgRef.current,
          {
            opacity: 0,
            scale: 1.2,
            duration: 0.6,
          },
          4.5
        )
        .to(
          deliveryBgRef.current,
          {
            opacity: 1,
            scale: 1,
            duration: 0.75,
          },
          4.55
        )
        .to(
          cameraRef.current,
          {
            scale: 1,
            x: 0,
            y: 0,
            duration: 0.8,
          },
          4.55
        )
        .to(
          houseRef.current,
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.6,
          },
          4.65
        )
        .to(
          deliveryCardRef.current,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
          },
          4.7
        )
        .to(
          vehicleRef.current,
          {
            x: 180,
            y: 40,
            scale: 0.8,
            opacity: 1,
            duration: 0.9,
          },
          4.75
        )
        .to(
          parcelRef.current,
          {
            x: 175,
            y: -5,
            scale: 1,
            duration: 0.9,
          },
          4.75
        )
        .to(
          deliveredStatusRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
          },
          5.2
        )
        .to(
          parcelRef.current,
          {
            x: 225,
            y: 55,
            scale: 0.72,
            rotation: 4,
            duration: 0.7,
          },
          5.35
        )
        .to(
          cameraRef.current,
          {
            scale: 1.13,
            y: -8,
            duration: 0.7,
          },
          5.65
        )
        .to(
          deliveryBgRef.current,
          {
            scale: 1.1,
            duration: 0.8,
          },
          5.65
        );

      /*
       * ------------------------------------------------------------
       * FINAL RESET / HOLD
       * ------------------------------------------------------------
       */

      timeline.to(
        deliveryCardRef.current,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.35,
        },
        5.9
      );

      /*
       * GSAP normalizeScroll makes aggressive mouse-wheel/touch
       * input much less likely to produce violent jumps.
       */
      ScrollTrigger.normalizeScroll({
        allowNestedScroll: true,
        momentum: self => Math.min(2, self.velocityY / 1000),
      });

      ScrollTrigger.refresh();
    }, sectionRef);

    return () => {
      context.revert();
      ScrollTrigger.killAll();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.experience}
      aria-label="How Tukaatu Express delivers your parcel"
    >
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.backgroundLayer}>
          <div
            ref={pickupBgRef}
            className={`${styles.background} ${styles.pickupBackground}`}
          />

          <div
            ref={originBgRef}
            className={`${styles.background} ${styles.originBackground}`}
          />

          <div
            ref={roadBgRef}
            className={`${styles.background} ${styles.roadBackground}`}
          />

          <div
            ref={destinationBgRef}
            className={`${styles.background} ${styles.destinationBackground}`}
          />

          <div
            ref={deliveryBgRef}
            className={`${styles.background} ${styles.deliveryBackground}`}
          />

          <div className={styles.backgroundOverlay} />
        </div>

        {/* <div className={styles.topBar}>
          <div className={styles.brandMark}>
            <span className={styles.brandDot} />
            <span>Tukaatu Express</span>
          </div>

          <div className={styles.scrollIndicator}>
            <span>SCROLL TO EXPERIENCE</span>
            <span className={styles.scrollArrow}>↓</span>
          </div>
        </div> */}

        <div ref={cameraRef} className={styles.camera}>
          <div className={styles.sceneContent}>
            {/* Ambient particles */}
            <div className={`${styles.particle} ${styles.particleOne}`} />
            <div className={`${styles.particle} ${styles.particleTwo}`} />
            <div className={`${styles.particle} ${styles.particleThree}`} />
            <div className={`${styles.particle} ${styles.particleFour}`} />

            {/* Merchant shop */}
            <div
              ref={pickupCardRef}
              className={`${styles.infoCard} ${styles.pickupCard}`}
            >
              <div className={styles.cardEyebrow}>01 · PICKUP</div>
              <h2>Your parcel starts here.</h2>
              <p>
                A merchant prepares your order and Tukaatu brings it into the
                delivery network.
              </p>

              <div className={styles.miniSteps}>
                <span className={styles.activeStep}>ORDER</span>
                <span>PACK</span>
                <span>PICKUP</span>
              </div>
            </div>

            <div
              ref={pickupStatusRef}
              className={`${styles.statusChip} ${styles.pickupStatus}`}
            >
              <span className={styles.statusPulse} />
              Pickup confirmed
            </div>

            {/* Origin branch */}
            <div
              ref={originBranchRef}
              className={`${styles.branchVisual} ${styles.originBranch}`}
            >
              <div className={styles.branchRoof} />

              <div className={styles.branchBody}>
                <div className={styles.branchLogo}>T</div>

                <div className={styles.branchDoor} />

                <div className={styles.branchWindow}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className={styles.branchGlow} />
            </div>

            <div
              ref={originCardRef}
              className={`${styles.infoCard} ${styles.originCard}`}
            >
              <div className={styles.cardEyebrow}>02 · ORIGIN BRANCH</div>
              <h2>Scanned. Sorted. Ready.</h2>
              <p>
                Your parcel enters the branch, gets scanned and joins the route
                to its destination.
              </p>

              <div className={styles.processingList}>
                <div>
                  <span className={styles.check}>✓</span>
                  Barcode scanned
                </div>
                <div>
                  <span className={styles.check}>✓</span>
                  Parcel sorted
                </div>
              </div>
            </div>

            <div
              ref={scanStatusRef}
              className={`${styles.statusChip} ${styles.scanStatus}`}
            >
              <span className={styles.successIcon}>✓</span>
              Processing complete
            </div>

            {/* Road route */}
            <div className={styles.routeScene}>
              <svg
                className={styles.routeSvg}
                viewBox="0 0 1100 600"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  ref={routeGlowRef}
                  className={styles.routeGlow}
                  d="M70 455 C220 350 275 410 390 310 C510 205 575 285 680 220 C800 145 870 205 1030 100"
                />

                <path
                  ref={routeRef}
                  className={styles.routeLine}
                  d="M70 455 C220 350 275 410 390 310 C510 205 575 285 680 220 C800 145 870 205 1030 100"
                />

                <circle className={styles.routeNode} cx="70" cy="455" r="10" />
                <circle
                  className={styles.routeNode}
                  cx="1030"
                  cy="100"
                  r="10"
                />
              </svg>

              <div className={styles.locationKathmandu}>
                Kathmandu
                <span>Origin</span>
              </div>

              <div className={styles.locationPokhara}>
                Pokhara
                <span>Destination</span>
              </div>
            </div>

            <div
              ref={roadCardRef}
              className={`${styles.infoCard} ${styles.roadCard}`}
            >
              <div className={styles.cardEyebrow}>03 · BRANCH TRANSFER</div>
              <h2>Moving across Nepal.</h2>
              <p>
                Our network connects branches through carefully coordinated
                line-haul routes.
              </p>

              <div className={styles.routeMeta}>
                <span>KTM</span>
                <span className={styles.routeDots}>
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span>PKR</span>
              </div>
            </div>

            <div
              ref={transitStatusRef}
              className={`${styles.statusChip} ${styles.transitStatus}`}
            >
              <span className={styles.statusPulse} />
              In transit
            </div>

            {/* Destination branch */}
            <div
              ref={destinationBranchRef}
              className={`${styles.branchVisual} ${styles.destinationBranch}`}
            >
              <div className={styles.branchRoof} />

              <div className={styles.branchBody}>
                <div className={styles.branchLogo}>T</div>

                <div className={styles.branchDoor} />

                <div className={styles.branchWindow}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className={styles.branchGlow} />
            </div>

            <div
              ref={destinationCardRef}
              className={`${styles.infoCard} ${styles.destinationCard}`}
            >
              <div className={styles.cardEyebrow}>04 · DESTINATION BRANCH</div>
              <h2>Almost at your door.</h2>
              <p>
                The parcel reaches the destination branch and is prepared for
                the final-mile rider.
              </p>

              <div className={styles.destinationProgress}>
                <div className={styles.progressTrack}>
                  <span />
                </div>
                <strong>92%</strong>
              </div>
            </div>

            <div
              ref={destinationStatusRef}
              className={`${styles.statusChip} ${styles.destinationStatus}`}
            >
              <span className={styles.successIcon}>✓</span>
              Destination branch
            </div>

            {/* Vehicle */}
            <div ref={vehicleRef} className={styles.vehicle}>
              <div className={styles.vehicleShadow} />

              <div className={styles.vehicleBody}>
                <div className={styles.vehicleCab}>
                  <div className={styles.vehicleWindow} />
                </div>

                <div className={styles.vehicleCargo}>
                  <span className={styles.vehicleLogo}>T</span>
                </div>

                <div className={styles.vehicleLight} />
              </div>

              <div className={styles.vehicleWheel}>
                <span />
              </div>

              <div
                className={`${styles.vehicleWheel} ${styles.vehicleWheelFront}`}
              >
                <span />
              </div>

              <div className={styles.vehicleParcel}>
                <span>TK</span>
              </div>
            </div>

            {/* Parcel */}
            <div ref={parcelRef} className={styles.parcel}>
              <div className={styles.parcelTop} />
              <div className={styles.parcelFront}>
                <span>T</span>
              </div>
              <div className={styles.parcelTape} />
            </div>

            {/* House */}
            <div ref={houseRef} className={styles.house}>
              <div className={styles.houseRoof} />

              <div className={styles.houseBody}>
                <div className={styles.houseWindow}>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <div className={styles.houseDoor}>
                  <i />
                </div>
              </div>

              <div className={styles.housePlant}>
                <span />
                <span />
                <span />
              </div>

              <div className={styles.houseLight} />
            </div>

            <div
              ref={deliveryCardRef}
              className={`${styles.infoCard} ${styles.deliveryCard}`}
            >
              <div className={styles.cardEyebrow}>05 · LAST MILE</div>
              <h2>Delivered to your door.</h2>
              <p>
                Your parcel completes the final journey and arrives safely at
                your doorstep.
              </p>

              <div className={styles.deliveryComplete}>
                <span className={styles.largeCheck}>✓</span>
                <div>
                  <strong>DELIVERED</strong>
                  <span>Successfully completed</span>
                </div>
              </div>
            </div>

            <div
              ref={deliveredStatusRef}
              className={`${styles.statusChip} ${styles.deliveredStatus}`}
            >
              <span className={styles.successIcon}>✓</span>
              Delivered successfully
            </div>
          </div>
        </div>

        <div className={styles.bottomGradient} />
      </div>
    </section>
  );
}