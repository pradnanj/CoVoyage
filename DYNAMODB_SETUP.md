# CrewFare DynamoDB + Lambda Integration Guide

## 📋 Complete Setup Steps

### Step 1: Install Dependencies
```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### Step 2: Configure AWS Amplify Backend

**Option A: Using Amplify CLI (Recommended)**

```bash
# 1. Configure your AWS credentials
amplify configure

# 2. Initialize Amplify in your project
amplify init
# Select: dev environment, us-east-1 region

# 3. Add database (DynamoDB)
amplify add storage
# Select "Content" template

# 4. Deploy to AWS
amplify push
```

**Option B: Manual AWS Console Setup**

1. Go to https://console.aws.amazon.com/dynamodb
2. Create these tables (On-demand billing):

| Table Name | Primary Key | Sort Key | GSI |
|---|---|---|---|
| CrewfareTrips | tripId (String) | - | - |
| CrewfareMembers | memberId (String) | tripId (String) | tripId-index |
| CrewfareHotels | hotelId (String) | tripId (String) | tripId-index |
| CrewfareActivities | activityId (String) | tripId (String) | tripId-index |

### Step 3: Get AWS Credentials

1. Go to https://console.aws.amazon.com/iam/home#/users
2. Create new user "amplify-dev" with "Programmatic access"
3. Attach policy: "AmazonDynamoDBFullAccess"
4. Download CSV with Access Key ID and Secret Access Key

### Step 4: Configure Environment Variables

1. Open `.env.local` in your project
2. Fill in your AWS credentials:
```
REACT_APP_AWS_REGION=us-east-1
REACT_APP_AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_HERE
REACT_APP_AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY_HERE
REACT_APP_TRIP_ID=trip-orlando-2026
```

3. Add `.env.local` to `.gitignore` (don't commit credentials!)

### Step 5: Update Your React Components

**Example: Using Database Hooks in Crewfare.jsx**

```jsx
import { useMembers, useHotels, useActivities } from './hooks/useDatabase';

export default function Crewfare() {
  // Replace local state with database-synced hooks
  const { members, addMember, updateMember } = useMembers();
  const { hotels, updateHotel } = useHotels();
  const { activities, updateActivity } = useActivities();

  // When booking a room, it now saves to DynamoDB
  const handleBookRoom = async (hotelId, userName) => {
    // ... existing logic ...
    await updateHotel(hotelId, { bookedBy: [...hotel.bookedBy, userName] });
  };

  // ... rest of component
}
```

### Step 6: Deploy to Production

```bash
# Rebuild your app
npm run build

# Push to GitHub (auto-deploys to Amplify)
git add .
git commit -m "Add DynamoDB integration"
git push origin main
```

---

## 🔒 Security Notes

⚠️ **Never commit AWS credentials to GitHub!**

For production, use AWS Cognito:
1. Enable Cognito User Pool in Amplify
2. Add authentication to your app
3. Users authenticate instead of using access keys

---

## 📚 Example: Full Component Integration

```jsx
import { useMembers, useHotels } from './hooks/useDatabase';

export default function HotelsTab() {
  const { hotels, updateHotel } = useHotels();
  const { addMember } = useMembers();

  const handleBookRoom = async (hotelId, guestName) => {
    const hotel = hotels.find(h => h.id === hotelId);
    const updatedBooking = [...hotel.bookedBy, guestName];
    
    // Save to database
    await updateHotel(hotelId, { bookedBy: updatedBooking });
    
    // Add guest to crew
    await addMember({
      id: `m-${Date.now()}`,
      name: guestName,
      hotel: hotel.name,
      confirmed: true
    });
  };

  return (
    <div>
      {hotels.map(hotel => (
        <button onClick={() => handleBookRoom(hotel.id, 'New Guest')}>
          Book {hotel.name}
        </button>
      ))}
    </div>
  );
}
```

---

## ✅ Testing Data Persistence

1. Book a room in your app
2. Refresh the page
3. Check that booking is still there ✓
4. Go to AWS Console → DynamoDB → Tables and verify data was saved

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` again |
| "Invalid credentials" | Check `.env.local` file, ensure keys are correct |
| "Table doesn't exist" | Run `amplify push` or manually create in AWS Console |
| "CORS error" | Add Amplify REST API instead of direct DynamoDB access |

---

## 📞 Need Help?

- AWS Docs: https://docs.aws.amazon.com/dynamodb/
- Amplify Docs: https://docs.amplify.aws/
- DynamoDB Console: https://console.aws.amazon.com/dynamodb
