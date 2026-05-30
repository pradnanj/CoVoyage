# CoVoyage — Architecture & Deployment

## Current Architecture

```
CoVoyage App (React + Vite)
          │
          ▼
┌─────────────────────────────────────────────┐
│  Crewfare.jsx  (app shell + shared state)   │
│  ├─ tripId derived from ?trip= URL param    │
│  ├─ organizer hard-redirect after onboard   │
│  └─ Admin Reset Panel (triple-click logo)   │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┼───────────┐
       ▼       ▼           ▼
  useMembers  useHotels  useActivities
  (tripId)    (tripId)    (tripId)
       │           │           │
       ▼           ▼           ▼
  src/services/database.js
  (hybrid — DynamoDB primary, localStorage fallback)
       │                   │
       ▼                   ▼
  AWS DynamoDB          localStorage
  (cloud, multi-device)  (always-on, single-device)
```

## External API Integrations

| Integration | Purpose | File |
|---|---|---|
| OpenDataSoft US Cities | Destination autocomplete | `src/services/locations.js` |
| Census Bureau Geocoder | City → lat/lng | `src/services/locations.js` |
| OpenStreetMap Overpass | Real Marriott hotels near destination | `src/services/marriottHotels.js` |
| Anthropic Claude (`claude-sonnet-4-5`) | AI activity suggestions, photo captions, concierge | `src/components/shared.jsx`, `src/components/tabs/MemoriesTab.jsx` |
| AWS DynamoDB | Persistent multi-device trip data | `src/services/database.js` |

---

## Running Locally

```bash
npm install
npm run dev
# → http://localhost:5173
```

### Required environment variables (`.env.local`)

```env
# DynamoDB — optional (app works without it)
VITE_AWS_REGION=us-east-2
VITE_AWS_ACCESS_KEY_ID=YOUR_KEY
VITE_AWS_SECRET_ACCESS_KEY=YOUR_SECRET
VITE_TRIP_ID=trip-2026

# Claude AI — required for AI search features
VITE_ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY
```

---

## Multi-Plan Isolation

Every trip plan is completely isolated using a `tripSlug` (e.g. `miami-2026`) derived from the destination and start year:

- Organizer finishes onboarding → app saves trip to DynamoDB and redirects to `?trip=miami-2026&skip=1`
- Invite link always contains `?trip=miami-2026&ref=organizer`
- All hooks (`useMembers`, `useHotels`, `useActivities`) receive `tripId` as a parameter
- All localStorage keys are namespaced: `crewfare_members_miami-2026`, etc.
- DynamoDB queries always use the `tripId-index` GSI

A member who receives the `orlando-2026` invite link will never see any data from the `miami-2026` plan, and vice versa.

---

## New Trip Flow (Organizer)

Click **+ New Trip** in the app header → clears session data → returns to landing page for a fresh onboarding flow. Each completed onboarding produces a unique `tripSlug` and isolated data partition.

---

## Data Reset

### In-app
Triple-click the **M** logo → type `RESET` → confirm.

### CLI
```bash
bash scripts/reset-db.sh
```

---

## Files Added / Changed

```
src/
├── services/
│   ├── database.js          ← resetAllData(), saveTrip(), getTrip() added
│   ├── locations.js         ← NEW: US city autocomplete + geocoding
│   └── marriottHotels.js    ← NEW: real-time Marriott hotel fetcher
├── hooks/
│   └── useDatabase.js       ← all hooks now accept tripId param; namespaced localStorage
└── components/
    ├── Crewfare.jsx          ← multi-plan isolation, booking modal, admin reset, + New Trip button
    ├── OrganizerOnboarding.jsx ← DestinationInput, dynamic hotel fetch, tripSlug on complete
    ├── AttendeeOnboarding.jsx  ← fetches real hotels for attendee destination display
    ├── shared.jsx             ← AISearch returns JSON activity cards; Claude auth headers fixed
    └── tabs/
        ├── HomeTab.jsx        ← null-safe guards for AI-generated activity props
        └── ActivitiesTab.jsx  ← BookActivityModal, AI-only activity entry, null-safe guards

scripts/
└── reset-db.sh               ← NEW: AWS CLI script to wipe all DynamoDB tables

.env.local                    ← VITE_ prefix (not REACT_APP_)
```

---

## Deployment to AWS Amplify

1. Push to GitHub
2. Connect repo in the Amplify Console → auto-build on every push
3. Add the environment variables from `.env.local` in **Amplify → App settings → Environment variables**
4. Ensure the IAM user has `AmazonDynamoDBFullAccess` (or the narrower policy in `DYNAMODB_SETUP.md`)

```bash
npm run build   # verify locally before pushing
git add .
git commit -m "deploy"
git push origin main
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `vite: command not found` | Run `npm install` |
| AI search returns nothing | Check `VITE_ANTHROPIC_API_KEY` in `.env.local`; restart dev server |
| Hotels not loading | Destination geocoding may fail for very small cities; try a major US city |
| DynamoDB SSL error | Add `--no-verify-ssl` to AWS CLI commands |
| Attendee sees wrong trip | Invite URL must include `?trip=<slug>&ref=organizer` |
| All members share one plan | Ensure hooks receive `tripId` and tables have `tripId-index` GSI |
