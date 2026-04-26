# Releasing

Releases are tag-driven. From `master`:

```bash
# 1. Pull latest
git checkout master && git pull

# 2. Bump the version (edits package.json)
pnpm version 2.0.1 --no-git-tag-version

# 3. Sanity-check locally
pnpm install --frozen-lockfile
pnpm compile && pnpm zip && pnpm zip:firefox

# 4. Commit, tag (annotated), push
git add package.json
git commit -m "chore: release v2.0.1"
git tag -a v2.0.1 -m "v2.0.1"        # -a creates an annotated tag — REQUIRED
git push origin master --follow-tags  # --follow-tags only pushes annotated tags
```

The `release.yml` workflow fires on the tag, asserts the tag matches `package.json` `version`, builds for both browsers, creates a GitHub Release with the chrome/firefox/sources zips attached, and submits to AMO and the Chrome Web Store via `wxt submit`. Each store's submit step skips with a warning if its credentials aren't configured.

### Pre-releases

Tags with a `-` suffix (e.g. `v2.0.1-beta1`) become GitHub pre-releases. They run the **same** `release.yml` workflow with the **same** submit semantics — if AMO or CWS secrets are configured, the pre-release **will** be submitted to that store. To dry-run without store submission, run the workflow on a fork or temporarily unset the relevant secrets.

## Required secrets

Configured under repo Settings → Secrets and variables → Actions:

| Secret | Purpose |
|---|---|
| `FIREFOX_EXTENSION_ID` | `jake@shreves.dev` (gecko id literal) |
| `FIREFOX_JWT_ISSUER` | AMO API JWT issuer |
| `FIREFOX_JWT_SECRET` | AMO API JWT secret |
| `CHROME_EXTENSION_ID` | 32-char ID assigned when CWS dev-console entry is created |
| `CHROME_CLIENT_ID` | OAuth client ID per [CWS publishing setup](https://developer.chrome.com/docs/webstore/using-api) |
| `CHROME_CLIENT_SECRET` | OAuth client secret |
| `CHROME_REFRESH_TOKEN` | OAuth refresh token |

If a group is missing, the corresponding submit step emits `::warning::` and skips — the workflow stays green.
