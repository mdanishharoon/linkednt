// Account status fetcher — wraps Supabase's PostgREST RPC for
// public.my_account_status(). Returns the signed-in user's email, plan,
// free trial remainder, and paid credits balance in one round-trip.
//
// Cached in chrome.storage.local under "account.status" so the popup can
// show a balance instantly on open and refresh in the background. The cache
// is also bumped after every successful rewrite so the displayed number
// ticks down without the popup re-fetching.

import { getAccessToken } from "./auth";

const LOG = "[linkednt:account]";

const SUPABASE_URL = process.env.PLASMO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const STATUS_KEY = "account.status";

export interface AccountStatus {
  email: string | null;
  plan: "free" | "paid";
  freeRemaining: number;
  paidBalance: number;
  /** Credits debited from the paid balance today (UTC). Server caps at
   *  DAILY_PAID_CAP per user. Free-trial usage doesn't count toward this. */
  dailyUsed: number;
  fetchedAt: number;
}

export type AccountStatusResult =
  | { ok: true; status: AccountStatus }
  | { ok: false; code: AccountStatusErrorCode; error: string };

export type AccountStatusErrorCode =
  | "NOT_CONFIGURED"
  | "UNAUTHORIZED"
  | "HTTP"
  | "NETWORK";

export async function fetchAccountStatus(): Promise<AccountStatusResult> {
  const jwt = await getAccessToken();
  if (!jwt) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      error: "Not signed in.",
    };
  }

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/my_account_status`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
  } catch (err) {
    return {
      ok: false,
      code: "NETWORK",
      error: err instanceof Error ? err.message : "Network error.",
    };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        error: `Account status returned ${res.status}.`,
      };
    }
    return {
      ok: false,
      code: "HTTP",
      error: `Account status returned ${res.status}.`,
    };
  }

  const data = (await res.json().catch(() => null)) as {
    email?: string | null;
    plan?: string;
    free_remaining?: number;
    paid_balance?: number;
    daily_used?: number;
  } | null;

  if (!data) {
    return { ok: false, code: "HTTP", error: "Empty account status body." };
  }

  const status: AccountStatus = {
    email: data.email ?? null,
    plan: data.plan === "paid" ? "paid" : "free",
    freeRemaining: data.free_remaining ?? 0,
    paidBalance: data.paid_balance ?? 0,
    dailyUsed: data.daily_used ?? 0,
    fetchedAt: Date.now(),
  };
  await chrome.storage.local.set({ [STATUS_KEY]: status });
  console.info(`${LOG} status`, {
    plan: status.plan,
    freeRemaining: status.freeRemaining,
    paidBalance: status.paidBalance,
  });
  return { ok: true, status };
}

export async function getCachedAccountStatus(): Promise<AccountStatus | null> {
  const raw = await chrome.storage.local.get(STATUS_KEY);
  return (raw[STATUS_KEY] as AccountStatus | undefined) ?? null;
}

export async function clearAccountStatus(): Promise<void> {
  await chrome.storage.local.remove(STATUS_KEY);
}

/**
 * Decrement the cached balance by `cost` after a successful rewrite, so the
 * popup updates without a network round-trip. The real number gets refreshed
 * on the next popup open.
 */
export async function decrementCachedBalance(cost: number): Promise<void> {
  const status = await getCachedAccountStatus();
  if (!status) return;

  let { freeRemaining, paidBalance, dailyUsed } = status;
  if (freeRemaining >= cost) {
    freeRemaining -= cost;
  } else {
    paidBalance = Math.max(0, paidBalance - cost);
    // Mirror the server's check_and_bump_daily — only the paid path counts
    // toward the daily soft cap.
    dailyUsed += cost;
  }
  await chrome.storage.local.set({
    [STATUS_KEY]: { ...status, freeRemaining, paidBalance, dailyUsed },
  });
}
