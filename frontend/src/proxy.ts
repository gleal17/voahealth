import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/ehrs", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
