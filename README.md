# Crewfare — Marriott Bonvoy Group Trip Planner

A full-featured group trip planning microsite built with React + Vite, powered by Marriott Bonvoy branding and an AI concierge backed by Claude (Anthropic).

---

## Overview

Crewfare lets groups of friends and families plan trips together — from booking hotels and coordinating flights to brainstorming activities and building a shared itinerary. It supports two distinct user personas: **Trip Organizer** and **Trip Attendee**.

**Demo destination:** Orlando, FL · Jul 12–18, 2026

---

## Features

### Two User Personas

#### Trip Organizer
- Select destination, trip name, and travel dates
- Browse and book the first hotel room
- Enter personal flight itinerary
- Set up group info (name, email, estimated rooms, welcome note)
- Generate and share a unique invite link with attendees

#### Trip Attendee (TurboTax-style onboarding)
- Opens the organizer's shared link
- Signs in via Marriott Bonvoy, Google, or Apple
- Enters names and ages of all guests in their room
- Sees where other crew members have booked; books their own room
- Enters flight arrival and departure details
- Automatically added to the crew list upon completion

---

### Home Page
- **Hero banner** with trip name, destination, dates, and group stats
- **Room booking progress bar** — tracks toward 10-room milestone for 12% group discount
- **Live hotel breakdown** — shows who booked where with avatars
- **Crew status list** — confirmed/pending attendees with hotel assignments
- **Activity Brainstorm Board** — top 5 activities sorted by net votes with upvote/downvote/comment

### Hotels Tab
- Hotel cards with images, amenities, rates, and Bonvoy points
- Organizer's hotel highlighted with a gold badge
- Live "Booked by" list with attendee avatars
- Booking modal with name capture — updates room count and crew list instantly everywhere

### Activities Tab
- **AI Concierge search** powered by Claude — hotel activities (pool, spa, restaurant) shown first with a gold "HOTEL HIGHLIGHT" badge
- Filter by category: Theme Park, Outdoor, Food & Beverage, Wellness, Educational, Pool/Resort
- Sort by popularity (net votes) or price
- Each activity card shows: price per person, description, available dates & times, age restrictions, deadline to book, cancellation policy, voter avatars
- **Upvote / Downvote** — list re-sorts in real time on every vote
- Comment thread per activity
- Book activity button
- **Food preferences panel** — dietary restrictions (Gluten-Free, Vegan, Halal, etc.), meal times, allergy notes
- Submit your own activity idea form

### Itinerary Page
- Full 7-day combined group itinerary (Jul 12–18)
- Color-coded event types: hotel, activity, food, transport, personal
- Timeline view with connectors
- Filter events by individual crew member
- **Add Event modal** — title, time, day, event type, attendees, private flag (e.g. personal spa appointment)

### Budget Tab
- Total estimated, committed, and remaining budget
- Per-person cost breakdown
- Line-item expense list with committed/estimated status
- Marriott Bonvoy savings callout (points + group discount)

### Memories Tab
- Photo upload (drag-and-drop or file picker)
- Tag-based filtering (Arrival, Culture, Adventure, Food, Family, etc.)
- Grid and scrapbook (polaroid) view
- AI-generated photo captions powered by Claude
- Trip postcard generator — creates a printable postcard with story, highlights, and insider tips

### Invite Tab
- Copy-to-clipboard shareable invite link
- Live crew roster (updates when new members join)
- Share via Email, Text, WhatsApp

---

## Dynamic State

All state is lifted to the top-level `Crewfare` component and passed down as props:

| Action | Updates |
|---|---|
| Book a room (Hotels tab or Attendee onboarding) | Hotel's "Booked by" list, room count progress bar, crew list, header avatars |
| Complete Attendee onboarding | New member added to crew list, Invite roster, header |
| Upvote / Downvote an activity | Activity list re-sorts by net votes instantly |
| Add event to itinerary | Appears in the shared group timeline |

---

## Demo Data — Orlando, FL

**Hotels:**
- Orlando World Center Marriott *(Organizer's hotel)* — $289/night
- JW Marriott Orlando Grande Lakes — $359/night
- Courtyard Orlando Lake Buena Vista — $169/night
- Renaissance Orlando at SeaWorld — $229/night

**Activities:**
- Magic Kingdom — Disney World
- Universal Studios / Wizarding World of Harry Potter
- Kennedy Space Center & NASA Shuttle Tour
- Marriott World Center Pool & Cabana *(Hotel Highlight)*
- Marriott Spa Day *(Hotel Highlight)*
- Cocoa Beach Day Trip
- Mikado Hotel Restaurant (teppanyaki) *(Hotel Highlight)*
- EPCOT Food & Wine Experience

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 |
| Routing | React Router DOM |
| Styling | Inline styles with Marriott Bonvoy design tokens |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Data | Local state (no backend) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The app runs at **http://localhost:5173** by default.

---

## URL Parameters

| Parameter | Effect |
|---|---|
| `?trip=orlando-2026&ref=organizer` | Opens the Attendee onboarding flow (simulates clicking a shared link) |
| `?skip=1` | Skips onboarding entirely and opens the trip dashboard directly |

---

## Project Structure

```
src/
├── main.jsx                          # React entry point
├── App.jsx                           # Root component
├── constants.js                      # All demo data & design tokens
├── index.css                         # Global styles & animations
└── components/
    ├── Crewfare.jsx                  # App shell, routing, shared state
    ├── OrganizerOnboarding.jsx       # 6-step organizer setup flow
    ├── AttendeeOnboarding.jsx        # 6-step attendee onboarding flow
    ├── shared.jsx                    # Shared UI: Av, Tag, Card, Buttons, AISearch
    └── tabs/
        ├── HomeTab.jsx               # Home page with brainstorm board
        ├── ActivitiesTab.jsx         # Activity feed with AI search
        ├── ItineraryTab.jsx          # Group itinerary timeline
        └── MemoriesTab.jsx           # Photo memories & postcard generator
```

---

## AI Concierge

The AI search in the Activities tab and Home page is powered by Anthropic's Claude API. It is configured to:
- Prioritize activities **at or offered by the Marriott World Center** (pool, spa, restaurants, shuttle, kids club)
- Provide specific pricing and Bonvoy point tips
- Respond in the voice of a knowledgeable hotel concierge

> **Note:** The Claude API key must be configured for AI features to work. The app includes offline fallback responses so it is fully functional without an API key.

---

## Group Discount

When the group reaches **10 rooms booked**, a **12% discount** is automatically unlocked for all room rates. The progress bar on the Home page and Hotels tab tracks this in real time.
