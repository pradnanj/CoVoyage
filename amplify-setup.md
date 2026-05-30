# CoVoyage — AWS Amplify Setup

## Prerequisites

- AWS account with an IAM user that has `AmazonDynamoDBFullAccess`
- Amplify CLI installed: `npm install -g @aws-amplify/cli`

---

## Option A — Amplify CLI

```bash
# 1. Configure AWS credentials
amplify configure

# 2. Initialize Amplify in the project root
amplify init
#  Project name:  covoyage
#  Environment:   dev
#  Region:        us-east-2

# 3. Deploy
amplify push
```

> The app uses direct DynamoDB SDK calls (not Amplify DataStore). After `amplify push` you only need the region and IAM credentials — no GraphQL or AppSync is required.

---

## Option B — Manual Table Creation (Recommended)

See `DYNAMODB_SETUP.md` for the exact `aws dynamodb create-table` commands including the required `tripId-index` GSI on each data table.

---

## Environment Variables

Amplify Hosting requires these variables to be added in the Amplify Console under **App settings → Environment variables**:

```
VITE_AWS_REGION
VITE_AWS_ACCESS_KEY_ID
VITE_AWS_SECRET_ACCESS_KEY
VITE_TRIP_ID
VITE_ANTHROPIC_API_KEY
```

For local development create `.env.local` in the project root with the same keys. Never commit this file — it is already listed in `.gitignore`.

---

## Deploy to Amplify Hosting

```bash
# Verify build passes locally
npm run build

# Push to GitHub — Amplify auto-deploys
git add .
git commit -m "deploy"
git push origin main
```

---

## IAM Policy (minimum required)

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

## Verifying the Setup

1. Start the app: `npm run dev`
2. Complete Organizer onboarding → app redirects to `?trip=<slug>&skip=1`
3. Copy the invite link from the Invite tab
4. Open the invite link in a new tab/incognito → complete Attendee onboarding
5. Check AWS Console → DynamoDB → `CrewfareMembers` — both the organizer and attendee rows should appear with matching `tripId`
6. Confirm both sessions show the same trip data (destination, hotels, crew list)

---

## Notes

- **No Amplify DataStore or AppSync** — the app uses `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` directly from the browser, authenticated with static IAM credentials.
- **For production** consider replacing static IAM credentials with Amazon Cognito Identity Pools to avoid exposing keys client-side.
- The app functions fully without DynamoDB (localStorage-only mode) — useful for demos without AWS setup.
