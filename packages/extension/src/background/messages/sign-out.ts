import type { PlasmoMessaging } from "@plasmohq/messaging";

import { signOut } from "~lib/auth";
import type { SignOutResponse } from "~lib/types";

const handler: PlasmoMessaging.MessageHandler<
  undefined,
  SignOutResponse
> = async (_req, res) => {
  await signOut();
  res.send({ ok: true });
};

export default handler;
