import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent, clerkClient } from "@clerk/nextjs/server";
import { sendWelcomeEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable.");
    return new Response("Server misconfiguration", { status: 500 });
  }

  // ── Read Svix headers ──────────────────────────────────────────────────────
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  // ── Verify signature ───────────────────────────────────────────────────────
  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  // ── Handle events ──────────────────────────────────────────────────────────
  if (evt.type === "user.created") {
    const userData = evt.data as {
      id: string;
      email_addresses: { id: string; email_address: string }[];
      first_name?: string | null;
      public_metadata?: { role?: string };
      primary_email_address_id?: string | null;
    };

    const { id: userId, email_addresses, first_name, public_metadata } =
      userData;

    // Only set metadata if it hasn't been set already (idempotency guard)
    if (public_metadata?.role) {
      return new Response("Metadata already set", { status: 200 });
    }

    const primaryEmailId = userData.primary_email_address_id ?? undefined;
    const primaryEmail =
      (primaryEmailId
        ? email_addresses.find((e) => e.id === primaryEmailId)?.email_address
        : undefined) ?? email_addresses[0]?.email_address;

    try {
      const client = await clerkClient();

      // Set initial public metadata
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          role: "user",
          credits: 0,
          socials: [] as { platform: string; link: string }[],
        },
      });

      // Fire-and-forget welcome email (don't fail the webhook on email error)
      if (primaryEmail) {
        sendWelcomeEmail({
          email: primaryEmail,
          firstName: first_name ?? undefined,
        }).catch((err) =>
          console.error("Failed to send welcome email:", err)
        );
      }

      console.log(`[Clerk Webhook] Initialized metadata for user ${userId}`);
    } catch (err) {
      console.error(`[Clerk Webhook] Failed to update metadata for ${userId}:`, err);
      // Return 500 so Clerk retries the webhook
      return new Response("Failed to update user metadata", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
