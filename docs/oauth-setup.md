# OAuth setup

OAuth secrets belong in Cloudflare Pages environment settings, never in Vite variables, browser storage, or Git.

## GitHub

In the GitHub OAuth App settings, use:

- Homepage URL: `https://motherboter.pages.dev/`
- Authorization callback URL: `https://motherboter.pages.dev/auth/github/callback`
- Requested scope: `repo` (needed to create private repositories and write their files)

The callback exchanges the authorization code on the server. The access token is held only in an AES-GCM encrypted, `HttpOnly`, `Secure`, `SameSite=Lax` cookie for up to eight hours. GitHub API calls are proxied through Pages Functions; the browser never receives the token.

## Cloudflare

Cloudflare supports third-party OAuth clients. Create one from **Manage Account > OAuth clients** and choose the Authorization Code flow with `client_secret_post`. Register this callback:

`https://motherboter.pages.dev/auth/cloudflare/callback`

The app requests the `account.read` scope to list the accounts granted to the client. Cloudflare requires a domain-verified publisher before an OAuth client can be made public. The shared `pages.dev` hostname cannot prove domain ownership; use a custom domain you control, publish its required DNS TXT verification record, and then make the OAuth client public. Cloudflare may also let you use a private client, but only members of its parent account can authorize it.

The current Cloudflare OAuth route verifies the account connection; it does not yet deploy a Worker. Add only the Worker permissions needed when that deployment route is implemented. Account listing requires read access to account settings.

## Pages settings

The Pages project must build from the GitHub repository so Cloudflare can discover the root `functions/` directory. Use `npm run build` and `dist` as the build output directory.

Set these variables in the Pages project:

- `GITHUB_CLIENT_ID` (plain text)
- `GITHUB_CLIENT_SECRET` (secret)
- `GITHUB_REDIRECT_URI` = `https://motherboter.pages.dev/auth/github/callback`
- `CLOUDFLARE_CLIENT_ID` (plain text)
- `CLOUDFLARE_CLIENT_SECRET` (secret)
- `CLOUDFLARE_REDIRECT_URI` = `https://motherboter.pages.dev/auth/cloudflare/callback`
- `SESSION_SECRET` (secret; generate a random value with at least 32 characters)

The account owner must create the Cloudflare OAuth client and enter its Client ID and new Client Secret. The GitHub OAuth secret previously pasted into chat should be rotated before it is saved here.
