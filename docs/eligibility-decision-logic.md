# Eligibility Decision Logic

This describes what happens, step by step, from the moment the LOI eligibility
widget (`index.html`) opens to the moment an applicant sees an Accept or
Reject result. It reflects the current code in `index.html` and
`api/check-email.js`.

## 1. Email collection

The widget first asks for the applicant's email address and stores it. No
eligibility decision is made at this point — the email is only checked later
(step 4), after the program-area questions.

## 2. Program area selection

The applicant picks one of six program areas:

- California Floristic Province
- Conservation Infrastructure
- Environmental Education
- Global Biodiversity
- Northern Rockies
- Sustainable Consumption

Each program area has its own question flow (see `FLOWS` in `index.html`).

## 3. Program-area questions

Each flow is a short sequence of yes/no, text, or numeric questions that
resolves to either `accept`, `reject`, or the next question in the flow.

| Program area | Question(s) | Accept condition |
|---|---|---|
| California Floristic Province | Is your project located in the California Floristic Province (most of California, southwestern Oregon, and northwestern Baja California, Mexico)? | Answer is "Yes" |
| Conservation Infrastructure | Is your project located in the USA? | Answer is "Yes" |
| Environmental Education | Is your organization located in the USA? | Answer is "Yes" |
| Global Biodiversity | 1) In which country is your project primarily located? 2) What percentage of your project budget are you asking the Weeden Foundation to fund? | Country is in South America, Central America, or Africa (see `SOUTH_AMERICA`, `CENTRAL_AMERICA`, `AFRICA` lists), **and** the funding percentage is between 10 and 80 (inclusive) |
| Northern Rockies | Is your project located in the Northern Rockies in the USA? | Answer is "Yes" |
| Sustainable Consumption | Is your organization located in the USA? | Answer is "Yes" |

Any answer that fails the stated condition resolves to `reject` immediately;
the applicant does not see any further questions in that flow.

## 4. Post-question checks (email history)

Once the questions resolve to `accept` or `reject`, and only then, the widget
runs three checks against the applicant's email before showing the final
result. These checks can turn a passing set of answers into a rejection, but
they never turn a failing set of answers into an acceptance.

Checks run in this order:

1. **Blocklist** — `BLOCKED_EMAILS` in `index.html` (currently
   `drea@empulsive.ink`). A match always ends in the standard rejection
   message, regardless of the questions' outcome.
2. **Already submitted this month** — `api/check-email.js` scans
   `submissions.csv` for any prior row with this email whose timestamp falls
   in the current calendar month (UTC). A match ends in the standard
   rejection message.
3. **Already accepted within the past year** — the same lookup also checks
   for any prior row with this email whose `determination` was `accept` and
   whose timestamp is within the last 365 days. A match ends in a distinct
   message telling the applicant to check back after their one-year
   eligibility window has passed.

If none of the three checks trigger, the applicant sees the outcome the
questions actually produced: the acceptance message with a link to begin the
LOI, or the standard rejection message.

**Exemption:** `john@jweeden.com` is hardcoded in `api/check-email.js` to
always report a clean history (no monthly-submission match, no
past-year-acceptance match), so this address is never blocked by checks 2 or
3. It is still subject to the blocklist check and the question logic itself.

## 5. Logging

Regardless of outcome, every completed run (email, program area, individual
answers, and the final determination) is appended as a row to
`submissions.csv` via `api/submit.js`. This is the same log that
`api/check-email.js` reads for checks 2 and 3 above.

## Result messages

| Outcome | Message constant | Shown when |
|---|---|---|
| Accept | `ACCEPT_TEXT` | Questions pass, and none of the three post-question checks trigger |
| Reject (standard) | `REJECT_TEXT` | Questions fail, **or** blocklist match, **or** already submitted this month |
| Reject (past-year) | `ALREADY_ACCEPTED_TEXT` | Questions pass, but the applicant was already accepted within the last year |

Note that a blocked email and a repeat-this-month email share the same
rejection wording, so an applicant cannot distinguish those two cases from
the message alone.
