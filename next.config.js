/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		ignoreDuringBuilds: true,
	},
	images: { unoptimized: true },
	serverExternalPackages: ["tesseract.js"],
};

module.exports = nextConfig;
