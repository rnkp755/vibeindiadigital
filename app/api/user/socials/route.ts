import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── PATCH /api/user/socials ──────────────────────────────────────────────────
// Updates the authenticated user's social links in Clerk's public metadata.

export async function PATCH(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { socials?: { platform: string; link: string }[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { socials } = body;

  if (!Array.isArray(socials)) {
    return NextResponse.json(
      { error: "Invalid payload: 'socials' must be an array." },
      { status: 400 }
    );
  }

  // Validate each social entry
  for (const s of socials) {
    if (typeof s.platform !== "string" || typeof s.link !== "string") {
      return NextResponse.json(
        {
          error:
            "Each social entry must have 'platform' (string) and 'link' (string).",
        },
        { status: 400 }
      );
    }
  }

  try {
    const client = await clerkClient();

    // Fetch current public metadata so we don't overwrite other fields
    const clerkUser = await client.users.getUser(userId);
    const existingMeta = (clerkUser.publicMetadata as Record<string, unknown>) ?? {};

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...existingMeta,
        socials: socials.map((s) => ({
          platform: s.platform.trim().toLowerCase(),
          link: s.link.trim(),
        })),
      },
    });

    return NextResponse.json({
      message: "Social links updated successfully.",
      socials,
    });
  } catch (err) {
    console.error("[PATCH /api/user/socials] Clerk error:", err);
    return NextResponse.json(
      { error: "Failed to update social links. Please try again." },
      { status: 500 }
    );
  }
}
