/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		ignoreDuringBuilds: true,
	},
	images: { unoptimized: true },
	experimental: {
		serverComponentsExternalPackages: ["tesseract.js"],
	},
};

module.exports = nextConfig;
