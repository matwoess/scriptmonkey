# Scriptmonkey Feedback API

Stateless Vercel Function that receives feedback from the extension and forwards it by email via [Resend](https://resend.com).

- Endpoint: `POST /api/feedback` (JSON, see `FeedbackPayload` in `api/feedback.ts`).
- Tests run from the repo root with `npm test`.

## Environment variables

- `RESEND_API_KEY`: Resend API key (set in Vercel).
- `FEEDBACK_FROM`: Sender, e.g. `Scriptmonkey Feedback <feedback@yourdomain.com>`.
- `FEEDBACK_TO`: Your inbox.
- `ALLOWED_ORIGINS`: Comma-separated origins, e.g. `chrome-extension://<id>,https://matwoess.github.io`. Entries ending in `*` match by prefix.

## Deploy

1. In Vercel, *Add New → Project*, import the Scriptmonkey repo and set **Root Directory** to `feedback-api` (framework preset: *Other*, no build command).
2. Add the environment variables above (or install the Resend integration for `RESEND_API_KEY`).
3. Deploy. Test with:

   ```sh
   curl -i -X POST https://<project>.vercel.app/api/feedback \
     -H "Origin: chrome-extension://<id>" -H "Content-Type: application/json" \
     -d '{"message":"test","version":"0.0.0","userAgent":"curl"}'
   ```

4. Point `FEEDBACK_ENDPOINT` in `src/utils/feedback.ts` to the deployed URL if it differs.

