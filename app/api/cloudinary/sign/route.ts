import { auth } from "@clerk/nextjs/server";
import { generateSignedUploadParams } from "@/lib/cloudinary";
import { checkResourceExists } from "@/lib/cloudinary";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const emailPrefix = searchParams.get("emailPrefix");

  if (!orderId || !emailPrefix) {
    return Response.json(
      { error: "Missing required parameters: orderId, emailPrefix" },
      { status: 400 }
    );
  }

  // Validate orderId is 4 alphanumeric chars (last 4 of Date.now())
  if (!/^\d{4}$/.test(orderId)) {
    return Response.json(
      { error: "Invalid orderId format. Must be 4 digits." },
      { status: 400 }
    );
  }

  // Sanitise emailPrefix — strip anything that isn't alphanumeric, dot, hyphen, or underscore
  const safePrefix = emailPrefix.replace(/[^a-z0-9.\-_]/gi, "").toLowerCase();
  if (!safePrefix) {
    return Response.json(
      { error: "Invalid emailPrefix" },
      { status: 400 }
    );
  }

  try {
    const params = generateSignedUploadParams(safePrefix, orderId);
    return Response.json(params);
  } catch (err) {
    console.error("[Cloudinary Sign] Error generating signed params:", err);
    return Response.json(
      { error: "Failed to generate signed upload parameters" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cloudinary/sign
 * Check whether a previously uploaded resource exists in Cloudinary.
 * Used by the frontend to determine if a user can resume from Stage 1.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { orderId?: string; emailPrefix?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId, emailPrefix } = body;

  if (!orderId || !emailPrefix) {
    return Response.json(
      { error: "Missing required fields: orderId, emailPrefix" },
      { status: 400 }
    );
  }

  const safePrefix = emailPrefix.replace(/[^a-z0-9.\-_]/gi, "").toLowerCase();
  const publicId = `vid/${safePrefix}/order_${orderId}/release`;

  try {
    const exists = await checkResourceExists(publicId, "raw");
    return Response.json({ exists, publicId });
  } catch (err) {
    console.error("[Cloudinary Check] Error checking resource:", err);
    return Response.json(
      { error: "Failed to check resource existence" },
      { status: 500 }
    );
  }
}
