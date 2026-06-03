// Single source of truth for the Supabase URL + publishable anon key the
// extension targets. `plasmo build` only reads .env.production (not
// .env.development), so without these hardcoded fallbacks the prod build
// ships with empty strings — chrome.identity.launchWebAuthFlow then
// rejects the auth URL with "Only http:// and https:// schemes are
// allowed".
//
// Both values are publicly safe:
//   - URL is just our project subdomain
//   - anon JWT is the Supabase publishable key, gated by RLS at the DB
//
// If we ever split dev/prod environments these get moved back into a real
// .env.production file (PLASMO_PUBLIC_* takes precedence here).

const PROD_SUPABASE_URL = "https://gmzisvcyvjrsjrovvysz.supabase.co";
const PROD_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtemlzdmN5dmpyc2pyb3Z2eXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjgwNDksImV4cCI6MjA5NTkwNDA0OX0.m6qNSa8fktmPJlmbKyAR_SumOEUSXtQRvWK6wvz2TME";

export const SUPABASE_URL =
  process.env.PLASMO_PUBLIC_SUPABASE_URL || PROD_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY || PROD_SUPABASE_ANON_KEY;

export const SITE_URL =
  process.env.PLASMO_PUBLIC_SITE_URL || "https://linkednt.com";
