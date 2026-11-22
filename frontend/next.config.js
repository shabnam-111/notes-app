/** @type {import('next').NextConfig} */
module.exports = {
  async rewrites() {
    return process.env.CONTAINER_BUILD === '1'
      ? [{ source: '/api/v1/:path*', destination: 'http://backend:4000/api/v1/:path*' }]
      : [];
  },
};
