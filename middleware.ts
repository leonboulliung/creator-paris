import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only these routes require an authenticated user. The feed (/), detail
// pages (/post/[id]), and the Clerk-hosted auth routes stay public.
const isProtectedRoute = createRouteMatcher(["/carnet(.*)", "/onboarding(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
