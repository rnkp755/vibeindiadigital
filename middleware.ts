import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes — accessible without authentication
const isPublicRoute = createRouteMatcher([
  "/",                          // Landing page
  "/sign-in(.*)",               // Clerk sign-in
  "/sign-up(.*)",               // Clerk sign-up
  "/api/webhooks/clerk(.*)",    // Clerk user.created webhook
  "/api/plans(.*)",             // Plans are publicly readable
]);

// Admin-only routes
const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Allow public routes through
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Require authentication for everything else
  if (!userId) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Guard admin routes
  if (isAdminRoute(req)) {
    const role =
      (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role ??
      (sessionClaims?.metadata as { role?: string } | undefined)?.role ??
      (sessionClaims?.public_metadata as { role?: string } | undefined)?.role;

    // If role is present and not admin, block here.
    // If role is missing from session claims, allow through and let server checks handle it.
    if (role && role !== "admin") {
      const dashboardUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - any file with an extension (e.g. .js, .css, .png)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
