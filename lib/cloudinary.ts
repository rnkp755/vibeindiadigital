import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
	cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure: true,
});

export default cloudinary;

/**
 * Generate a signed upload URL for direct browser-to-Cloudinary uploads.
 * The file is placed at: vid/{emailPrefix}/order_{orderId}/release
 */
export function generateSignedUploadParams(
	emailPrefix: string,
	orderId: string,
) {
	const timestamp = Math.round(Date.now() / 1000);
	const publicId = `vid/${emailPrefix}/order_${orderId}/release`;

	const paramsToSign: Record<string, string | number> = {
		timestamp,
		public_id: publicId,
		overwrite: "true",
		invalidate: "true",
	};

	const signature = cloudinary.utils.api_sign_request(
		paramsToSign,
		process.env.CLOUDINARY_API_SECRET!,
	);

	return {
		timestamp,
		signature,
		publicId,
		cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
		apiKey: process.env.CLOUDINARY_API_KEY!,
		uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`,
	};
}

export function generateSignedPaymentUploadParams(token: string) {
	const timestamp = Math.round(Date.now() / 1000);
	const publicId = `vid/payment_screenshots/screenshot_${token}`;

	const paramsToSign: Record<string, string | number> = {
		timestamp,
		public_id: publicId,
		overwrite: "true",
		invalidate: "true",
	};

	const signature = cloudinary.utils.api_sign_request(
		paramsToSign,
		process.env.CLOUDINARY_API_SECRET!,
	);

	return {
		timestamp,
		signature,
		publicId,
		cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
		apiKey: process.env.CLOUDINARY_API_KEY!,
		uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
	};
}

/**
 * Build the public Cloudinary URL for a raw resource (e.g., zip file).
 */
export function buildRawUrl(emailPrefix: string, orderId: string): string {
	const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
	const publicId = `vid/${emailPrefix}/order_${orderId}/release`;
	return `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}`;
}

/**
 * Check whether a resource exists in Cloudinary by its public ID.
 * Returns the resource info or null if not found.
 */
export async function checkResourceExists(
	publicId: string,
	resourceType: "raw" | "image" | "video" = "raw",
): Promise<boolean> {
	try {
		await cloudinary.api.resource(publicId, {
			resource_type: resourceType,
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Upload a buffer/base64 image to Cloudinary (used for payment screenshots
 * when the payment needs review).
 */
export async function uploadPaymentScreenshot(
	base64Data: string,
	token: string,
): Promise<string> {
	const result = await cloudinary.uploader.upload(base64Data, {
		folder: "vid/payment_screenshots",
		public_id: `screenshot_${token}`,
		resource_type: "image",
		overwrite: true,
		invalidate: true,
	});
	return result.secure_url;
}

/**
 * Delete a resource from Cloudinary.
 */
export async function deleteResource(
	publicId: string,
	resourceType: "raw" | "image" | "video" = "raw",
): Promise<void> {
	await cloudinary.uploader.destroy(publicId, {
		resource_type: resourceType,
	});
}

/**
 * Generate a signed download URL for a private/raw asset (e.g., zip files
 * for admin downloads).
 */
export function generateSignedDownloadUrl(
	emailPrefix: string,
	orderId: string,
	expiresInSeconds = 3600,
): string {
	const publicId = `vid/${emailPrefix}/order_${orderId}/release`;
	const expireAt = Math.round(Date.now() / 1000) + expiresInSeconds;

	return cloudinary.utils.private_download_url(publicId, "zip", {
		resource_type: "raw",
		expires_at: expireAt,
		attachment: true,
	});
}
