import type { MetadataRoute } from "next"
import { getAllMusicals } from "@/data/musicals"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://arte-tickecting.vercel.app"
  const lastModified = new Date()

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/performances`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...getAllMusicals().map((musical) => ({
      url: `${baseUrl}/performances/${musical.id}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}/booking/verify`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/club`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ]
}
