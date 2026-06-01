// Plasmo (via Parcel) inlines `process.env.PLASMO_PUBLIC_*` references at
// build time, so they exist in the runtime bundle. This ambient declaration
// just teaches TypeScript about that surface without pulling in @types/node.

declare const process: {
  env: {
    PLASMO_PUBLIC_SUPABASE_URL?: string;
    PLASMO_PUBLIC_SUPABASE_ANON_KEY?: string;
    PLASMO_PUBLIC_SITE_URL?: string;
  };
};
