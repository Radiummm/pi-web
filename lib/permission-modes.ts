export const PERMISSION_MODES = ["workspace", "risk", "full"] as const;

export type PermissionMode = (typeof PERMISSION_MODES)[number];

type PermissionAction = "allow" | "ask";
type PermissionRules = Record<string, PermissionAction | Record<string, PermissionAction>>;

export interface PermissionModeConfig {
  yoloMode: boolean;
  doublePressToConfirm: boolean;
  permission: PermissionRules;
}

const SENSITIVE_PATHS = {
  "*": "allow",
  "*.env": "ask",
  "*.env.*": "ask",
  "~/.ssh/*": "ask",
} as const;

export function isPermissionMode(value: unknown): value is PermissionMode {
  return typeof value === "string" && (PERMISSION_MODES as readonly string[]).includes(value);
}

export function buildPermissionModeConfig(mode: PermissionMode): PermissionModeConfig {
  if (mode === "full") {
    return {
      yoloMode: true,
      doublePressToConfirm: false,
      permission: {
        "*": "allow",
        bash: { "*": "allow" },
        path: { "*": "allow" },
        external_directory: "allow",
        skill: { "*": "allow" },
        mcp: { "*": "allow" },
      },
    };
  }

  const shared: PermissionRules = {
    "*": "allow",
    path: { ...SENSITIVE_PATHS },
    external_directory: "ask",
    web_search: mode === "workspace" ? "ask" : "allow",
    fetch_content: mode === "workspace" ? "ask" : "allow",
    get_search_content: "allow",
  };

  return {
    yoloMode: false,
    doublePressToConfirm: false,
    permission: {
      ...shared,
      bash: mode === "workspace"
        ? { "*": "ask" }
        : {
            "*": "allow",
            "rm *": "ask",
            "rmdir *": "ask",
            "sudo *": "ask",
            "doas *": "ask",
            "chmod *": "ask",
            "chown *": "ask",
            "git push *": "ask",
            "git reset --hard*": "ask",
            "git clean *": "ask",
            "npm publish*": "ask",
            "pnpm publish*": "ask",
            "yarn npm publish*": "ask",
          },
    },
  };
}

export function inferPermissionMode(config: Record<string, unknown>): PermissionMode {
  if (config.yoloMode === true) return "full";
  const permission = config.permission;
  if (!permission || typeof permission !== "object" || Array.isArray(permission)) return "workspace";
  const bash = (permission as Record<string, unknown>).bash;
  if (bash && typeof bash === "object" && !Array.isArray(bash)) {
    return (bash as Record<string, unknown>)["*"] === "allow" ? "risk" : "workspace";
  }
  return bash === "allow" ? "risk" : "workspace";
}
