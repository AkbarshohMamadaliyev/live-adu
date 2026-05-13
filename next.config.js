/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sequelize va pg ni server bundlinga qo'shmaymiz (dynamic require muammosi)
  serverExternalPackages: ['sequelize', 'pg', 'pg-hstore'],
  // HLS segmentlarni public/hls dan serve qilamiz
  async headers() {
    return [
      {
        source: '/hls/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
