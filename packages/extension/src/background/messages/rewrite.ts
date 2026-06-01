import type { PlasmoMessaging } from "@plasmohq/messaging";

import { getProvider } from "~lib/providers/registry";
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

  if (settings.path === "proxy") {
    // Proxy edge function isn't wired yet — that's phase 3b. Give the user a
    // typed error so the popup can show "switch to BYOK or check back later".
    console.warn(
      `${LOG} rewrite: proxy path selected but backend not deployed`,
    );
    res.send({
      ok: false,
      code: "PROXY_UNAVAILABLE",
      error:
        "Credits backend is still being built. Switch to 'Bring your own key' in the popup for now.",
    });
    return;
  }

  // BYOK path — pull the per-provider key + model from settings.
  const provider = getProvider(settings.providerId);
  const apiKey = settings.apiKeys[settings.providerId] ?? "";
  const model =
    settings.models[settings.providerId] || provider?.defaultModel || "";

  console.info(`${LOG} rewrite: received`, {
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
