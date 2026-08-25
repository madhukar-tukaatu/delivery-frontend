export function prettifyRole(value = "") {
  return value
    .replaceAll("-", "_")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getRoleLabel(role) {
  if (!role) {
    return "";
  }

  return role.label || prettifyRole(role.name);
}

export function getUserRoleName(user) {
  if (!user) {
    return null;
  }

  if (user.roles?.length) {
    return user.roles[0]?.name || null;
  }

  return user.role || null;
}

export function getUserRoleLabel(user) {
  const roleName = getUserRoleName(user);

  if (!roleName) {
    return "No Role";
  }

  const role = user.roles?.find(
    (item) => item.name === roleName
  );

  return role?.label || prettifyRole(roleName);
}

export function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}