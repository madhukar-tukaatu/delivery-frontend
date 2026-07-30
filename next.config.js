/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /*
   * Standalone output is enabled only during
   * Docker/production builds.
   */
  ...(process.env.NEXT_STANDALONE === "true"
    ? {
        output: "standalone",
      }
    : {}),
};

module.exports = nextConfig;


/** @type {import('next').NextConfig}
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig; */