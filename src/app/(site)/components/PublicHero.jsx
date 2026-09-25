import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PackageCheck, MapPin, Truck, ShieldCheck } from "lucide-react";

export default function PublicHero({ eyebrow, title, accent, description, primary, secondary, note = "Every handover. Connected.", compact = false, backgroundImage }) {
  return (
    <section className={`public-hero ${compact ? "public-hero--compact" : ""} ${backgroundImage ? "public-hero--photographic" : ""}`}>
      {backgroundImage && <div className="public-hero-photo" aria-hidden="true"><Image src={backgroundImage} alt="" fill priority sizes="100vw" quality={85} /></div>}
      <div className="public-hero-inner">
        <div className="public-hero-copy">
          <Link href="/" className="public-breadcrumb">Tukaatu Express <span>/</span> {eyebrow}</Link>
          <p className="public-eyebrow">{eyebrow}</p>
          <h1>{title}<br /><span>{accent}</span></h1>
          <p className="public-hero-description">{description}</p>
          {(primary || secondary) && <div className="public-hero-actions">
            {primary && <Link className="public-button" href={primary.href}>{primary.label}<ArrowRight size={18} /></Link>}
            {secondary && <Link className="public-button public-button--outline" href={secondary.href}>{secondary.label}</Link>}
          </div>}
        </div>
        {!compact && !backgroundImage && <div className="public-route-card" aria-hidden="true">
          <div className="public-route-top"><span>BUILT FOR NEPAL</span><ShieldCheck size={20} /></div>
          <div className="public-route-symbol"><Truck size={48} strokeWidth={1.4} /></div>
          <p>{note}</p>
          <div className="public-route-stops"><MapPin size={23} /><span /><Truck size={22} /><span /><PackageCheck size={25} /></div>
          <div className="public-route-labels"><span>Your doorstep</span><span>Their doorstep</span></div>
        </div>}
      </div>
    </section>
  );
}
