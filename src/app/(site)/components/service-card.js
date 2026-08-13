import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function ServiceCard({ icon: Icon, title, text, href }) {
  return (
    <Link
      href={href}
      className="site-card site-card-hover group rounded-3xl p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon className="h-6 w-6" />
        </div>
        <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:text-blue-600" />
      </div>
      <h3 className="mt-7 text-lg font-extrabold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </Link>
  );
}
