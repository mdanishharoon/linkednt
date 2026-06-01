import type { PlasmoMessaging } from "@plasmohq/messaging";

import { getSession } from "~lib/auth";
import type { SessionResponse } from "~lib/types";

const handler: PlasmoMessaging.MessageHandler<
  undefined,
  SessionResponse
> = async (_req, res) => {
  const session = await getSession();
  res.send({ user: session?.user ?? null });
};

export default handler;
