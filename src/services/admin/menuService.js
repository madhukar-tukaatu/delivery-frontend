import api from "@/lib/api";

export async function getMyMenus(section) {
  const response = await api.get("/me/menus", {
    params: section ? { section } : {},
  });

  return response.data?.data || [];
}
