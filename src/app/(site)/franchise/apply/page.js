import Header from "../../components/header";
import Footer from "../../components/footer";
import FranchiseForm from "./franchise-form";

export const metadata = {
  title: "Apply for a Franchise",
};

export default function FranchiseApplyPage() {
  return (
    <div className="site-shell">
      <main className="site-grid bg-slate-50 px-6 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-blue-600">Franchise application</p>
            <h1 className="site-display mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Tell us where you want to build.</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">Submit your details and preferred territory. The application will be sent to the connected Tukaatu backend for review.</p>
          </div>
          <FranchiseForm />
        </div>
      </main>
    </div>
  );
}
