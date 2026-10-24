# Doctor website with appointments

A complete website for one doctor (set up for Dr. Maria Nadeem Khan), with:

- **Public website**: bio, photo, achievements and awards with a photo slideshow, services and fees, all clinics with their own timings, events, health articles written by the doctor, patient reviews, clinic details, WhatsApp, QR code, English / اردو switch.
- **Online appointments**: clinic visit (patient chooses the clinic), video consult or follow-up; live free slots from the doctor's hours; no double booking; booking code for the patient.
- **My appointment**: patients check status, join the video call, read the doctor's advice, or cancel, using their code + mobile number.
- **Video consults**: every video booking gets its own private room (Jitsi).
- **Patient accounts** (`/patient`): patients sign up with email and password and see their upcoming appointments, every past visit with the treatment plan and prescription, their reports and files, and their health profile. Old bookings are added with a booking code plus mobile number, so nobody can open someone else's records with just a phone number. The doctor's private notes are never shown to patients.
- **Payments**: patients see the JazzCash, Easypaisa or bank details for the method they choose and attach the payment receipt while booking; receipts are private to the doctor.
- **Doctor app** (`/doctor`): a phone app for the doctor. Today's patients split into in-person and video, a day strip for the next two weeks, live alerts for new bookings, and a consultation screen with the patient's allergies and past visits, one-tap video call, call and WhatsApp, treatment plan, prescription with quick phrases, private notes and photo or PDF reports. Installs on Android and iPhone from the browser; no app store needed.
- **Doctor panel** (`/admin`, password protected): today's patients, new bookings appear live, confirm / done / no-show / cancel, walk-in bookings, private notes, prescription or diet plan sent on WhatsApp, edit profile and photo, fees, hours, days off, services, events, write and publish articles, approve reviews and reply to them, upload photos of your work and list awards.

Built with Next.js 14 (website) and Supabase (database, login, photo storage).

---

## Setting it up (about 30–45 minutes, no coding)

You need three free accounts: **GitHub**, **Supabase** and **Vercel**.

### 1. Create the database (Supabase)

1. Go to supabase.com → **New project**. Name it, choose a strong database password, and pick the region closest to Pakistan (e.g. Mumbai / ap-south-1).
2. When it's ready, open **SQL Editor → New query**. Paste everything from `supabase/schema.sql` and press **Run**.
3. New query again: paste `supabase/seed.sql` and **Run**. This adds Dr. Maria's starter text, four services and her weekly hours (all editable later).
4. Create the doctor's login: **Authentication → Users → Add user → Create new user**. Enter the doctor's email and a password, tick **Auto confirm user**.
5. Copy that user's **UID** from the users list. In SQL Editor run (paste the UID):
   ```sql
   insert into admins (user_id, note) values ('PASTE-UID-HERE', 'Dr. Maria');
   ```
   Repeat steps 4–5 for a receptionist if needed.
6. **Project Settings → API**: copy the **Project URL** and the **anon public** key. You'll paste them in step 3.

### 2. Put the code on GitHub

1. github.com → **New repository** (private is fine), e.g. `dr-maria-website`.
2. **Add file → Upload files**, drag in everything from this folder (not `node_modules` or `.next`), and **Commit**.

### 3. Publish the website (Vercel)

1. vercel.com → **Add New → Project → Import** your GitHub repository.
2. Before deploying, open **Environment Variables** and add:
   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 1.6 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key from step 1.6 |
   | `NEXT_PUBLIC_SITE_URL` | your web address, e.g. `https://drmarianadeem.com` |
   | `NEXT_PUBLIC_VIDEO_BASE_URL` | `https://meet.jit.si` |
3. Press **Deploy**. In about two minutes you get a link like `dr-maria-website.vercel.app`.
4. Back in Supabase → **Authentication → URL Configuration**: set **Site URL** to your website address and add `https://YOUR-SITE/admin/reset`, `https://YOUR-SITE/patient` and `https://YOUR-SITE/patient/reset` under **Redirect URLs** (for "Forgot password" and patient email confirmation).
5. **Authentication → Providers → Email**: keep **Confirm email** on, so patients prove they own their email. Supabase's built-in email is limited to a few messages per hour; for a live practice add your own email sender under **Authentication → SMTP Settings** (e.g. Resend, Brevo or Gmail SMTP).

### 4. Use your own domain (optional, recommended)

Buy a domain (`.com` from any registrar, or `.pk` through PKNIC or a reseller). In Vercel → **Project → Settings → Domains** → add it and follow the DNS instructions. Update `NEXT_PUBLIC_SITE_URL` and the Supabase Site URL to the new address, then **Redeploy**.

### 5. First login

Open `https://YOUR-SITE/admin`, sign in with the doctor's email and password, then:

1. **Profile & bio**: upload the photo, check name, degrees, PMDC number (optional, shown only if filled in), bio (English and Urdu), clinic address, WhatsApp, social links.
2. **Fees & booking**: set the real fees, appointment length, and your JazzCash, Easypaisa and bank account details (leave any method empty to hide it).
3. **Clinics**: add every clinic or hospital you work at. Then **Hours & days off**: set each clinic’s days and times, and your video hours. The starter data has two example clinics; rename or delete them.
4. **Footer & contact**: WhatsApp, phone, email, social media links and every line of the footer.
5. Add **Events & videos** (type “Video” and paste a YouTube link for knowledge videos; they stay on the site, while events hide after their date), and review the three draft **Articles** before publishing them (they are starter drafts, not medical advice from the doctor until she approves them).

Every change shows on the website straight away.

---

## Doctor app on the phone

Open `https://YOUR-SITE/doctor` on the doctor's phone and sign in with the doctor panel login.

- **Android (Chrome):** menu ⋮ → **Install app** (or **Add to Home screen**).
- **iPhone (Safari):** Share button → **Add to Home Screen**.

It then opens full screen from its own icon and stays signed in. To publish it in the Play Store or App Store later, the same app can be wrapped with Capacitor or a Trusted Web Activity (needs developer accounts: Google USD 25 once, Apple USD 99 a year).

## Daily use

- Keep `/admin` open on the clinic computer or phone: new bookings pop up live.
- **Confirm** new bookings, then **WhatsApp** the patient in one tap (message pre-filled).
- For video patients press **Start video** at the appointment time. The first time, sign in on the call page (Google or GitHub) so the room opens; patients never sign in.
- After the consult, write the plan in **Notes / Rx** and press **Save and send on WhatsApp**. The patient also sees it under **My appointment**.
- For online payments press **View receipt**, then **Mark paid** (this also confirms the booking).
- In **Notes / Rx** write the **treatment plan** and **prescription** (patients see both) and private notes (only you). Attach lab reports or diet-plan PDFs under **Reports & files**; they appear in the patient's account.
- The **Patients** tab shows everyone with an account: health profile, allergies, every visit and all files.
- Mark **Done** so the month's earnings add up. Patients can then review the visit from “My appointment”; these reviews show a “Verified patient” badge once you approve them.
- Print the QR code from the website footer on prescriptions and the clinic board.

## Running it on your computer (developers)

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000
```

## Security notes

- Patients cannot read any appointment except their own (code + matching mobile number).
- Booking goes through a database function that checks the doctor's hours, days off and the booking window, and prevents two patients taking the same slot.
- Only accounts listed in `admins` can change content or see appointments (row-level security on every table).
- Reviews stay hidden until the doctor approves them.

## Known limits and next steps

- **Video**: the free meet.jit.si server works in its own tab; embedding it inside the site is limited to 5-minute calls. To show calls inside the website with the doctor's branding, use 8x8 JaaS (free tier: 25 users) or your own Jitsi server, set `NEXT_PUBLIC_VIDEO_BASE_URL` to it and `NEXT_PUBLIC_VIDEO_EMBED=true`.
- **Payments**: patients pay at the clinic, or by JazzCash, Easypaisa or bank transfer and attach the receipt in the booking form; you check it and press **Mark paid**. Automatic card or wallet payment needs a merchant account with JazzCash, Easypaisa or a card gateway.
- **Automatic reminders**: confirmations are one tap on WhatsApp today. Fully automatic WhatsApp or SMS reminders need the WhatsApp Business API or an SMS provider.
- **Hosting plans**: free plans are fine for testing. Vercel's free plan is for non-commercial use, and Supabase pauses inactive free projects, so for a live practice check their current paid plans.
- **Another doctor**: repeat steps 1–5 with a new Supabase project and Vercel project. Each doctor gets their own site, data and login.
