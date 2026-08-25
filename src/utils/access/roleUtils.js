export function prettifyLabel(value = "") {
  return String(value)
    .replaceAll("-", "_")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function prettifyPermission(permission = "") {
  if (!permission) {
    return "";
  }

  const parts = String(permission).split(".");

  if (parts.length === 1) {
    return prettifyLabel(parts[0]);
  }

  const action = parts.pop();
  const module = parts.join(" ");

  return `${prettifyLabel(action)} ${prettifyLabel(module)}`;
}

export function getPermissionColor(name = "") {
  if (name.endsWith(".view")) return "blue";
  if (name.endsWith(".create")) return "green";
  if (name.endsWith(".update")) return "orange";
  if (name.endsWith(".edit")) return "orange";
  if (name.endsWith(".delete")) return "red";
  if (name.endsWith(".approve")) return "purple";
  if (name.endsWith(".reject")) return "magenta";
  if (name.endsWith(".status")) return "cyan";
  if (name.endsWith(".manage")) return "volcano";

  return "default";
}

export function normalizePermissions(permissions = []) {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions
    .map((permission) => {
      if (typeof permission === "string") {
        return {
          name: permission,
          label: prettifyPermission(permission),
          description: "",
        };
      }

      return {
        id: permission.id,
        name: permission.name,
        label:
          permission.label ||
          prettifyPermission(permission.name),
        description: permission.description || "",
      };
    })
    .filter((permission) => permission.name);
}

export function normalizePermissionGroups(raw = []) {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.map((group) => ({
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
          "general"
        ),

      permissions: normalizePermissions(
        group.permissions || []
      ),
    }));
  }

  return Object.entries(raw).map(
    ([key, permissions]) => ({
      key,
      label: prettifyLabel(key),
      permissions: normalizePermissions(
        permissions || []
      ),
    })
  );
}

export function roleLabel(role) {
  if (!role) {
    return "";
  }

  if (typeof role === "string") {
    return prettifyLabel(role);
  }

  return (
    role.label ||
    prettifyLabel(role.name)
  );
}