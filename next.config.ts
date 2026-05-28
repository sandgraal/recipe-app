import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase storage
      {
        protocol: 'https',
        hostname: 'cjnwvxtomwyszcfuvgpw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // All external recipe image hosts (og:image sources)
      { protocol: 'https', hostname: '**.allrecipes.com' },
      { protocol: 'https', hostname: '**.seriouseats.com' },
      { protocol: 'https', hostname: '**.simplyrecipes.com' },
      { protocol: 'https', hostname: '**.thekitchn.com' },
      { protocol: 'https', hostname: '**.foodnetwork.com' },
      { protocol: 'https', hostname: '**.epicurious.com' },
      { protocol: 'https', hostname: '**.bonappetit.com' },
      { protocol: 'https', hostname: '**.tasty.co' },
      { protocol: 'https', hostname: '**.delish.com' },
      { protocol: 'https', hostname: '**.cooking.nytimes.com' },
      { protocol: 'https', hostname: '**.saltandlavender.com' },
      { protocol: 'https', hostname: '**.halfbakedharvest.com' },
      { protocol: 'https', hostname: '**.pinchofyum.com' },
      { protocol: 'https', hostname: '**.minimalistbaker.com' },
      { protocol: 'https', hostname: '**.skinnytaste.com' },
      { protocol: 'https', hostname: '**.budgetbytes.com' },
      { protocol: 'https', hostname: '**.recipetineats.com' },
      { protocol: 'https', hostname: '**.inspiredtaste.net' },
      { protocol: 'https', hostname: '**.onceuponachef.com' },
      { protocol: 'https', hostname: '**.smittenkitchen.com' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.wp.com' },
      { protocol: 'https', hostname: '**.wordpress.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: '**.imgix.net' },
      // Catch-all for any other https image source
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
