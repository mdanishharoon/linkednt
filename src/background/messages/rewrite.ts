import type { PlasmoMessaging } from "@plasmohq/messaging";

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
  console.info(`${LOG} rewrite: received`, {
    mode: body.mode,
    chars: body.text.length,
    model: settings.model,
    hasApiKey: !!settings.apiKey,
    senderTab: req.sender?.tab?.url,
  });

  const startedAt = performance.now();
  const result = await rewrite({
    text: body.text,
    mode: body.mode,
    apiKey: settings.apiKey,
    model: settings.model,
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
