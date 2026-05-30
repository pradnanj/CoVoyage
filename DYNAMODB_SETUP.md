# CoVoyage — DynamoDB Setup Guide

## Table Schema

| Table | Primary Key | GSI |
|---|---|---|
| `CrewfareTrips` | `tripId` (String) | — |
| `CrewfareMembers` | `memberId` (String) | `tripId-index` (hash: `tripId`) |
| `CrewfareHotels` | `hotelId` (String) | `tripId-index` (hash: `tripId`) |
| `CrewfareActivities` | `activityId` (String) | `tripId-index` (hash: `tripId`) |

> **Important:** `CrewfareMembers`, `CrewfareHotels`, and `CrewfareActivities` all require a Global Secondary Index named **`tripId-index`** with `tripId` as the hash key. Without the GSI the app cannot query members/hotels/activities by trip.

---

## Step 1 — Install AWS SDK

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

---

## Step 2 — Create DynamoDB Tables (AWS CLI)

```bash
REGION=us-east-2

# CrewfareTrips
aws dynamodb create-table \
  --table-name CrewfareTrips \
  --attribute-definitions AttributeName=tripId,AttributeType=S \
  --key-schema AttributeName=tripId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION --no-verify-ssl

# CrewfareMembers + tripId-index
aws dynamodb create-table \
  --table-name CrewfareMembers \
  --attribute-definitions \
    AttributeName=memberId,AttributeType=S \
    AttributeName=tripId,AttributeType=S \
  --key-schema AttributeName=memberId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName":"tripId-index",
    "KeySchema":[{"AttributeName":"tripId","KeyType":"HASH"}],
    "Projection":{"ProjectionType":"ALL"}
  }]' \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION --no-verify-ssl

# CrewfareHotels + tripId-index
aws dynamodb create-table \
  --table-name CrewfareHotels \
  --attribute-definitions \
    AttributeName=hotelId,AttributeType=S \
    AttributeName=tripId,AttributeType=S \
  --key-schema AttributeName=hotelId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName":"tripId-index",
    "KeySchema":[{"AttributeName":"tripId","KeyType":"HASH"}],
    "Projection":{"ProjectionType":"ALL"}
  }]' \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION --no-verify-ssl

# CrewfareActivities + tripId-index
aws dynamodb create-table \
  --table-name CrewfareActivities \
  --attribute-definitions \
    AttributeName=activityId,AttributeType=S \
    AttributeName=tripId,AttributeType=S \
  --key-schema AttributeName=activityId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName":"tripId-index",
    "KeySchema":[{"AttributeName":"tripId","KeyType":"HASH"}],
    "Projection":{"ProjectionType":"ALL"}
  }]' \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION --no-verify-ssl
```

---

## Step 3 — Configure Environment Variables

Create `.env.local` in the project root:

```env
VITE_AWS_REGION=us-east-2
VITE_AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
VITE_AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
VITE_TRIP_ID=trip-2026
VITE_ANTHROPIC_API_KEY=sk-ant-api03-YOUR_ANTHROPIC_KEY
```

> Use `VITE_` prefix — not `REACT_APP_`. Vite ignores `REACT_APP_` variables.

Restart the dev server after editing `.env.local`:

```bash
npm run dev
```

---

## Step 4 — Verify Tables Exist

```bash
aws dynamodb list-tables --region us-east-2 --no-verify-ssl
```

Expected output:
```json
{
  "TableNames": [
    "CrewfareActivities",
    "CrewfareHotels",
    "CrewfareMembers",
    "CrewfareTrips"
  ]
}
```

---

## How the App Uses DynamoDB

All reads/writes go through `src/services/database.js` which auto-detects whether credentials are present:

- **With credentials** → writes to DynamoDB (with localStorage fallback on error)
- **Without credentials** → uses localStorage only

The hooks in `src/hooks/useDatabase.js` (`useMembers`, `useHotels`, `useActivities`) each accept a `tripId` parameter. Every query uses the `tripId-index` GSI so data is always scoped to one trip plan.

### Data flow per plan

```
Organizer completes onboarding
  → tripSlug = "miami-2026"
  → saveTrip({ tripId: "miami-2026", ... })           → CrewfareTrips
  → saveMember("miami-2026", organizerMember)          → CrewfareMembers (tripId=miami-2026)
  → Hard redirect: ?trip=miami-2026&skip=1

Attendee opens invite link (?trip=miami-2026&ref=organizer)
  → getTrip("miami-2026")                             ← CrewfareTrips
  → getMembers("miami-2026")                          ← CrewfareMembers WHERE tripId=miami-2026
  → saveMember("miami-2026", attendeeMember)           → CrewfareMembers (tripId=miami-2026)
```

---

## Resetting All Data

### CLI script
```bash
bash scripts/reset-db.sh
# prompts: Type RESET to continue
```

### In-app
Triple-click the red **M** logo → Admin Reset panel → type `RESET` → Confirm.

### Manual AWS CLI (per table)
```bash
# Example: clear all members
aws dynamodb scan \
  --table-name CrewfareMembers \
  --projection-expression "memberId" \
  --query "Items[*].memberId.S" \
  --output text \
  --region us-east-2 --no-verify-ssl \
| tr '\t' '\n' \
| xargs -I{} aws dynamodb delete-item \
    --table-name CrewfareMembers \
    --key '{"memberId":{"S":"{}"}}' \
    --region us-east-2 --no-verify-ssl
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `ResourceNotFoundException` | Tables not created — run the `create-table` commands above |
| DynamoDB error, falling back to localStorage | Check credentials in `.env.local`; ensure `VITE_` prefix |
| SSL validation failed | Add `--no-verify-ssl` to AWS CLI commands |
| Data missing after refresh | Check browser DevTools → Application → localStorage for `crewfare_members_<tripId>` |
| Attendee sees wrong trip | Ensure invite URL includes `?trip=<slug>&ref=organizer` |
| Two plans sharing members | Confirm `tripId-index` GSI exists on `CrewfareMembers`, `CrewfareHotels`, `CrewfareActivities` |

---

## IAM Permissions Required

The IAM user or role needs at minimum:

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:GetItem",
    "dynamodb:Query",
    "dynamodb:Scan",
    "dynamodb:DeleteItem"
  ],
  "Resource": [
    "arn:aws:dynamodb:us-east-2:*:table/Crewfare*",
    "arn:aws:dynamodb:us-east-2:*:table/Crewfare*/index/*"
  ]
}
```

---

## Cost Estimate

| Service | Estimated cost |
|---|---|
| DynamoDB (on-demand) | $0–5/month for typical group-trip workloads |
| Anthropic Claude API | ~$0.003–0.015 per AI activity search |
| **Total** | **< $10/month** |
