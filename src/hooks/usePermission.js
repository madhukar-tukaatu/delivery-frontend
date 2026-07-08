export const usePermissions = () => {
  const { user } = useAuth(); // your auth context

  const can = (permission) => user?.permissions?.includes(permission) || false;
  return { can };
};