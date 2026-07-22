"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Shield,
  Menu,
  Package,
  PackagePlus,
  Truck,
  Store,
  RefreshCcw,
  ClipboardCheck,
  MapPinned,
  Banknote,
  Settings,
  Route,
  Building2,
  Circle,
} from "lucide-react";
import { getMyMenus } from "@/services/menuService";

const iconMap = {
  dashboard: LayoutDashboard,
  users: Users,
  shield: Shield,
  menu: Menu,
  package: Package,
  "package-plus": PackagePlus,
  truck: Truck,
  store: Store,
  refresh: RefreshCcw,
  checklist: ClipboardCheck,
  pickup: MapPinned,
  money: Banknote,
  settings: Settings,
  route: Route,
  branch: Building2,
  settlement: Banknote,
};

export default function DynamicSidebar({
  section = "admin",
  title = "TUKAATU EXPRESS",
}) {
  const pathname = usePathname();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadMenus() {
      try {
        const data = await getMyMenus(section);
        if (active) setMenus(data);
      } catch (error) {
        console.error("Failed to load menus", error);
        if (active) setMenus([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMenus();

    return () => {
      active = false;
    };
  }, [section]);

  return (
    <aside className="w-64 min-h-screen border-r bg-white p-4">
      <div className="mb-6 text-lg font-semibold text-gray-900">{title}</div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading menu...</div>
      ) : menus.length === 0 ? (
        <div className="rounded-lg border border-dashed p-3 text-sm text-gray-500">
          No menu available for this role.
        </div>
      ) : (
        <nav className="space-y-1">
          {menus.map((menu) => (
            <MenuLink
              key={menu.id || menu.path}
              menu={menu}
              pathname={pathname}
            />
          ))}
        </nav>
      )}
    </aside>
  );
}

function MenuLink({ menu, pathname }) {
  const Icon = iconMap[menu.icon] || Circle;
  const active = pathname === menu.path || pathname.startsWith(`${menu.path}/`);

  return (
    <div>
      <Link
        href={menu.path || "#"}
        className={[
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
          active ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100",
        ].join(" ")}
      >
        <Icon size={18} />
        <span>{menu.label}</span>
      </Link>

      {menu.children?.length > 0 && (
        <div className="ml-6 mt-1 space-y-1">
          {menu.children.map((child) => (
            <MenuLink
              key={child.id || child.path}
              menu={child}
              pathname={pathname}
            />
          ))}
        </div>
      )}
    </div>
  );
}
