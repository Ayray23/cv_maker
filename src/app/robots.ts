import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/editor/",
        "/payments",
        "/payment/",
        "/print/",
        "/reset-password",
      ],
    },
  };
}
