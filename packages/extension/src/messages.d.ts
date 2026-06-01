import type {
  RewriteRequest,
  RewriteResponse,
  SessionResponse,
  SignInResponse,
  SignOutResponse,
} from "~lib/types";

declare module "@plasmohq/messaging" {
  interface MessagesMetadata {
    rewrite: {
      request: RewriteRequest;
      response: RewriteResponse;
    };
    "sign-in": {
      request: undefined;
      response: SignInResponse;
    };
    "sign-out": {
      request: undefined;
      response: SignOutResponse;
    };
    session: {
      request: undefined;
      response: SessionResponse;
    };
  }
}
