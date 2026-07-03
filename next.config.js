const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  webpack: (config) => {
    config.resolve.alias["@"] = path.join(process.cwd(), "src");
    return config;
  },
};

module.exports = nextConfig;
