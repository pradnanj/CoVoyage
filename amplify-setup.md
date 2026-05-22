# CrewFare AWS Amplify Backend Setup

## Option A: Using Amplify CLI (Recommended)

### 1. Configure Amplify CLI
```bash
amplify configure
```
This will guide you through AWS authentication.

### 2. Initialize Amplify Backend
```bash
amplify init
```
- **Project name:** crewfare-app
- **Environment:** dev
- **Default editor:** Visual Studio Code
- **AWS authentication profile:** (select the one created above)
- **Region:** us-east-1

### 3. Add Data Storage (API + Database)
```bash
amplify add api
```
- **Select from pre-configured templates:** REST API with Lambda
- **Choose:** Create a new Lambda function
- **Function name:** CrewfareAPI
- **Template:** Hello World
- **Add another function:** No

### 4. Add Database
```bash
amplify add storage
```
- **Select from pre-configured templates:** Content
- **Bucket name:** crewfare-data (or keep default)

### 5. Push to AWS
```bash
amplify push
```
This creates:
- DynamoDB tables
- Lambda functions
- API Gateway endpoints
- IAM roles

---

## Option B: Manual AWS Setup (If CLI doesn't work)

### Create DynamoDB Tables in AWS Console:

1. Go to https://console.aws.amazon.com/dynamodynamodb
2. Create table "CrewfareTrips" with:
   - Primary key: `tripId` (String)
   - On-demand billing
   
3. Create table "CrewfareMembers" with:
   - Primary key: `memberId` (String)
   - Sort key: `tripId` (String)
   
4. Create table "CrewfareHotels" with:
   - Primary key: `hotelId` (String)
   - Sort key: `tripId` (String)
   
5. Create table "CrewfareActivities" with:
   - Primary key: `activityId` (String)
   - Sort key: `tripId` (String)

---

## Next Steps:
After running `amplify push`, you'll get API endpoints to use in React!
