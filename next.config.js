/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // The video page needs camera and microphone for the call.
        source: '/consult/:path*',
        headers: [{ key: 'Permissions-Policy', value: 'camera=(self "https://meet.jit.si"), microphone=(self "https://meet.jit.si"), display-capture=(self "https://meet.jit.si")' }],
      },
    ];
  },
};
module.exports = nextConfig;
