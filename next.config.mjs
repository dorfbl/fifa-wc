/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Ensure server-side code uses node runtime
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcryptjs'],
  },
};

export default nextConfig;
