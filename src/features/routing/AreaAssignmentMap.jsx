"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "antd";

const AreaAssignmentMapInner = dynamic(() => import("./AreaAssignmentMapInner"), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 8 }} />,
});

export default function AreaAssignmentMap(props) {
  return <AreaAssignmentMapInner {...props} />;
}
