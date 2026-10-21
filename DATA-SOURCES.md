# Email Logs: where each field comes from

The page runs on sample data right now (`src/api/mockData.js`). This lists where the real
value of every field has to come from. "Checked" means it is in ZeptoMail's documentation.

## From ZeptoMail

| Field on the page | Source | Checked |
|---|---|---|
| Recipient, sender, subject, sent time, status | Logs list API: `GET https://cpaas.zoho.com/v1.1/email` | Yes |
| Request ID, email reference, mail agent | Logs list API (used behind the scenes, never shown) | Yes |
| Client reference | Single log API: `GET .../email/email-reference/{ref}` | Yes |
| Opened at | Single log API (`opened_time`) | Yes |
| CC and BCC addresses | Webhook payload, `email_info.cc` and `email_info.bcc` | Yes |
| Processed time | Webhook payload, `email_info.processed_time` | Yes |
| Bounce reason | Webhook payload, `event_data[].details[].reason` (soft and hard bounce events) | Yes |
| Server message | Webhook payload, `details[].diagnostic_message` | Yes |
| Bounced recipient and bounce time | Webhook payload, `details[].bounced_recipient` and `details[].time` | Yes |

The list API only returns 8 fields. Everything below the first two rows needs a second call
or a webhook that KDK Software receives and saves.

## Not documented, still to confirm with a real response

- **Delivered time.** ZeptoMail's dashboard shows "Delivery time" and a timeline, but I found no
  API field for it. "Delivered" can be chosen as a webhook event, but its payload is not shown
  on the page I read.
- **Whether webhook `reason` values match the 18 bounce errors** on ZeptoMail's
  "Bounce error categories" page. The plain-language notes in `src/api/emailLogs.js` are keyed
  on those 18 names. Anything that does not match falls back to a general note.
- **All status values.** Only `delivered` appears as an example in the API pages. The dashboard
  lists Queued, Processed, Delivered, Process failed, Soft bounce, Hard bounce, Multiple status.
- **Bulk or single.** The plan is to use ZeptoMail's request: one request with many recipients is
  a bulk send. Not yet decided.

## Not from ZeptoMail (KDK Software supplies these)

| Field | Note |
|---|---|
| Display IDs (BL-101, BL-101-3, EM-1042) | KDK creates them and saves them next to ZeptoMail's codes |
| Module (GST, TDS, ITR) | KDK knows which module sent it. It could ride through ZeptoMail in the `tag` or `client_reference` field |
| Triggered at | When KDK started the send, before it reached ZeptoMail. KDK's own time |
| Sent by | KDK knows which user sent it |
| Automated or manual | KDK knows how it was sent |
| Attachments | ZeptoMail's pages do not show attachments in logs or webhooks |
| Suggested action in the notes | Our own advice. ZeptoMail's page gives descriptions only, no fixes |

`client_reference` and the `tag` field in the webhook let KDK pass its own values (for example
an internal ID) through ZeptoMail with each email.
