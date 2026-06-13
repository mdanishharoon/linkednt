// Single source of truth for the Supabase URL + publishable anon key the
// extension targets. Which env file Plasmo reads depends on the build:
//   - dev        (plasmo dev)                    → .env.development (sandbox)
//   - build:dev  (plasmo build --tag=development) → .env.development (sandbox)
//   - build:prod (plasmo build)                  → .env.production  (prod)
// The hardcoded fallbacks below are a safety net: if a build ever runs with
// no matching env file, the extension would otherwise ship empty strings and
// chrome.identity.launchWebAuthFlow would reject the auth URL with "Only
// http:// and https:// schemes are allowed".
//
// Both values are publicly safe:
//   - URL is just our project subdomain
//   - anon key is the Supabase publishable key, gated by RLS at the DB

const PROD_SUPABASE_URL = "https://gmzisvcyvjrsjrovvysz.supabase.co";
const PROD_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtemlzdmN5dmpyc2pyb3Z2eXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjgwNDksImV4cCI6MjA5NTkwNDA0OX0.m6qNSa8fktmPJlmbKyAR_SumOEUSXtQRvWK6wvz2TME";

export const SUPABASE_URL =
  process.env.PLASMO_PUBLIC_SUPABASE_URL || PROD_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY || PROD_SUPABASE_ANON_KEY;

export const SITE_URL =
  process.env.PLASMO_PUBLIC_SITE_URL || "https://linkednt.com";
