"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "antd";

const RunRouteMapInner = dynamic(() => import("./RunRouteMapInner"), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 10 }} />,
});

export default function RunRouteMap(props) {
  return <RunRouteMapInner {...props} />;
}

