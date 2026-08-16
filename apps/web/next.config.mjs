/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STANDALONE ? "standalone" : undefined,
  transpilePackages: ["@asistencias/db"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
};

export default nextConfig;
