# Ridgewood automation reference

## Website contact and consultation forms

- **Trigger:** A visitor submits the contact form or consultation modal on `ridgewoodhomeimprovement.com`.
- **Delivery:** The browser posts directly to Web3Forms using the access key in `index.html`.
- **Result:** Web3Forms sends Ridgewood the submission, redirects to `/?submitted=true`, and the website shows a confirmation before cleaning the query string.

## Kitchen Studio design delivery and lead notification

- **Trigger:** A visitor selects **Save my design**, enters a name, email, and phone number, then submits.
- **Delivery:** The browser creates a 1536 × 1400 JPEG from the exact visible render layers and sends it with the six material choices to the Cloudflare Worker at `/api/save-design`.
- **Manager handoff:** The Worker emails `ridgewoodhomeimprovement@gmail.com` through Resend first. The manager receives the lead details, six selections, and design attachment, with the customer address set as reply-to.
- **Customer handoff:** After the manager notification succeeds, the Worker emails the same design to the customer. The browser saves the selections locally and downloads the JPEG. If customer delivery fails, the local download remains available.
- **Duplicate protection:** The browser supplies a stable submission ID for retries and the Worker sends it as Resend's idempotency key.

## Kitchen photo submissions

- **Trigger:** A visitor starts a new kitchen and submits a photograph.
- **Storage:** The Worker stores the image in R2 and its job record in D1.
- **Retention:** The daily Worker cron deletes kitchen photographs and records older than 90 days.

## Manager materials

- **Trigger:** A signed-in manager adds, edits, reorders, disables, or deletes a material.
- **Storage:** Material metadata is stored in D1; render-ready PNG/WebP layers are stored in R2.
- **Limit:** Each of the six categories allows up to 10 materials and must retain at least one enabled material.

## Deployment

- Pushing relevant Kitchen Studio files to `main` runs `.github/workflows/kitchen-studio.yml`.
- GitHub Actions installs dependencies, builds the studio, runs app and Worker tests, verifies committed build output, and deploys the Cloudflare Worker.
- GitHub Pages publishes the repository's `main` branch, including the website and committed `/kitchen-studio/` build.

## Required production configuration

- Cloudflare Worker secrets: `MANAGER_PASSWORD_HASH`, `RESEND_API_KEY`, and `CLOUDFLARE_API_TOKEN` in GitHub Actions.
- Worker variables: `ALLOWED_ORIGINS`, `LEAD_NOTIFICATION_EMAIL`, and `RESEND_FROM_EMAIL`.
- Resend: verify `ridgewoodhomeimprovement.com`, then use `Kitchen Studio <studio@ridgewoodhomeimprovement.com>` as the sender.
