'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from 'antd';

const RoutingMapInner = dynamic(() => import('./RoutingMapPickerInner'), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 6 }} />,
});

export default function RoutingMapPicker(props) {
  return <RoutingMapInner {...props} />;
}
