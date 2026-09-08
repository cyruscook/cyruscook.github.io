import type { APIRoute } from "astro";
import { getProjectURLs } from "../lib/projects";

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error("Astro site URL is required to generate the sitemap");

  const urls = [new URL("/", site).href, ...(await getProjectURLs())];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
