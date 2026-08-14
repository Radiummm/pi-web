import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { NextResponse } from "next/server";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { writePrivateFileAtomicSync } from "@/lib/atomic-file";
import {
  buildPermissionModeConfig,
  inferPermissionMode,
  isPermissionMode,
} from "@/lib/permission-modes";
import { reloadIdleRpcSessions } from "@/lib/rpc-manager";

export const dynamic = "force-dynamic";

function configPath(): string {
  return join(getAgentDir(), "extensions", "pi-permission-system", "config.json");
}

function readConfig(): Record<string, unknown> {
  const path = configPath();
  if (!existsSync(path)) return {};
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function GET() {
  try {
    const path = configPath();
    return NextResponse.json({
      installed: existsSync(dirname(path)),
      mode: inferPermissionMode(readConfig()),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json() as { mode?: unknown };
    if (!isPermissionMode(body.mode)) {
      return NextResponse.json({ error: "Invalid permission mode" }, { status: 400 });
    }

    const path = configPath();
    if (!existsSync(dirname(path))) {
      return NextResponse.json({ error: "@gotgenes/pi-permission-system is not installed" }, { status: 409 });
    }

    const next = {
      ...readConfig(),
      ...buildPermissionModeConfig(body.mode),
      permissionReviewLog: true,
    };
    mkdirSync(dirname(path), { recursive: true });
    writePrivateFileAtomicSync(path, `${JSON.stringify(next, null, 2)}\n`);
    const reload = await reloadIdleRpcSessions();
    return NextResponse.json({ success: true, mode: body.mode, reload });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
