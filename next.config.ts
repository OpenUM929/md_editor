import type { NextConfig } from "next"
import withSerwistInit from "@serwist/next"

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
})

const config: NextConfig = {
  allowedDevOrigins: ["10.10.102.223"],
}

const nextConfig = process.env.NODE_ENV === "production" ? withSerwist(config) : config

export default nextConfig
