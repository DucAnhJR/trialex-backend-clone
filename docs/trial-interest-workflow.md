# Trial registration of interest

Implements the supplied “Trial registration workflow” and “Trial pop up replacement wording” requirements.

## Participant flow

View trial and its individual eligibility criteria → Register your interest → Confirm four statements → persist an interest request and a contact-delivery outbox → email the study contact → study team contacts/screens the participant and obtains informed consent → administrator records the study team's consent and eligibility confirmations → enrolment and study access.

The four participant acknowledgements use copy version `interest-v1`. They are not informed consent for trial participation. The app retains the exact supplied title, introduction, statements and confirmation button. Account sign-up wording is separate.

`POST /api/trials/:id/signup` now requires:

```json
{
  "copy_version": "interest-v1",
  "trial_information_read": true,
  "interest_is_not_enrolment": true,
  "study_team_obtains_consent": true,
  "share_contact_details": true
}
```

The server validates all statements, current recruitment status and the participant's name/email/phone. Interest registration does not activate the record. Repeated requests return the existing registration and repair the User → TrialsRecord reference if necessary. A unique user/trial index resolves concurrent registration.

The existing surgery date/location/participant ID onboarding form is retained as a separate “Complete participant details” action after interest is saved. Closing it does not cancel contact delivery. These details remain required by the existing enrolment/schedule workflow; the participant completes them when the study team supplies the ID. Old pending applications must register the new acknowledgements before submitting onboarding or being approved. They can confirm these statements on their existing pending request even if new recruitment has closed.

## Actual contact delivery

The first valid email in the trial's existing `contact` list is the study recipient. Check this primary recruitment contact before enabling a trial. Missing participant contact details cause a clear error. A trial without a valid study email still accepts interest, storing `interest_recipient=null` and `contact_sharing_status=awaiting_contact`. The app confirms that interest is saved and explicitly says details are waiting to be shared. It never claims delivery or enables study access.

Registration stores an immutable snapshot of only name, email, phone and recipient in MongoDB, with `contact_sharing_status=pending`. The existing email worker registers a recurring dispatcher every 60 seconds in the background. Failed registration logs a redacted warning and retries after 60 seconds; it does not reject the HTTP startup lifecycle. `TRIAL_INTEREST_DISPATCH_ENABLED=false` pauses both registration and delivery, retaining pending requests in MongoDB. For waiting requests with no recipient, the dispatcher rechecks the trial contact configuration. If none is available it keeps the request waiting without sending email or failing the batch. When a valid study email is added, it atomically snapshots that recipient, verifies the request is still pending, and resumes normal delivery. Existing valid recipient snapshots are retained. The dispatcher sends a plain-text recruitment request and records `contact_shared_at`/`shared` only after SMTP accepts it. Redis jobs contain no participant details. Failures remain pending for retry; one failing recipient does not block the batch. Pending records are indexed and processed in batches of 100, oldest attempt first so failed recipients do not starve newer requests; monitor outbox growth for larger recruitment volumes.

Withdrawal/decline cancels unsent delivery, with a final server check before SMTP. An already accepted email cannot be recalled. Delivery is at least once: a worker crash after SMTP acceptance but before saving the receipt may send a duplicate; a stable Message-ID identifies the same request. `shared` means accepted by the mail transport, not that the study team has read it. Do not mark it as “participant contacted”.

## Staff operation

An account with the existing `admin` role sees **Review study-team confirmations** in Profile. This opens a paginated review queue with trial, participant contact snapshot, contact-delivery status and onboarding status.

Staff record the confirmation received from the actual study team. Both checkboxes, the confirmation date and a source/reference are required. The app does not ask a participant to attest that a clinical informed-consent procedure has already occurred.

- `GET /api/trials/interest-requests?page=1&limit=20`: admin only; pending requests and existing approved records needing verification.
- `PATCH /api/trials/enrolments/:recordId/approve`: admin only; requires both confirmations, date and reference.
- `PATCH /api/trials/enrolments/:recordId/decline`: admin only; draft/pending requests can be declined.

Approval body:

```json
{
  "informed_consent_obtained": true,
  "eligibility_confirmed": true,
  "study_team_confirmed_at": "2026-10-01T00:00:00.000Z",
  "study_team_confirmation_reference": "Confirmation from study coordinator, reference ABC"
}
```

New enrolments require successful contact sharing and completed onboarding; `awaiting_contact` can never be approved. Approval uses compare-and-set so a concurrent withdrawal or decision cannot silently be overwritten. Existing active/history records can receive explicit staff verification without changing their original trial state, approval actor/date or questionnaire schedule. Verification stores `study_team_confirmed_by`, date and source.

## Access rules

The server computes `can_access_study` from all of: `is_approved`, `is_active`, `informed_consent_obtained`, `eligibility_confirmed`, and an in-progress/completed/incomplete trial state. A legacy approval flag alone is insufficient.

Study-page content is omitted from public trial/catalogue/search DTOs and from unapproved records. Recruitment contacts and public trial eligibility/information remain available. Participant configuration responses expose only onboarding metadata, not questionnaire schedules/URLs/forms. Calendar/questionnaire APIs and notice-board/milestone writes enforce the server gate. A participant cannot update approval/state/progress through the generic record endpoint.

The native navigation gate verifies fresh server data on focus/resume, replaces cached trial data, and fails closed when offline. Public recruitment contacts have a separate route. Referral redemption only resolves a trial and routes to the same registration flow, including from introductory onboarding; it never enrols someone automatically.

## Deployment and existing data

This changes the request contract for signup and approval. Coordinate backend, worker and mobile release, and require the current app version; old mobile clients do not send the four acknowledgements. Do not deploy the strict access gate before auditing existing records.

1. In staging, configure MongoDB/Redis/SMTP and a test trial's primary contact email. Check actual mail delivery using a test mailbox and the native flows below.
2. Before production release, audit existing active/history records with the read-only script. It starts no application workers and prints only record/trial IDs and statuses:

   ```sh
   pnpm exec env-cmd -f .env ts-node -r tsconfig-paths/register scripts/verify-study-confirmations.ts
   ```

3. Obtain actual confirmations from the study teams. Prepare a JSON array with `trial_record_id`, `administrator_id`, and the four approval-body fields above for each verified existing enrolment. Validate without writes using `--manifest=/secure/path/confirmations.json`; add `--apply` only when applying those verified confirmations before rollout. No consent/eligibility values are inferred or bulk-defaulted. This preserves original approval and questionnaire data. The audit exits 2 while unverified active/history records remain; resolve them with operations before releasing the gate.
4. Deploy BE/worker and the updated app together. Confirm the recurring email job runs and pending deliveries drain. In the admin app, confirm pending and legacy review cases work.

Never run the migration or real contact delivery as part of unit tests. Neither was executed during this code change.

## Verification

Automated tests cover required acknowledgements, public-data redaction, server access conditions, referral non-enrolment, retries, onboarding prerequisites, administrator restrictions, approval/withdrawal races, outbox success/failure/cancellation, popup validation/loading, and stale/offline navigation denial.

Native acceptance checks on iOS and Android:

- Each trial shows its own eligibility criteria; account signup wording is unchanged.
- All four statements fit/scroll on a small screen with larger accessibility text.
- Cancel sends nothing; missing checks disable confirmation; repeated submits create one request.
- Interest persists after closing onboarding/restarting; contact mail goes only to the configured study contact.
- Pending users see request status and can complete participant details; study routes and direct API calls remain blocked.
- Admin cannot approve with missing confirmations, undelivered contacts or incomplete onboarding.
- Valid approval opens that participant's study pages/calendar; another trial remains locked.
- Withdrawal/decline blocks study routes/reminders, including a stale deep link.
- Referral works from Profile and Intro without automatic enrolment.
- Verified existing completed/incomplete records retain history access.


## Local Redis and login connectivity

If the app reports `Could not connect to the server` for `localhost:8080`, check whether the API is listening. The iOS keyboard `UIEmojiSearchOperations` warning is separate from the failed HTTP connection.

An Upstash `ERR max requests limit exceeded` is a Redis quota error. For local development use the isolated Redis service:

```sh
docker compose -f docker-compose.redis.yml up -d redis
```

Local `.env` values:

```dotenv
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=redispass
REDIS_TLS_ENABLED=false
```

This Redis binds only to the host loopback interface, persists data in its own Docker volume, and is used by both cache and BullMQ. It does not change MongoDB or the app's API URL. Restart the API after changing `.env` (`pnpm start:dev`). Keep Docker running while developing. Do not copy these local credentials/settings into production.
