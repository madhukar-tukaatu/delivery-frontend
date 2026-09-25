"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowRightLeft, Navigation, MapPin } from "lucide-react";
import styles from "./RouteCard.module.css";
import geometry from "./nepalGeometry.json";
export default function RouteCard(){
  const [reverse,setReverse]=useState(false);
  return <div className={styles.card}>
    <div className={styles.header}><div className={styles.identity}><span><Navigation size={20}/></span><div><small>CONNECTED ACROSS NEPAL</small><h3>Every route. A connection.</h3></div></div><span className={styles.badge}>Route preview</span></div>
    <div className={styles.map}>
      <div className={styles.coordinate}>NEPAL <span>28° N · 84° E</span></div>
      <svg viewBox="0 0 760 400" role="img" aria-label={`Nepal geographic map with provincial boundaries and an illustrative route from ${reverse?'Pokhara to Kathmandu':'Kathmandu to Pokhara'}`}>
        <defs>
          <pattern id="route-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#c7dce7" strokeWidth=".6"/></pattern>
          <linearGradient id="route-land" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e0eee8"/><stop offset="1" stopColor="#c8e0ed"/></linearGradient>
        </defs>
        <rect width="760" height="400" fill="url(#route-grid)" opacity=".4"/>
        <g transform="translate(0 5)" fill="#b3cdd9" opacity=".3">{geometry.provinces.map((d,i)=><path key={i} d={d}/>)}</g>
        <g fill="url(#route-land)" stroke="#83adc1" strokeWidth="1.1" strokeLinejoin="round">{geometry.provinces.map((d,i)=><path key={i} d={d}/>)}</g>
        <path d={geometry.route} fill="none" stroke="#fff" strokeWidth="8"/>
        <path d={geometry.route} fill="none" stroke="#1677b8" strokeWidth="2.5" strokeDasharray="4 6"/>
        <g className={`${styles.parcel} ${reverse?styles.reverse:''}`} style={{offsetPath:`path("${geometry.route}")`}}><rect x="-6" y="-6" width="12" height="12" rx="3" fill="#f4c542" stroke="#fff" strokeWidth="2"/></g>
        {[{name:'Pokhara',point:geometry.pokhara,left:true},{name:'Kathmandu',point:geometry.kathmandu,left:false}].map(({name,point:[x,y],left})=><g key={name} transform={`translate(${x} ${y})`}>
          <circle r="14" fill="#1677b8" opacity=".12"/><circle r="7" fill="#fff" stroke="#1677b8" strokeWidth="2.5"/><circle r="2.5" fill="#1677b8"/>
          <rect x={left?-104:12} y={left?-45:15} width={left?100:128} height="30" rx="8" fill="#fff" stroke="#d5e3eb"/>
          <text x={left?-54:76} y={left?-25:35} textAnchor="middle" fill="#0b1f33" fontSize="14" fontWeight="700">{name}</text>
        </g>)}
      </svg>
      <div className={styles.legend}><i/> Connected journey <span>Illustrative route</span></div>
      <p className={styles.attribution}>Map data: <a href="https://github.com/opentechcommunity/map-of-nepal" target="_blank" rel="noopener noreferrer">Open Tech Community</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>
    </div>
    <div className={styles.route}>
      <div><span><MapPin size={12}/> FROM</span><strong>{reverse?'Pokhara':'Kathmandu'}</strong></div>
      <button type="button" aria-label="Reverse illustrative route" title="Reverse route" onClick={()=>setReverse(!reverse)}><ArrowRightLeft size={17}/></button>
      <div><span><MapPin size={12}/> TO</span><strong>{reverse?'Kathmandu':'Pokhara'}</strong></div>
    </div>
    <div className={styles.footer}><p>Planning a delivery?<span>Confirm availability for your pickup and destination.</span></p><Link href="/contact">Check availability <ArrowRight size={16}/></Link></div>
  </div>;
}
