# Connection setup

OAuth secrets belong in Cloudflare Pages environment settings, never in Vite variables, browser storage, or Git.

## GitHub

In the GitHub OAuth App settings, use:

- Homepage URL: `https://motherboter.pages.dev/`
- Authorization callback URL: `https://motherboter.pages.dev/auth/github/callback`
- Requested scope: `repo` (needed to create private repositories and write their files)

The callback exchanges the authorization code on the server. The access token is held only in an AES-GCM encrypted, `HttpOnly`, `Secure`, `SameSite=Lax` cookie for up to eight hours. GitHub API calls are proxied through Pages Functions; the browser never receives the token.

## Cloudflare API token

Connect with a user API token. The in-app token link preselects only `Account Settings: Read`, which is used to verify the token and list available accounts:

`https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%5D&accountId=*&zoneId=all&name=Motherboter%20Cloudflare%20Connection`

The token is sent to `/api/cloudflare/connect`, checked against the Cloudflare Accounts API, then stored only in an AES-GCM encrypted, `HttpOnly`, `Secure`, `SameSite=Lax` cookie for up to eight hours. The browser never writes this token to localStorage. Logout clears the cookie.

This connection currently verifies access and lists accounts; it does not deploy a Worker. Add Worker permissions only when the deployment flow is implemented.

## Pages settings

The Pages project must build from the GitHub repository so Cloudflare can discover the root `functions/` directory. Use `npm run build` and `dist` as the build output directory.

Set these variables in the Pages project:

- `GITHUB_CLIENT_ID` (plain text)
- `GITHUB_CLIENT_SECRET` (secret)
- `GITHUB_REDIRECT_URI` = `https://motherboter.pages.dev/auth/github/callback`
- `SESSION_SECRET` (secret; generate a random value with at least 32 characters)

Each user supplies their own Cloudflare API token in the app. The GitHub OAuth secret previously pasted into chat should be rotated after testing.
