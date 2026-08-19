# Finding Keepers — email catalogue

All automated emails sent via **Resend** (`lib/email.ts`).

| Setting | Value |
|--------|--------|
| **From** | `RESEND_FROM_EMAIL` env, or fallback `Finding Keepers <onboarding@resend.dev>` |
| **Admin inbox** | `ADMIN_NOTIFICATION_EMAIL` env, or fallback `findingkeepers@connecthk.org` |
| **Provider** | Resend API (`RESEND_API_KEY`) |

**Note:** Platform feedback (`/dashboard/feedback`) is stored in the database only — **no email** is sent.

---

## Quick index

| # | Trigger | Recipient | Subject (approx.) |
|---|---------|-----------|-------------------|
| 1 | Register / resend confirmation | Member | Confirm your Finding Keepers account |
| 2 | Forgot password | Member | Reset your Finding Keepers password |
| 3 | Submit verification | Member | Your Finding Keepers verification is under review |
| 4 | Submit verification | Admin | New verification request: {name} |
| 5 | Admin marks verified | Member | You're verified — welcome to Finding Keepers |
| 6 | Admin marks invalidated | Member | Your Finding Keepers verification needs attention |
| 7 | Send match interest | Admin | New Match Request: {from} → {to} |
| 8 | Send match interest | Recipient | A PROFILE HAS EXPRESSED INTEREST IN YOU |
| 9 | Return interest | Admin | Match request interest returned: {from} → {to} |
| 10 | Decline interest | Admin | Match request declined: {from} → {to} |
| 11 | Return interest | Requester | YOU HAVE RECEIVED A POSITIVE RESPONSE |
| 12 | Decline interest | Requester | Update on your match request |
| 13 | Begin active introduction | Admin | Active introduction: {from} ↔ {to} |
| 14 | Begin active introduction | Both members | Your introduction is now active |
| 15 | Other requests withdrawn on activation | Other parties | Update on your match request |
| 16 | Admin changes match status | Admin | Match status updated: … |
| 17 | Admin → interest returned / rejected | Requester | (same as 11/12) |
| 18 | Admin → unmatched | Both members | Your introduction has ended |
| 19 | Admin → contacted | Both members | Update on your match request |
| 20 | Admin → completed | Both members | Your match has been completed |
| 21 | Admin → expired | Requester | Your match request has expired |
| 22 | Contact Us form | Admin | [Contact Us] {topic} — {name} |

---

## 1. Email confirmation (signup)

| | |
|--|--|
| **When** | User completes **Register**, or uses **Resend confirmation**, or login path re-sends when email not confirmed |
| **Code** | `app/actions/auth.ts` → `sendSignupConfirmationEmail` |
| **To** | New member’s email |
| **Subject** | `Confirm your Finding Keepers account` |

### Content (body summary)
- Brand: Finding Keepers  
- Heading: **Welcome, {fullName or “there”}**  
- Thank you for creating your account; please confirm email to continue  
- Button: **Confirm email address** → `{appUrl}/auth/confirm?token_hash=…&type=signup&next=/login`  
- Plain-text fallback of the same link  
- Footer: If you did not create this account, ignore this email  

---

## 2. Password reset

| | |
|--|--|
| **When** | User submits **Forgot password** (`requestPasswordReset`) |
| **Code** | `app/actions/auth.ts` → `requestPasswordReset` |
| **To** | Member’s email (if account exists; link generation is quiet on failure) |
| **Subject** | `Reset your Finding Keepers password` |

### Content
- Brand: Finding Keepers  
- Heading: **Reset your password**  
- Assalamualaikum {name}, we received a password reset request  
- Button: **Reset password** → `{appUrl}/auth/recovery?token_hash=…&type=recovery`  
- Plain-text link fallback  
- Footer: If you did not request this, ignore  

*(If admin client missing, Supabase may send its own reset email instead.)*

---

## 3. Verification under review (member)

| | |
|--|--|
| **When** | Member successfully **submits verification** on dashboard |
| **Code** | `sendVerificationPendingEmail` in `auth.ts`; called from `app/dashboard/page.tsx` |
| **To** | Member’s email |
| **Subject** | `Your Finding Keepers verification is under review` |

### Content
- Assalamualaikum, {name}  
- Thank you for submitting verification documents; admin team is reviewing  
- Another email when complete; typically **24–48 hours**  
- Button: **View dashboard** → `/dashboard`  

---

## 4. New verification request (admin)

| | |
|--|--|
| **When** | Same as #3 — verification submitted |
| **Code** | `notifyAdminsVerificationSubmitted` in `verification.ts` |
| **To** | Admin notification email |
| **Subject** | `New verification request: {fullName or email}` |

### Content
- Heading: **New verification request**  
- A member submitted documents for manual verification  
- **Name, email, phone, HKID, residency** (PR / Non-PR)  
- If Non-PR: time in HK, visa type, referral name/phone/email/HKID  
- Button: **Review in admin panel** → `/fk-admin/verification`  

*(Does not attach file uploads; docs are in admin panel.)*

---

## 5. Account verified (member)

| | |
|--|--|
| **When** | Admin sets verification request status to **verified** |
| **Code** | `sendUserStatusEmail` kind `verified` in `verification.ts` |
| **To** | Member’s email |
| **Subject** | `You're verified — welcome to Finding Keepers` |

### Content
- Assalamualaikum, {name}  
- Account verified; full access  
- **Next steps:** complete CV, browse profiles, request a match  
- Button: **Go to your dashboard** → `/dashboard`  
- Link: CV Builder → `/dashboard/cv-builder`  
- Automated footer  

---

## 6. Verification not approved (member)

| | |
|--|--|
| **When** | Admin sets verification to **invalidated** (or equivalent not-approved path) |
| **Code** | `sendUserStatusEmail` kind `invalidated` |
| **To** | Member’s email |
| **Subject** | `Your Finding Keepers verification needs attention` |

### Content
- Assalamualaikum, {name}  
- Team was unable to approve at this time  
- Sign in, review HKID and payment proof, resubmit when ready  
- Button: **Resubmit verification** → `/dashboard`  
- Contact: findingkeepers@connecthk.org  

---

## 7–8. New match interest sent

| | |
|--|--|
| **When** | Member **sends match request** (`requestMatch`) after confirm popup |
| **Code** | `sendNewMatchRequestEmails` in `match.ts` |

### 7 — Admin

| | |
|--|--|
| **To** | Admin |
| **Subject** | `New Match Request: {requesterShortId} → {requestedShortId}` |
| **Heading** | New Match Request |
| **Intro** | A new match request has been submitted and is awaiting the recipient's approval. |
| **Body blocks** | **Person Who Requested** + **Person Request Sent To**: short ID, name, contact (phone). **No wali** at this stage. |
| **CTA** | View in admin panel → `/fk-admin/matches` |

### 8 — Recipient (person interest was sent to)

| | |
|--|--|
| **To** | Recipient’s email |
| **Subject** | `A PROFILE HAS EXPRESSED INTEREST IN YOU` |
| **Heading** | A profile has expressed interest in you |
| **Body** | Profile (XXXX) reviewed your profile and expressed interest in an introduction. Invite to review and decide. If mutual interest: they confirm, then wali contact (or own contact if no wali) shared, admin arranges meeting. If decline: closed, no contact details. Important: only one interest at a time. Please log in to review Profile (XXXX). |
| **CTAs** | Review profile → `/browse/{requesterShortId}` · Submit your decision → `/dashboard/my-match-requests` |

---

## 9–12. Interest returned or declined

| | |
|--|--|
| **When** | Recipient (or admin) **returns interest** or **declines** (`respondToMatchRequest` / admin status) |
| **Code** | `sendMatchDecisionEmails` / `sendAdminStatusChangeEmails` |

### 9 — Admin (interest returned)

| | |
|--|--|
| **Subject** | `Match request interest returned: {from} → {to}` |
| **Heading** | Interest Returned |
| **Intro** | Recipient returned interest; **no wali at this stage** (similar wording from decision flow) |
| **Body** | Requester + recipient summaries **without wali** |

### 10 — Admin (declined)

| | |
|--|--|
| **Subject** | `Match request declined: {from} → {to}` |
| **Heading** | Match Request Declined |
| **Intro** | Recipient declined |
| **Body** | Same party blocks, no wali |

### 11 — Requester (interest returned)

| | |
|--|--|
| **To** | Person who originally sent interest |
| **Subject** | `YOU HAVE RECEIVED A POSITIVE RESPONSE` |
| **Heading** | You have received a positive response |
| **Body** | Good news — Profile (XXXX) is also interested. Confirm whether to begin formal introduction (walis where applicable). Next: confirm one profile if multiple positives; FK Panel contacts parties. Important: only one interest at a time. |
| **CTA** | Confirm your decision → `/dashboard/my-match-requests` |

### 12 — Requester (declined)

| | |
|--|--|
| **To** | Requester |
| **Subject** | `UPDATE ON YOUR INTEREST IN PROFILE (XXXX)` |
| **Heading** | Update on your interest in Profile XXXX |
| **Body** | Thank you for expressing interest. The profile decided not to proceed. Connection closed; free to express interest in another profile. Encouragement to keep exploring. |
| **CTA** | Browse profiles → `/browse` |

---

## 13–15. Active introduction begins

| | |
|--|--|
| **When** | Requester clicks **Initiate introduction** (or admin activates) — `activateMatchIntroduction` / admin path |
| **Code** | `sendIntroductionActivationNotifications` → `sendActivationEmails` + `sendWithdrawnRequestNotifications` |

### 13 — Admin (wali included)

| | |
|--|--|
| **Subject** | `Active introduction: {from} ↔ {to}` |
| **Heading** | Introduction Now Active |
| **Intro** | Both members confirmed. **Wali/guarantor details included below for facilitation.** |
| **Body** | Both parties: short ID, name, phone, **wali name/relation, wali phone, wali email** |
| **CTA** | Admin matches panel |

### 14 — Both active members

| | |
|--|--|
| **To** | Requester + recipient |
| **Subject** | `Your introduction is now active` |
| **Heading** | Introduction started |
| **Body** | Your introduction with profile **{otherShortId}** is now active. Admin will guide next steps and facilitate contact through appropriate channels. |
| **CTA** | View my match requests |

### 15 — Withdrawn other parties

| | |
|--|--|
| **When** | Original person initiates introduction with someone else (or does not proceed with this mutual interest); competing requests closed |
| **To** | Members on those other requests who are **not** the active pair (deduped by email) |
| **Subject** | `AN UPDATE ON YOUR RECENT INTEREST` |
| **Heading** | An update on your recent interest |
| **Body** | Thank you for interest in Profile (XXXX). They chose to proceed with another profile (one interest at a time). Not a negative reflection. No contact details shared. Continue exploring. |
| **CTA** | Browse profiles → `/browse` |

---

## 16–21. Admin match status changes

| | |
|--|--|
| **When** | Admin changes status on `/fk-admin/matches` (`updateAdminMatchStatus`) |
| **Code** | `sendAdminStatusChangeEmails` |

### 16 — Always to admin

| | |
|--|--|
| **Subject** | `Match status updated: {from} → {to} ({newStatus})` |
| **Heading** | Match Status Updated |
| **Intro** | Admin updated from **{previous}** to **{new}** |
| **Body** | Party summaries (wali only if that path sets `includeWaliDetails`; default admin status email does **not** force wali in the helper call — same template, default no wali) |
| **CTA** | Admin matches |

### 17 — If new status is interest_returned or rejected  
Same member emails as **#11 / #12** to requester.

### 18 — If new status is unmatched (intro ended)

| | |
|--|--|
| **To** | Both members |
| **Subject** | `Your introduction has ended` |
| **Heading** | Introduction ended |
| **Body** | Your introduction with profile **{other}** has ended. You may browse and send new requests when ready. |

### 19 — If new status is contacted

| | |
|--|--|
| **To** | Both members |
| **Subject** | `Update on your match request` |
| **Heading** | Your match is being followed up |
| **Body** | Admin marked your match with **{other}** as contacted and will guide next steps. |

### 20 — If new status is completed

| | |
|--|--|
| **To** | Both members |
| **Subject** | `Your match has been completed` |
| **Heading** | Match marked as completed |
| **Body** | Match with **{other}** marked completed by admin team. |

### 21 — If new status is expired

| | |
|--|--|
| **To** | Requester only |
| **Subject** | `Your match request has expired` |
| **Heading** | Match request expired |
| **Body** | Request to **{toId}** expired after **7 days** without a response. You may request another match when ready. |

---

## 22. Contact Us form

| | |
|--|--|
| **When** | Anyone submits **Contact Us** at `/contact` |
| **Code** | `submitContactForm` in `app/actions/contact.ts` |
| **To** | Admin notification email |
| **Subject** | `[Contact Us] {topic} — {name}` (topic spaces instead of underscores) |

### Content
- Heading: **New Contact Us message**  
- Form fields: **Name, Email, Phone** (or “Not provided”), **Topic**, **Submitted at (UTC)**  
- **Message** body (user free text)  
- If signed in: User ID, verification status, CV short ID  
- Footer: Automated message from Contact Us form  

**Topics:** general, account access, verification, matching, technical, privacy, other  

---

## Admin match email block structure (shared template)

Used for match-related **admin** emails (`buildAdminMatchEmailHtml`):

```
Assalamualaikum
{intro paragraph}

Person Who Requested
  Short ID, Name, Contact
  [optional] Wali/Guarantor, Wali Phone, Wali Email

Person Request Sent To
  Short ID, Name, Contact
  [optional] Wali fields

[View in admin panel]
```

**Wali included only when** `includeWaliDetails: true` (currently: **active introduction** admin email).

---

## Member status email shell (shared)

Used for participant notifications (`buildParticipantStatusEmailHtml`):

```
Finding Keepers
{heading}
{body HTML}
[View my match requests] → /dashboard/my-match-requests
```

---

## Not emailed (for clarity)

| Action | What happens instead |
|--------|----------------------|
| Platform feedback submit | Row in `platform_feedback`; admin reads in `/fk-admin/feedback` |
| CV submit / edit / delete | No email |
| Login success | No email |
| Photo blur / visibility change | No email |

---

## Code map (for content edits)

| Area | File |
|------|------|
| From / admin address | `lib/email.ts` |
| Signup + password + verification pending | `app/actions/auth.ts` |
| Verification admin + verified/invalidated | `app/actions/verification.ts` |
| All matching emails | `app/actions/match.ts` |
| Contact Us | `app/actions/contact.ts` |

---

*Generated from codebase inventory. Update this file when email copy or triggers change.*
