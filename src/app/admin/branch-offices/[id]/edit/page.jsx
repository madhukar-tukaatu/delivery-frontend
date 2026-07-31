import { redirect } from "next/navigation";

export default function LegacyBranchOfficeEditPage({ params }) {
  redirect(`/admin/branch-offices/${params.id}?edit=identity`);
}
