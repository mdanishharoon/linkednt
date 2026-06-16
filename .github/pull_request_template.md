<!--
Default base branch for new work is `dev` (sandbox). PRs to `main` are
reserved for promoting validated dev work to production. CI picks env
vars from the target branch, so opening this PR against `main` builds
+ previews with PROD config — only do that when you mean it.
-->

## What

<!-- One sentence on the change. -->

## Why

<!-- The user-facing or business reason. Skip if obvious from "What". -->

## Verification

<!-- Anything you tested locally or in the preview deploy. The CF preview
URL will be commented below once the build finishes. -->

- [ ] Tested on the preview URL above
- [ ] If touching payments: confirmed `[boot] env: sandbox` in `create-polar-checkout` logs
- [ ] If touching schema: migration is idempotent (`create or replace`, `if not exists`, etc.)

## Promotion path

<!-- If this PR targets `dev`, after merge: open a follow-up PR `dev → main`
to promote to production. If this PR targets `main` directly, it should
ONLY be a promotion PR (i.e. you're merging accumulated dev work, not
introducing new changes). -->
