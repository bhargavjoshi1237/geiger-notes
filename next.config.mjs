/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  transpilePackages: ["@geiger/ui"],
  basePath: isProd ? '/notes' : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? '/notes' : '',
  },
}

export default nextConfig
