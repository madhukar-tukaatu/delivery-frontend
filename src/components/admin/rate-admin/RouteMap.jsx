"use client";

import dynamic from "next/dynamic";
import styles from "./rate-admin.module.css";

const RouteMapClient = dynamic(() => import("./RouteMapClient"), {
  ssr: false,
  loading: () => <div className={styles.mapPlaceholder}>Loading route map…</div>,
});

export default function RouteMap({ nodes = [], height = 420, selectedLabel }) {
  const validNodes = (nodes ?? []).filter(
    (node) => Number.isFinite(Number(node.latitude)) && Number.isFinite(Number(node.longitude)),
  );

  if (validNodes.length === 0) {
    return (
      <div className={styles.mapPlaceholder} style={{ height }}>
        Select a rate, lane, or complete route to view it on the map. Branch latitude and longitude must be available.
      </div>
    );
  }

  return <RouteMapClient nodes={validNodes} height={height} selectedLabel={selectedLabel} />;
}
