import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

export default function TrackingInput({ compact = false }) {
  return (
    <form action="/site/track" className={`flex w-full ${compact ? "max-w-xl" : "max-w-2xl"} gap-2`}>
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          name="tracking"
          placeholder="Enter tracking number e.g. TKT-2026-849251"
          className={`w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
            compact ? "h-12" : "h-14"
          }`}
        />
      </div>
      <button
        type="submit"
        className={`${compact ? "h-12 px-4" : "h-14 px-6"} inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700`}
      >
        <span className="hidden sm:inline">Track</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
