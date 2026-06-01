import type { PlasmoMessaging } from "@plasmohq/messaging";

import { signInWithGoogle } from "~lib/auth";
import type { SignInResponse } from "~lib/types";

const LOG = "[linkednt:sw]";

const handler: PlasmoMessaging.MessageHandler<
  undefined,
  SignInResponse
> = async (_req, res) => {
  const result = await signInWithGoogle();
  if (result.ok) {
    console.info(`${LOG} sign-in: ok`, { userId: result.session.user.id });
    res.send({ ok: true, user: result.session.user });
  } else {
    console.warn(`${LOG} sign-in: failed`, {
      code: result.code,
      error: result.error,
    });
    res.send({ ok: false, code: result.code, error: result.error });
  }
};

export default handler;
