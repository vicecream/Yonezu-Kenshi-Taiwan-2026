import { defineConfig } from "vite";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { homeHtml } from "./src/ui/home.js";
import { SITE } from "./src/data.js";

export function deploymentSiteUrl(env = process.env){
  const configured = env.SITE_URL || env.CF_PAGES_URL || SITE.url;
  if (!configured) return null;
  const url = new URL(configured);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/"){
    throw new Error("SITE_URL / Cloudflare Pages URL must be an HTTPS site root without credentials, query or hash.");
  }
  return url.href;
}

function prerenderHome(siteUrl){
  return { name: "prerender-home", transformIndexHtml: { order: "pre", handler(html){
    const { version } = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    const metadata = siteUrl
      ? `<link rel="canonical" href="${siteUrl}"><meta property="og:url" content="${siteUrl}"><meta property="og:image" content="${siteUrl}icon-512.png">`
      : '<meta name="robots" content="noindex, nofollow">';
    return html.replace("<!-- deployment-meta -->", metadata)
      .replace('<main id="app"></main>', `<main id="app">${homeHtml(`v${version}`)}</main>`);
  } } };
}

function copyRootStaticAssets(siteUrl){
  let buildAssetUrls = [];
  let outputDir = resolve("dist");
  return {
    name: "copy-root-static-assets", apply: "build",
    configResolved(config){ outputDir = resolve(config.build.outDir); },
    generateBundle(_options, bundle){
      buildAssetUrls = Object.keys(bundle).filter(file => file.startsWith("assets/")).map(file => `./${file}`);
    },
    closeBundle(){
      for (const file of ["sw.js", "manifest.json", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]){
        cpSync(resolve(file), resolve(outputDir, file));
      }
      writeFileSync(resolve(outputDir, "robots.txt"), siteUrl ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n` : "User-agent: *\nDisallow: /\n");
      if (siteUrl) writeFileSync(resolve(outputDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}</loc></url></urlset>\n`);
      cpSync(resolve("images"), resolve(outputDir, "images"), { recursive: true });
      const workerPath = resolve(outputDir, "sw.js");
      const worker = readFileSync(workerPath, "utf8").replace("const VITE_BUILD_ASSETS = [];", `const VITE_BUILD_ASSETS = ${JSON.stringify([...new Set(buildAssetUrls)])};`);
      writeFileSync(workerPath, worker);
    },
  };
}

export default defineConfig(() => {
  const siteUrl = deploymentSiteUrl();
  return { base: "./", plugins: [prerenderHome(siteUrl), copyRootStaticAssets(siteUrl)], build: { outDir: "dist", emptyOutDir: true, assetsInlineLimit: 0 } };
});
