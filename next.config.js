/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     // Prevent 'fs' and optional MongoDB dependencies from being resolved on the client side
  //     config.resolve.fallback = {
  //       ...config.resolve.fallback,
  //       fs: false,
  //       kerberos: false,
  //       '@mongodb-js/zstd': false,
  //       '@aws-sdk/credential-providers': false,
  //       'gcp-metadata': false,
  //       snappy: false,
  //       aws4: false,
  //       'mongodb-client-encryption': false,
  //     };
  //   }
  //   return config;
  // },
  env: {
    NEXT_PUBLIC_API_URL: 'http://localhost:5050',
    // NEXT_PUBLIC_API_URL: 'http://153.92.211.110:505:5050',

  },
};

module.exports = nextConfig;