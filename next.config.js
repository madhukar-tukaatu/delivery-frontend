/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/franchise/apply",
        destination: "/contact?subject=Franchise%20Application#contact-form",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;