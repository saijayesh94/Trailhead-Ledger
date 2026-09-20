/// <reference types="@cloudflare/workers-types" />

// Reverse proxy: every request to /api/* on the Pages domain is forwarded to
// the Worker here, server-side. The browser only ever talks to one origin
// (this Pages site), so the session cookie is first-party and SameSite=Lax
// works normally — no custom domain needed to make frontend and backend
// "same-site".
//
// API_ORIGIN is a Pages environment variable (Settings > Environment
// variables), e.g. https://trailhead-ledger-api.vsaijayesh94.workers.dev
// Local dev doesn't run this file at all — the Vite dev-server proxy
// (vite.config.ts) does the equivalent job for `npm run dev`.

interface Env {
  API_ORIGIN: string
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const targetUrl = context.env.API_ORIGIN + url.pathname + url.search

  // Rewrites the URL while keeping method, headers (incl. Cookie) and body intact.
  const proxiedRequest = new Request(targetUrl, context.request)
  return fetch(proxiedRequest)
}
