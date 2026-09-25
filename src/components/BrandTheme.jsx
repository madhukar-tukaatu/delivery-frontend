"use client";
import { ConfigProvider } from "antd";
export default function BrandTheme({ children }) {
  return <ConfigProvider theme={{token:{colorPrimary:"#1677b8",colorLink:"#125f93",colorText:"#0b1f33",colorTextSecondary:"#526879",colorBgLayout:"#f7f8fa",colorBorder:"#d3e0e9",borderRadius:10,fontFamily:"Inter, system-ui, sans-serif",controlHeight:40},components:{Card:{borderRadiusLG:18},Table:{headerBg:"#f1f6fa",headerColor:"#435e71"},Menu:{itemSelectedBg:"#e8f3fa",itemSelectedColor:"#125f93",itemBorderRadius:10},Button:{fontWeight:600},Modal:{borderRadiusLG:20}}}}>{children}</ConfigProvider>;
}
