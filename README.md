# CoVoyage — Group Trip Planner

A full-featured group trip planning microsite built with **React + Vite**, powered by Marriott Bonvoy branding, real-time location and hotel data, and an AI concierge backed by Claude (Anthropic).

---

## Overview

CoVoyage lets groups of friends and families plan trips together — from booking Marriott hotels and coordinating flights to brainstorming activities and building a shared itinerary. It supports two distinct user personas: **Trip Organizer** and **Trip Attendee**, with full multi-plan isolation so multiple independent trip plans can coexist without data bleeding between them.

---

## Features

### Two User Personas

#### Trip Organizer
- Select a **real-time US city destination** (autocomplete powered by OpenDataSoft + Census Bureau Geocoder)
- Set trip name and travel dates
- Browse and book from **live Marriott hotels near the selected destination** (OpenStreetMap Overpass API)
- Enter personal flight itinerary
- Set group info (name, email, estimated rooms, welcome note)
- Generate and share a **unique per-trip invite link** (e.g. `?trip=miami-2026&ref=organizer`)

#### Trip Attendee
- Opens the organizer's shared link → sees the exact trip destination, dates, and hotel options
- Signs in via Marriott Bonvoy, Google, or Apple
- Enters names and ages of all guests in their room
- Sees where other crew members have booked; books their own room
- Enters flight arrival and departure details
- Automatically added to the crew list upon completion

---

### Home Page
- **Hero banner** with destination-aware background image, trip name, dates, and group stats
- **Room booking progress bar** — tracks toward the group discount milestone
- **Live hotel breakdown** — shows who booked where with avatars
- **Crew status list** — confirmed/pending attendees with hotel assignments
- **Activity Brainstorm Board** — top activities sorted by net votes with upvote/downvote/comment

### Hotels Tab
- **Real-time Marriott hotels** near the selected destination fetched on every tab visit
- Hotel cards with images, amenities, rates, and Bonvoy points
- Organizer's hotel highlighted with a gold badge
- Live "Booked by" list with attendee avatars
- Booking modal with name capture — updates room count and crew list instantly everywhere
- Shimmer loading skeleton while hotels are being fetched

### Activities Tab
- **AI Concierge search** powered by Claude — type a query and get 5–8 structured activity cards specific to your destination, each with an **Add** button to add directly to the board
- No manual form — all activities come from the AI or the brainstorm board
- Filter by category (Outdoor, Culture, Food, Entertainment, Sports, Wellness, Adventure, Shopping, Nightlife)
- Sort by popularity (net votes) or price
- Each activity card: price per person, description, duration, voter avatars, comments
- **Upvote / Downvote** — list re-sorts in real time
- Comment thread per activity
- **Book Now** → opens a date + time picker within the planned trip's date range → confirms booking and adds to itinerary automatically
- **Food preferences panel** — dietary restrictions, meal times, allergy notes

### Itinerary Page
- Full combined group itinerary across all trip days
- Events auto-populate when activities are booked from the Activities tab
- Color-coded event types: hotel, activity, food, transport, personal
- Timeline view with connectors
- Filter events by individual crew member
- **Add Event modal** — title, time, day, event type, attendees, private flag

### Budget Tab
- Total estimated, committed, and remaining budget
- Per-person cost breakdown
- Line-item expense list
- Marriott Bonvoy savings callout

### Memories Tab
- Photo upload (drag-and-drop or file picker)
- Tag-based filtering
- Grid and scrapbook (polaroid) view
- AI-generated photo captions powered by Claude
- Trip postcard generator

### Invite Tab
- Copy-to-clipboard shareable invite link (dynamically reflects the organizer's chosen destination and year)
- Live crew roster (updates when new members join)
- Share via Email, Text, WhatsApp

---

## Multi-Plan Isolation

Each trip plan is fully isolated:

| Resource | Isolation key |
|---|---|
| DynamoDB members | `tripId` (GSI `tripId-index`) |
| DynamoDB hotels | `tripId` (GSI `tripId-index`) |
| DynamoDB activities | `tripId` (GSI `tripId-index`) |
| localStorage members | `crewfare_members_<tripSlug>` |
| localStorage activities | `crewfare_activities_<tripSlug>` |
| Trip info | `crewfare_trip_<tripSlug>` |

When an organizer completes onboarding the app **hard-redirects** to `?trip=<slug>&skip=1` so all React hooks reinitialise with the correct `tripId`. Attendees always use the `?trip=` URL param as their primary tripId source.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 |
| Styling | Inline styles with Marriott Bonvoy design tokens |
| AI | Anthropic Claude (`claude-sonnet-4-5`) |
| Location search | OpenDataSoft US Cities API + Census Bureau Geocoder |
| Hotel data | OpenStreetMap Overpass API (real Marriott properties) |
| Database | AWS DynamoDB (optional) + localStorage (always-on fallback) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs at **http://localhost:5173** by default.

---

## Environment Variables

Create `.env.local` in the project root:

```env
# AWS DynamoDB (optional — app works with localStorage if omitted)
VITE_AWS_REGION=us-east-2
VITE_AWS_ACCESS_KEY_ID=YOUR_KEY_HERE
VITE_AWS_SECRET_ACCESS_KEY=YOUR_SECRET_HERE
VITE_TRIP_ID=trip-2026

# Anthropic Claude AI (required for AI activity search and photo captions)
VITE_ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
```

> **Never commit `.env.local` to source control.**

---

## URL Parameters

| Parameter | Effect |
|---|---|
| `?trip=miami-2026&ref=organizer` | Opens the Attendee welcome + onboarding flow for the Miami 2026 plan |
| `?trip=miami-2026&skip=1` | Opens the trip dashboard directly (post-onboarding redirect) |
| `?skip=1` | Skips onboarding and opens the app with whatever trip is in session |

---

## Project Structure

```
src/
├── main.jsx                          # React entry point
├── constants.js                      # Design tokens, fallback data
├── index.css                         # Global styles & animations
├── services/
│   ├── database.js                   # DynamoDB + localStorage hybrid API
│   ├── locations.js                  # US city autocomplete & geocoding
│   └── marriottHotels.js             # Real-time Marriott hotel fetcher (Overpass)
├── hooks/
│   └── useDatabase.js                # useMembers / useHotels / useActivities hooks
└── components/
    ├── Crewfare.jsx                  # App shell, routing, shared state
    ├── OrganizerOnboarding.jsx       # Multi-step organizer setup flow
    ├── AttendeeOnboarding.jsx        # Multi-step attendee onboarding flow
    ├── shared.jsx                    # Shared UI: Av, Tag, Card, Buttons, AISearch
    └── tabs/
        ├── HomeTab.jsx               # Home page with brainstorm board
        ├── HotelsTab.jsx             # (defined in Crewfare.jsx)
        ├── ActivitiesTab.jsx         # Activity feed with AI search & book-now flow
        ├── ItineraryTab.jsx          # Group itinerary timeline
        ├── ExpenseTab.jsx            # Budget tracker
        └── MemoriesTab.jsx           # Photo memories & postcard generator
scripts/
└── reset-db.sh                       # CLI script to wipe all DynamoDB tables
```

---

## AI Concierge

The AI search in the Activities tab is powered by Anthropic's `claude-sonnet-4-5` model. When `onAddActivity` is wired (Activities tab), it requests a **structured JSON array** of destination-specific activities. Each result renders as a card with an **+ Add** button. When used elsewhere (general questions), it returns conversational prose.

> The Claude API key must be set as `VITE_ANTHROPIC_API_KEY` in `.env.local`. Without it, a setup prompt is shown instead of AI results.

---

## Resetting All Data

### In-app (triple-click the "M" logo in the header)
Opens an admin panel. Requires typing `RESET` to confirm. Deletes all rows from all DynamoDB tables and clears all `crewfare_*` localStorage keys.

### CLI
```bash
bash scripts/reset-db.sh
# prompts: Type RESET to continue
```

---

## Group Discount

When the group reaches the organizer's target room count, a percentage discount is automatically unlocked. The progress bar on the Home page and Hotels tab tracks this in real time. Both values are set by the organizer during onboarding.
