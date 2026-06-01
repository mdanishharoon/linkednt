import type { PlasmoMessaging } from "@plasmohq/messaging";

import { decrementCachedBalance } from "~lib/account";
import { getAccessToken } from "~lib/auth";
import { getProvider } from "~lib/providers/registry";
import { callProxyRewrite } from "~lib/proxy";
import { rewrite } from "~lib/rewriter";
import { getSettings } from "~lib/storage";
import {
  MODE_CREDITS,
  type RewriteRequest,
  type RewriteResponse,
} from "~lib/types";

const LOG = "[linkednt:sw]";

const handler: PlasmoMessaging.MessageHandler<
  RewriteRequest,
  RewriteResponse
> = async (req, res) => {
  const body = req.body;
  if (!body) {
    console.warn(`${LOG} rewrite: missing body`);
    res.send({ ok: false, code: "HTTP", error: "Missing request body." });
    return;
  }

  const settings = await getSettings();

  // -------- PROXY path: route through the linkednt edge function --------
  if (settings.path === "proxy") {
    const sessionJwt = (await getAccessToken()) ?? "";
    console.info(`${LOG} rewrite: proxy call`, {
      mode: body.mode,
      chars: body.text.length,
      hasSession: !!sessionJwt,
      senderTab: req.sender?.tab?.url,
    });
    const result = await callProxyRewrite({
      text: body.text,
      mode: body.mode,
      sessionJwt,
    });
    if (result.ok && !result.cached) {
      // Optimistic decrement — keeps the popup's credits counter accurate
      // between fetches. Cache hits don't debit on the server, so we don't
      // touch the local balance either.
      void decrementCachedBalance(MODE_CREDITS[body.mode]);
    }
    res.send(result);
    return;
  }

  // -------- BYOK path: call provider directly with user's key --------
  // Custom providers carry their key + model in the CustomProvider object;
  // builtins use the legacy per-provider apiKeys + models maps.
  const custom = settings.customProviders.find(
    (p) => p.id === settings.providerId,
  );
  const provider = getProvider(settings.providerId, settings.customProviders);
  const apiKey = custom
    ? custom.apiKey
    : (settings.apiKeys[settings.providerId] ?? "");
  const model = custom
    ? custom.model || provider?.defaultModel || ""
    : settings.models[settings.providerId] || provider?.defaultModel || "";

  console.info(`${LOG} rewrite: byok call`, {
    mode: body.mode,
    chars: body.text.length,
    providerId: settings.providerId,
    providerLabel: provider?.label,
    model,
    hasApiKey: !!apiKey,
    senderTab: req.sender?.tab?.url,
  });

  const startedAt = performance.now();
  const result = await rewrite({
    text: body.text,
    mode: body.mode,
    providerId: settings.providerId,
    apiKey,
    model,
    customProviders: settings.customProviders,
  });
  const ms = Math.round(performance.now() - startedAt);

  if (result.ok) {
    console.info(`${LOG} rewrite: ok`, {
      mode: result.mode,
      rewriteChars: result.rewrite.length,
      ms,
    });
  } else {
    console.warn(`${LOG} rewrite: failed`, {
      code: result.code,
      error: result.error,
      ms,
    });
  }

  res.send(result);
};

export default handler;
