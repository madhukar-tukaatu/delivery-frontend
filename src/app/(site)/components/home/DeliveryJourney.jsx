"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import styles from "./DeliveryJourney.module.css";

gsap.registerPlugin(ScrollTrigger);

const scenes = [
  {
    number: "01 / 06",
    eyebrow: "MERCHANT PICKUP",
    title: "Your parcel starts here.",
    description:
      "A merchant prepares your order. Tukaatu picks it up and begins the journey.",
  },
  {
    number: "02 / 06",
    eyebrow: "ORIGIN BRANCH",
    title: "Collected. Scanned. Ready.",
    description:
      "The parcel arrives at the origin branch where it is scanned, sorted and prepared for transfer.",
  },
  {
    number: "03 / 06",
    eyebrow: "NETWORK TRANSFER",
    title: "Moving across Nepal.",
    description:
      "The parcel joins the Tukaatu network and travels toward its destination.",
  },
  {
    number: "04 / 06",
    eyebrow: "DESTINATION BRANCH",
    title: "Closer to you.",
    description:
      "At the destination branch, your parcel is scanned and prepared for the final journey.",
  },
  {
    number: "05 / 06",
    eyebrow: "LAST MILE",
    title: "Out for delivery.",
    description:
      "A local Tukaatu rider takes over and heads toward your neighborhood.",
  },
  {
    number: "06 / 06",
    eyebrow: "DELIVERED",
    title: "Delivered to your door.",
    description:
      "The journey ends at your doorstep. Safe, visible and simple.",
  },
];

export default function DeliveryJourney() {
  const root = useRef(null);

  const sceneRefs = useRef([]);
  const imageRefs = useRef([]);
  const titleRefs = useRef([]);
  const textRefs = useRef([]);
  const progressRef = useRef(null);

  useLayoutEffect(() => {
    const element = root.current;

    if (!element) return;

    const ctx = gsap.context(() => {
      const scenes = sceneRefs.current;
      const images = imageRefs.current;
      const titles = titleRefs.current;
      const texts = textRefs.current;

      gsap.set(scenes, {
        autoAlpha: 0,
        scale: 1.04,
      });

      gsap.set(scenes[0], {
        autoAlpha: 1,
        scale: 1,
      });

      gsap.set(images, {
        scale: 1.08,
      });

      gsap.set(images[0], {
        scale: 1,
      });

      gsap.set(titles, {
        y: 80,
        opacity: 0,
      });

      gsap.set(texts, {
        y: 40,
        opacity: 0,
      });

      gsap.set(titles[0], {
        y: 0,
        opacity: 1,
      });

      gsap.set(texts[0], {
        y: 0,
        opacity: 1,
      });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: element,
          start: "top top",
          end: "+=5000",
          scrub: 1.2,
          pin: true,
          anticipatePin: 1,
        },
      });

      const parcel = element.querySelector(".parcel");
      const rider = element.querySelector(".rider");
      const van = element.querySelector(".van");
      const road = element.querySelector(".road");
      const route = element.querySelector(".route");

      /*
       * --------------------------------------------------
       * SCENE 01
       * --------------------------------------------------
       */

      timeline
        .to(images[0], {
          scale: 1.02,
          duration: 1,
          ease: "none",
        })
        .to(
          ".merchantForeground",
          {
            y: -20,
            scale: 1.03,
            duration: 1,
          },
          "<"
        )
        .to(
          parcel,
          {
            x: 180,
            y: -80,
            rotate: -8,
            duration: 1,
            ease: "power2.inOut",
          },
          "<"
        )
        .to(
          ".pickupBadge",
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
          },
          "-=0.4"
        )

        /*
         * --------------------------------------------------
         * TRANSITION TO BRANCH
         * --------------------------------------------------
         */

        .to(scenes[0], {
          autoAlpha: 0,
          scale: 0.92,
          duration: 0.6,
        })
        .to(
          scenes[1],
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.8,
          },
          "<"
        )
        .to(
          images[1],
          {
            scale: 1,
            duration: 0.8,
          },
          "<"
        )
        .to(
          titles[0],
          {
            y: -70,
            opacity: 0,
            duration: 0.5,
          },
          "<"
        )
        .to(
          titles[1],
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
          },
          "<0.15"
        )
        .to(
          texts[0],
          {
            y: -40,
            opacity: 0,
            duration: 0.4,
          },
          "<"
        )
        .to(
          texts[1],
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
          },
          "<0.2"
        )

        /*
         * --------------------------------------------------
         * SCANNING
         * --------------------------------------------------
         */

        .to(
          ".scannerBeam",
          {
            scaleY: 1,
            opacity: 1,
            duration: 0.5,
            transformOrigin: "top",
          }
        )
        .to(
          ".scanCheck",
          {
            scale: 1,
            opacity: 1,
            duration: 0.4,
          }
        )
        .to(
          ".sortBox",
          {
            x: 100,
            duration: 0.7,
            ease: "power2.inOut",
          }
        )

        /*
         * --------------------------------------------------
         * ROAD TRANSITION
         * --------------------------------------------------
         */

        .to(
          scenes[1],
          {
            autoAlpha: 0,
            scale: 1.15,
            duration: 0.7,
          }
        )
        .to(
          scenes[2],
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.8,
          },
          "<"
        )
        .to(
          images[2],
          {
            scale: 1,
            duration: 0.9,
          },
          "<"
        )

        /*
         * --------------------------------------------------
         * ROAD MOVEMENT
         * --------------------------------------------------
         */

        .to(
          road,
          {
            scale: 1.25,
            y: 60,
            duration: 1,
            ease: "power1.inOut",
          }
        )
        .to(
          route,
          {
            strokeDashoffset: 0,
            duration: 1,
            ease: "none",
          },
          "<"
        )
        .to(
          van,
          {
            x: 430,
            duration: 1.1,
            ease: "power1.inOut",
          },
          "<"
        )

        /*
         * --------------------------------------------------
         * DESTINATION BRANCH
         * --------------------------------------------------
         */

        .to(
          scenes[2],
          {
            autoAlpha: 0,
            scale: 0.88,
            duration: 0.7,
          }
        )
        .to(
          scenes[3],
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.8,
          },
          "<"
        )
        .to(
          images[3],
          {
            scale: 1,
            duration: 0.8,
          },
          "<"
        )

        .to(
          ".destinationBox",
          {
            y: -90,
            scale: 0.85,
            duration: 0.7,
            ease: "power2.inOut",
          }
        )
        .to(
          ".destinationCheck",
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
          }
        )

        /*
         * --------------------------------------------------
         * LAST MILE
         * --------------------------------------------------
         */

        .to(
          scenes[3],
          {
            autoAlpha: 0,
            x: -100,
            duration: 0.6,
          }
        )
        .to(
          scenes[4],
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.8,
          },
          "<"
        )
        .to(
          images[4],
          {
            scale: 1,
            duration: 0.8,
          },
          "<"
        )
        .to(
          rider,
          {
            x: 420,
            duration: 1,
            ease: "power2.inOut",
          }
        )
        .to(
          ".lastMileRoute",
          {
            width: "72%",
            duration: 1,
            ease: "power2.inOut",
          },
          "<"
        )

        /*
         * --------------------------------------------------
         * FINAL DELIVERY
         * --------------------------------------------------
         */

        .to(
          scenes[4],
          {
            autoAlpha: 0,
            scale: 1.08,
            duration: 0.7,
          }
        )
        .to(
          scenes[5],
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.8,
          },
          "<"
        )
        .to(
          images[5],
          {
            scale: 1,
            duration: 0.8,
          },
          "<"
        )

        .to(
          ".finalParcel",
          {
            y: 125,
            duration: 0.8,
            ease: "power2.inOut",
          }
        )
        .to(
          ".deliveredBadge",
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: "back.out(1.8)",
          }
        )
        .to(
          ".finalGlow",
          {
            opacity: 1,
            scale: 1.2,
            duration: 0.8,
          },
          "<"
        );

      /*
       * Progress line
       */

      gsap.to(progressRef.current, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: element,
          start: "top top",
          end: "+=5000",
          scrub: true,
        },
      });
    }, element);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className={styles.journey}>
      <div className={styles.camera}>
        <div className={styles.grid} />

        <Header />

        <div className={styles.sceneCounter}>
          <span>DELIVERY EXPERIENCE</span>
          <strong>SCROLL TO FOLLOW</strong>
        </div>

        {scenes.map((scene, index) => (
          <article
            key={scene.number}
            ref={(node) => {
              sceneRefs.current[index] = node;
            }}
            className={`${styles.scene} scene-${index}`}
          >
            <div
              ref={(node) => {
                imageRefs.current[index] = node;
              }}
              className={`${styles.background} ${
                styles[`background${index}`]
              }`}
            />

            <div className={styles.backgroundShade} />

            <div className={styles.content}>
              <div className={styles.sceneNumber}>
                {scene.number}
              </div>

              <div className={styles.eyebrow}>
                <span />
                {scene.eyebrow}
              </div>

              <h1
                ref={(node) => {
                  titleRefs.current[index] = node;
                }}
              >
                {scene.title}
              </h1>

              <p
                ref={(node) => {
                  textRefs.current[index] = node;
                }}
              >
                {scene.description}
              </p>

              <div className={styles.locationPill}>
                <span className={styles.liveDot} />
                Tukaatu Network
              </div>
            </div>

            {index === 0 && <MerchantScene />}

            {index === 1 && <BranchScene />}

            {index === 2 && <RoadScene />}

            {index === 3 && <DestinationScene />}

            {index === 4 && <LastMileScene />}

            {index === 5 && <HomeScene />}
          </article>
        ))}

        <div className={styles.bottomProgress}>
          <div
            ref={progressRef}
            className={styles.progress}
          />
        </div>

        <div className={styles.scrollHint}>
          <span>SCROLL TO FOLLOW YOUR PARCEL</span>
          <div>↓</div>
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logoMark}>
          <span />
          <span />
        </div>

        <div>
          <strong>TUKAATU</strong>
          <small>EXPRESS</small>
        </div>
      </div>

      <div className={styles.headerRight}>
        <span>NEPAL-WIDE DELIVERY NETWORK</span>
        <strong>01 — 06</strong>
      </div>
    </header>
  );
}

function MerchantScene() {
  return (
    <div className={styles.sceneGraphic}>
      <div className={`${styles.shop} merchantForeground`}>
        <div className={styles.shopRoof}>
          TUKAATU MERCHANT
        </div>

        <div className={styles.shopWindow}>
          <div />
          <div />
        </div>

        <div className={styles.shopDoor}>
          <span />
        </div>

        <div className={styles.packageOnCounter}>
          T
        </div>
      </div>

      <div className="parcel pickupParcel">
        <span>T</span>
      </div>

      <div className={styles.riderPickup}>
        <div className={styles.riderHelmet} />
        <div className={styles.riderBody} />
        <div className={styles.riderBike}>
          <i />
          <i />
        </div>
      </div>

      <div className="pickupBadge">
        <b>✓</b>
        <span>
          PICKED UP
          <small>Parcel secured</small>
        </span>
      </div>
    </div>
  );
}

function BranchScene() {
  return (
    <div className={styles.sceneGraphic}>
      <div className={styles.branchBuilding}>
        <div className={styles.branchSign}>
          TUKAATU
          <small>ORIGIN BRANCH</small>
        </div>

        <div className={styles.branchDoor}>
          <span />
          <span />
        </div>

        <div className={styles.branchWindows}>
          <i />
          <i />
          <i />
        </div>
      </div>

      <div className="sortBox">
        <div className={styles.package}>
          T
        </div>
      </div>

      <div className={styles.scanner}>
        <div className="scannerBeam" />
      </div>

      <div className="scanCheck">
        ✓
      </div>
    </div>
  );
}

function RoadScene() {
  return (
    <div className={styles.sceneGraphic}>
      <div className="road">
        <div className={styles.roadSurface}>
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className={styles.mountain mountainOne} />
      <div className={styles.mountain mountainTwo} />
      <div className={styles.mountain mountainThree} />

      <div className={styles.cityLabel kathmandu}>
        KATHMANDU
      </div>

      <div className={styles.cityLabel pokhara}>
        POKHARA
      </div>

      <svg
        className={styles.routeSvg}
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
      >
        <path
          className={styles.routeShadow}
          d="M80 350 C250 190 340 400 490 280 C650 150 720 300 920 110"
        />

        <path
          className="route"
          d="M80 350 C250 190 340 400 490 280 C650 150 720 300 920 110"
        />
      </svg>

      <div className="van">
        <div className={styles.vanBody}>
          <strong>T</strong>
          <span />
        </div>

        <div className={styles.wheel} />
        <div className={`${styles.wheel} ${styles.wheelTwo}`} />
      </div>

      <div className={styles.routeCard}>
        <span>IN TRANSIT</span>
        <strong>Kathmandu → Pokhara</strong>
        <small>Moving through Tukaatu network</small>
      </div>
    </div>
  );
}

function DestinationScene() {
  return (
    <div className={styles.sceneGraphic}>
      <div className={styles.destinationBranch}>
        <div className={styles.branchSign}>
          TUKAATU
          <small>DESTINATION HUB</small>
        </div>

        <div className={styles.branchWindows}>
          <i />
          <i />
          <i />
        </div>

        <div className={styles.destinationDoor} />
      </div>

      <div className="destinationBox">
        <div className={styles.package}>
          T
        </div>
      </div>

      <div className="destinationCheck">
        ✓
      </div>
    </div>
  );
}

function LastMileScene() {
  return (
    <div className={styles.sceneGraphic}>
      <div className={styles.street} />

      <div className={styles.lastHouse}>
        <div className={styles.houseRoof} />
        <div className={styles.houseBody}>
          <div />
          <div />
        </div>
      </div>

      <div className={styles.lastMileRoute}>
        <span />
      </div>

      <div className="rider">
        <div className={styles.riderHelmet} />
        <div className={styles.riderBody} />
        <div className={styles.riderBike}>
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

function HomeScene() {
  return (
    <div className={styles.sceneGraphic}>
      <div className={styles.homeGround} />

      <div className={styles.finalHome}>
        <div className={styles.homeRoof} />

        <div className={styles.homeBody}>
          <div className={styles.homeWindow} />

          <div className={styles.homeDoor}>
            <span />
          </div>
        </div>
      </div>

      <div className="finalParcel">
        <div className={styles.package}>
          T
        </div>
      </div>

      <div className="finalGlow" />

      <div className="deliveredBadge">
        <b>✓</b>

        <span>
          DELIVERED
          <small>Successfully delivered</small>
        </span>
      </div>

      <div className={styles.deliveryStatus}>
        <span className={styles.liveDot} />
        PACKAGE DELIVERED
      </div>
    </div>
  );
}