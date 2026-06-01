import type { RewriteRequest, RewriteResponse } from "~lib/types";

declare module "@plasmohq/messaging" {
  interface MessagesMetadata {
    rewrite: {
      request: RewriteRequest;
      response: RewriteResponse;
    };
  }
}
