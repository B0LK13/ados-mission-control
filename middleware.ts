import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqualString } from "@/lib/security/timing-safe";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const AUTH_EXEMPT_PATHS = new Set(["/api/health", "/api/v1/health", "/api/v1/metrics"]);

const PHASE2_POST_ROUTES = [
  /^\/api\/v1\/approvals\/[^/]+\/(approve|reject|withdraw)$/,
  /^\/api\/v1\/owner-gates\/[^/]+\/(challenge|decide)$/,
];

const PHASE3_POST_ROUTES = [
  /^\/api\/v1\/operations\/dispatch$/,
  /^\/api\/v1\/operations\/campaign-control$/,
];

function phase2Enabled(): boolean {
  return process.env.MISSION_CONTROL_PHASE2_COMMANDS?.trim().toLowerCase() === "enabled";
}

function phase3Enabled(): boolean {
  return process.env.MISSION_CONTROL_PHASE3_COMMANDS?.trim().toLowerCase() === "enabled";
}

function allowedMutation(pathname: string, method: string): "phase2" | "phase3" | null {
  if (method !== "POST") return null;
  if (phase2Enabled() && PHASE2_POST_ROUTES.some((pattern) => pattern.test(pathname))) return "phase2";
  if (phase3Enabled() && PHASE3_POST_ROUTES.some((pattern) => pattern.test(pathname))) return "phase3";
  return null;
}

function credentials(request: NextRequest): { username: string; password: string } | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return null;
  try {
    const decoded = atob(authorization.slice(6).trim());
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

function authResponse(request: NextRequest, status: 401 | 503, code: string, message: string) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (status === 401) headers["WWW-Authenticate"] = 'Basic realm="ADOS Mission Control", charset="UTF-8"';
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: { code, message } }, { status, headers });
  }
  return new NextResponse(message, { status, headers });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const mutationClass = allowedMutation(pathname, method);

  if (pathname.startsWith("/api/") && !SAFE_METHODS.has(method) && !mutationClass) {
    return NextResponse.json(
      { error: { code: "READ_ONLY_V2", message: "Mission Control V2 exposes no mutation endpoints." } },
      { status: 405, headers: { Allow: "GET, HEAD, OPTIONS", "X-ADOS-Authority": "read-only" } },
    );
  }

  if (process.env.MISSION_CONTROL_AUTH_MODE?.trim().toLowerCase() !== "basic") {
    if (mutationClass) {
      const response = NextResponse.next();
      response.headers.set("X-ADOS-Authority", mutationClass === "phase3" ? "phase3-commands" : "phase2-commands");
      return response;
    }
    return NextResponse.next();
  }
  if (AUTH_EXEMPT_PATHS.has(pathname)) return NextResponse.next();

  const expectedUsername = process.env.MISSION_CONTROL_AUTH_USER?.trim() || "owner";
  const expectedPassword = process.env.MISSION_CONTROL_AUTH_SECRET || "";
  if (!expectedPassword) {
    return authResponse(request, 503, "AUTH_NOT_CONFIGURED", "Mission Control authentication is enabled but not configured.");
  }
  const supplied = credentials(request);
  if (
    !supplied ||
    !timingSafeEqualString(supplied.username, expectedUsername) ||
    !timingSafeEqualString(supplied.password, expectedPassword)
  ) {
    return authResponse(request, 401, "AUTHENTICATION_REQUIRED", "Valid Mission Control credentials are required.");
  }

  const response = NextResponse.next();
  if (mutationClass) {
    response.headers.set("X-ADOS-Authority", mutationClass === "phase3" ? "phase3-commands" : "phase2-commands");
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
