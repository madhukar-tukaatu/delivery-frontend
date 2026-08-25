/**
 * Convert technical names into readable labels.
 *
 * branches.sub_offices
 *      ↓
 * Branches Sub Offices
 */
export function prettifyLabel(value = "") {
  return String(value)
    .replaceAll("-", "_")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

/**
 * Convert permission name into readable label.
 *
 * branches.sub_offices.create
 *      ↓
 * Create Branches Sub Offices
 */
export function prettifyPermission(
  permission = ""
) {
  const parts = String(permission).split(".");

  if (parts.length === 1) {
    return prettifyLabel(permission);
  }

  const action = parts.pop();

  return `${prettifyLabel(action)} ${prettifyLabel(
    parts.join(" ")
  )}`;
}

/**
 * Permission tag color.
 */
export function getPermissionColor(
  permission = ""
) {
  if (permission.endsWith(".view")) {
    return "blue";
  }

  if (permission.endsWith(".create")) {
    return "green";
  }

  if (
    permission.endsWith(".update") ||
    permission.endsWith(".edit")
  ) {
    return "orange";
  }

  if (permission.endsWith(".delete")) {
    return "red";
  }

  if (permission.endsWith(".approve")) {
    return "purple";
  }

  if (permission.endsWith(".reject")) {
    return "magenta";
  }

  if (permission.endsWith(".status")) {
    return "cyan";
  }

  if (permission.endsWith(".manage")) {
    return "volcano";
  }

  return "default";
}

/**
 * Normalize a permission object/string.
 */
export function normalizePermission(
  permission
) {
  if (typeof permission === "string") {
    return {
      name: permission,
      label: prettifyPermission(permission),
      description: "",
    };
  }

  if (!permission) {
    return null;
  }

  return {
    id: permission.id,
    name: permission.name,
    label:
      permission.label ||
      prettifyPermission(permission.name),
    description:
      permission.description || "",
  };
}

/**
 * Normalize permission collection.
 */
export function normalizePermissions(
  permissions = []
) {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions
    .map(normalizePermission)
    .filter(
      (permission) =>
        permission?.name
    );
}

/**
 * Normalize grouped permission API response.
 *
 * Supports:
 *
 * [
 *   {
 *      group_key: "branches",
 *      group_label: "Branches",
 *      permissions: [...]
 *   }
 * ]
 *
 * and also:
 *
 * {
 *    branches: [...]
 * }
 */
export function normalizePermissionGroups(
  raw
) {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw
      .map((group) => ({
        key:
          group.group_key ||
          group.key ||
          group.group ||
          "general",

        label:
          group.group_label ||
          group.label ||
          prettifyLabel(
            group.group_key ||
              group.key ||
              group.group ||
              "general"
          ),

        permissions:
          normalizePermissions(
            group.permissions || []
          ),
      }))
      .filter(
        (group) =>
          group.permissions.length > 0
      );
  }

  return Object.entries(raw)
    .map(
      ([key, permissions]) => ({
        key:
          key || "general",

        label:
          prettifyLabel(
            key || "general"
          ),

        permissions:
          normalizePermissions(
            permissions || []
          ),
      })
    )
    .filter(
      (group) =>
        group.permissions.length > 0
    );
}

/**
 * Extract permission names from role.
 */
export function getRolePermissionNames(
  role
) {
  if (!role?.permissions) {
    return [];
  }

  return role.permissions
    .map((permission) =>
      typeof permission === "string"
        ? permission
        : permission?.name
    )
    .filter(Boolean);
}