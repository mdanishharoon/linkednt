import type { PlasmoMessaging } from "@plasmohq/messaging";

import { getProvider } from "~lib/providers/registry";
import { callProxyRewrite } from "~lib/proxy";
import { rewrite } from "~lib/rewriter";
import { getSettings } from "~lib/storage";
import type { RewriteRequest, RewriteResponse } from "~lib/types";

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
    // TODO(phase-4): pull session JWT from chrome.storage once Google OAuth
    // is wired. For now, empty JWT triggers a 401 from the edge function →
    // UNAUTHORIZED surfaced in the popup as "Sign in to use credits".
    const sessionJwt = "";
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
    res.send(result);
    return;
  }

  // -------- BYOK path: call provider directly with user's key --------
  const provider = getProvider(settings.providerId);
  const apiKey = settings.apiKeys[settings.providerId] ?? "";
  const model =
    settings.models[settings.providerId] || provider?.defaultModel || "";

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
