import type { PlasmoMessaging } from "@plasmohq/messaging";

import { fetchAccountStatus, getCachedAccountStatus } from "~lib/account";
import type { AccountStatusResponse } from "~lib/types";

const LOG = "[linkednt:sw]";

/**
 * Returns the cached account status immediately when fresh, otherwise
 * fetches from Supabase. The popup hits this on mount.
 *
 * `cached` and `status` come back together when the cache is warm so the
 * popup can render instantly while a background refresh runs.
 */
const handler: PlasmoMessaging.MessageHandler<
  { force?: boolean } | undefined,
  AccountStatusResponse
> = async (req, res) => {
  const force = req.body?.force === true;
  const cached = await getCachedAccountStatus();
  const cacheAgeMs = cached ? Date.now() - cached.fetchedAt : Infinity;
  // 30s feels right: popup-open + reopen during the same LinkedIn session
  // doesn't re-fetch; longer sessions get a fresh read.
  const STALE_MS = 30_000;

  if (cached && cacheAgeMs < STALE_MS && !force) {
    res.send({ ok: true, status: cached, fromCache: true });
    return;
  }

  const result = await fetchAccountStatus();
  if (result.ok) {
    res.send({ ok: true, status: result.status, fromCache: false });
  } else if (cached) {
    // Network failed but we have a cached value — return it with a hint.
    console.warn(`${LOG} account-status fetch failed, returning stale`, {
      code: result.code,
    });
    res.send({ ok: true, status: cached, fromCache: true });
  } else {
    res.send({ ok: false, code: result.code, error: result.error });
  }
};

export default handler;
