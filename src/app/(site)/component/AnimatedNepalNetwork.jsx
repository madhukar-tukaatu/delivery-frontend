"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

export default function AnimatedNepalNetwork({ isDark = true }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const routes = svgRef.current.querySelectorAll(".route-path");
    const nodes = svgRef.current.querySelectorAll(".city-node");
    const vehicles = svgRef.current.querySelectorAll(".vehicle");
    const pulses = svgRef.current.querySelectorAll(".route-pulse");

    // Initial state for routes
    routes.forEach((path) => {
      const length = path.getTotalLength();
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length,
        opacity: 0.9,
      });
    });

    // Master timeline triggered when the network section is in view
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 70%",
        toggleActions: "play none none none",
      },
    });

    // Nodes appear
    tl.from(nodes, {
      scale: 0,
      opacity: 0,
      stagger: 0.08,
      duration: 0.55,
      ease: "back.out(1.8)",
    });

    // Routes draw
    tl.to(
      routes,
      {
        strokeDashoffset: 0,
        duration: 1.6,
        stagger: 0.13,
        ease: "power2.inOut",
      },
      0.2
    );

    // Continuous vehicle movement
    vehicles.forEach((vehicle, i) => {
      const pathId = vehicle.getAttribute("data-path");
      const path = svgRef.current.querySelector(pathId);
      if (path) {
        gsap.to(vehicle, {
          motionPath: {
            path: path,
            align: path,
            alignOrigin: [0.5, 0.5],
            autoRotate: true,
          },
          duration: 8 + i * 1.6,
          repeat: -1,
          ease: "none",
          delay: 2 + i * 0.5,
        });
      }
    });

    // Soft glowing pulses traveling along routes
    pulses.forEach((pulse, i) => {
      const length = pulse.getTotalLength();
      gsap.set(pulse, {
        strokeDasharray: `14 ${length}`,
        strokeDashoffset: length,
        opacity: 0.85,
      });
      gsap.to(pulse, {
        strokeDashoffset: -length,
        duration: 3.2 + i * 0.35,
        repeat: -1,
        ease: "none",
        delay: 2.4 + i * 0.3,
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  const stroke = isDark ? "#00D4C8" : "#027196";
  const fill = isDark ? "rgba(2,113,150,0.18)" : "rgba(2,113,150,0.09)";
  const textColor = isDark ? "#F1F5F9" : "#0F172A";

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 440 }}>
      <svg
        ref={svgRef}
        viewBox="0 0 900 520"
        style={{ width: "100%", height: "100%" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft Nepal outline */}
        <path
          d="M80,280 C120,180 180,120 280,100 C380,80 480,90 580,110 C680,130 760,160 820,220 C850,260 860,310 840,360 C800,420 700,450 580,460 C460,470 340,460 240,430 C160,400 100,350 80,280 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.6"
          opacity="0.75"
        />

        {/* Main routes */}
        <path id="r1" className="route-path" d="M420,240 Q320,200 260,230" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        <path id="r2" className="route-path" d="M420,240 Q560,200 720,260" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        <path id="r3" className="route-path" d="M420,240 Q400,320 380,380" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path id="r4" className="route-path" d="M420,240 Q300,300 220,340" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path id="r5" className="route-path" d="M420,240 Q250,280 140,310" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path id="r6" className="route-path" d="M420,240 Q580,180 680,220" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path id="r7" className="route-path" d="M420,240 Q360,280 340,330" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />

        {/* Pulse overlays */}
        <path className="route-pulse" d="M420,240 Q320,200 260,230" fill="none" stroke="#FFD026" strokeWidth="3" strokeLinecap="round" />
        <path className="route-pulse" d="M420,240 Q560,200 720,260" fill="none" stroke="#FFD026" strokeWidth="3" strokeLinecap="round" />
        <path className="route-pulse" d="M420,240 Q300,300 220,340" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" />
        <path className="route-pulse" d="M420,240 Q250,280 140,310" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" />

        {/* City nodes */}
        {[
          { x: 420, y: 240, label: "Kathmandu", r: 9 },
          { x: 260, y: 230, label: "Pokhara", r: 7 },
          { x: 720, y: 260, label: "Biratnagar", r: 7 },
          { x: 380, y: 380, label: "Birgunj", r: 6 },
          { x: 220, y: 340, label: "Butwal", r: 6 },
          { x: 140, y: 310, label: "Nepalgunj", r: 6 },
          { x: 680, y: 220, label: "Dharan", r: 6 },
          { x: 340, y: 330, label: "Bharatpur", r: 6 },
        ].map((c) => (
          <g key={c.label} className="city-node" transform={`translate(${c.x},${c.y})`}>
            <circle r={c.r + 7} fill={`${stroke}25`} stroke={stroke} strokeWidth="1.5" />
            <circle r={c.r} fill={stroke} />
            <text
              y={c.r + 18}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={textColor}
              style={{ pointerEvents: "none" }}
            >
              {c.label}
            </text>
          </g>
        ))}

        {/* Delivery vehicles */}
        <g className="vehicle" data-path="#r1">
          <circle r="5.5" fill="#FFD026" />
        </g>
        <g className="vehicle" data-path="#r2">
          <circle r="5.5" fill="#FFD026" />
        </g>
        <g className="vehicle" data-path="#r4">
          <circle r="5" fill="#34D399" />
        </g>
        <g className="vehicle" data-path="#r5">
          <circle r="5" fill="#34D399" />
        </g>
      </svg>
    </div>
  );
}