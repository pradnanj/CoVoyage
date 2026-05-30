// Hybrid Database: localStorage (immediate) + DynamoDB (optional)
// Uses localStorage by default, switches to DynamoDB when AWS credentials are provided

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const AWS_ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
const AWS_REGION = import.meta.env.VITE_AWS_REGION || "us-east-1";

const USE_DYNAMODB = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY;

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMODB IMPLEMENTATION (when credentials are available)
// ═══════════════════════════════════════════════════════════════════════════

let docClient = null;

if (USE_DYNAMODB) {
  try {
    const client = new DynamoDBClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      }
    });
    docClient = DynamoDBDocumentClient.from(client);
  } catch (error) {
    console.warn("DynamoDB not available, using localStorage:", error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCALSTORAGE IMPLEMENTATION (fallback & immediate)
// Keys are namespaced by both type and tripId so multiple plans never collide.
// ═══════════════════════════════════════════════════════════════════════════

const storageKey = (type, tripId) => tripId ? `crewfare_${type}_${tripId}` : `crewfare_${type}`;

const localStorage_save = (type, id, data, tripId) => {
  const key = storageKey(type, tripId);
  const store = JSON.parse(window.localStorage.getItem(key) || '{}');
  store[id] = { ...data, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(key, JSON.stringify(store));
};

const localStorage_get = (type, id, tripId) => {
  const key = storageKey(type, tripId);
  const store = JSON.parse(window.localStorage.getItem(key) || '{}');
  return store[id] || null;
};

const localStorage_getAll = (type, tripId) => {
  const key = storageKey(type, tripId);
  const store = JSON.parse(window.localStorage.getItem(key) || '{}');
  return Object.values(store);
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API - Works with localStorage or DynamoDB
// ═══════════════════════════════════════════════════════════════════════════

// ───── TRIP OPERATIONS ─────────────────────────────────────────
export const saveTrip = async (tripData) => {
  const trip = {
    tripId: tripData.tripSlug || tripData.id || `trip-${Date.now()}`,
    ...tripData,
    createdAt: new Date().toISOString(),
  };

  if (USE_DYNAMODB && docClient) {
    try {
      await docClient.send(new PutCommand({ TableName: "CrewfareTrips", Item: trip }));
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error.name);
      localStorage_save('trips', trip.tripId, trip, trip.tripId);
    }
  } else {
    localStorage_save('trips', trip.tripId, trip, trip.tripId);
  }
  // Always keep a quick-access copy keyed by tripSlug for cross-device attendee load
  window.localStorage.setItem(`crewfare_trip_${trip.tripId}`, JSON.stringify(trip));
  return trip;
};

export const getTrip = async (tripId) => {
  // Check the quick-access key first (set by saveTrip above)
  try {
    const quick = window.localStorage.getItem(`crewfare_trip_${tripId}`);
    if (quick) {
      const parsed = JSON.parse(quick);
      if (parsed && parsed.destination) return parsed;
    }
  } catch {}

  if (USE_DYNAMODB && docClient) {
    try {
      const response = await docClient.send(new GetCommand({ TableName: "CrewfareTrips", Key: { tripId } }));
      return response.Item;
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error.name);
      return localStorage_get('trips', tripId, tripId);
    }
  }
  return localStorage_get('trips', tripId, tripId);
};

// ───── MEMBERS OPERATIONS ──────────────────────────────────────
export const saveMember = async (tripId, memberData) => {
  const member = {
    memberId: memberData.id || `member-${Date.now()}`,
    tripId,
    ...memberData,
    createdAt: new Date().toISOString(),
  };

  if (USE_DYNAMODB && docClient) {
    try {
      await docClient.send(new PutCommand({ TableName: "CrewfareMembers", Item: member }));
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error.name);
      localStorage_save('members', member.memberId, member, tripId);
    }
  } else {
    localStorage_save('members', member.memberId, member, tripId);
  }
  return member;
};

export const getMembers = async (tripId) => {
  if (USE_DYNAMODB && docClient) {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: "CrewfareMembers",
        IndexName: "tripId-index",
        KeyConditionExpression: "tripId = :tripId",
        ExpressionAttributeValues: { ":tripId": tripId }
      }));
      return response.Items || [];
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error.name);
      return localStorage_getAll('members', tripId);
    }
  }
  return localStorage_getAll('members', tripId);
};

// ───── HOTELS OPERATIONS ───────────────────────────────────────
export const saveHotel = async (tripId, hotelData) => {
  const hotel = {
    hotelId: hotelData.id || `hotel-${Date.now()}`,
    tripId,
    ...hotelData,
    createdAt: new Date().toISOString(),
  };

  if (USE_DYNAMODB && docClient) {
    try {
      await docClient.send(new PutCommand({ TableName: "CrewfareHotels", Item: hotel }));
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error.name);
      localStorage_save('hotels', hotel.hotelId, hotel, tripId);
    }
  } else {
    localStorage_save('hotels', hotel.hotelId, hotel, tripId);
  }
  return hotel;
};

export const getHotels = async (tripId) => {
  if (USE_DYNAMODB && docClient) {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: "CrewfareHotels",
        IndexName: "tripId-index",
        KeyConditionExpression: "tripId = :tripId",
        ExpressionAttributeValues: { ":tripId": tripId }
      }));
      return response.Items || [];
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error.name);
      return localStorage_getAll('hotels', tripId);
    }
  }
  return localStorage_getAll('hotels', tripId);
};

// ───── ACTIVITIES OPERATIONS ───────────────────────────────────
export const saveActivity = async (tripId, activityData) => {
  const actId = activityData.id || activityData.activityId || `activity-${Date.now()}`;
  const activity = {
    activityId: actId,
    id: actId,           // keep id in sync so the app can always find it by a.id
    tripId,
    ...activityData,
    createdAt: activityData.createdAt || new Date().toISOString(),
  };

  if (USE_DYNAMODB && docClient) {
    try {
      await docClient.send(new PutCommand({ TableName: "CrewfareActivities", Item: activity }));
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error.name);
      localStorage_save('activities', activity.activityId, activity, tripId);
    }
  } else {
    localStorage_save('activities', activity.activityId, activity, tripId);
  }
  return activity;
};

export const getActivities = async (tripId) => {
  const normalise = (items) => items.map(a => ({
    ...a,
    // Ensure id is always present regardless of which key DynamoDB returned
    id: a.id || a.activityId,
    voters:   Array.isArray(a.voters)   ? a.voters   : [],
    comments: Array.isArray(a.comments) ? a.comments : [],
    upvotes:   typeof a.upvotes   === 'number' ? a.upvotes   : 0,
    downvotes: typeof a.downvotes === 'number' ? a.downvotes : 0,
    bookedBy:  Array.isArray(a.bookedBy) ? a.bookedBy : [],
  }));

  if (USE_DYNAMODB && docClient) {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: "CrewfareActivities",
        IndexName: "tripId-index",
        KeyConditionExpression: "tripId = :tripId",
        ExpressionAttributeValues: { ":tripId": tripId }
      }));
      return normalise(response.Items || []);
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error.name);
      return normalise(localStorage_getAll('activities', tripId));
    }
  }
  return normalise(localStorage_getAll('activities', tripId));
};

// ───── RESET ALL DATA ──────────────────────────────────────────
// Clears all crewfare localStorage keys AND deletes all DynamoDB rows
export const resetAllData = async () => {
  // 1. Wipe all crewfare localStorage keys
  const keysToRemove = Object.keys(window.localStorage).filter(k => k.startsWith('crewfare'));
  keysToRemove.forEach(k => window.localStorage.removeItem(k));

  // 2. Also wipe sessionStorage
  ['crewfare_user', 'crewfare_view', 'crewfare_trip'].forEach(k => sessionStorage.removeItem(k));

  if (!USE_DYNAMODB || !docClient) return { tables: [], rows: 0 };

  // 3. For each DynamoDB table, scan all items and delete them
  const TABLES = [
    { name: 'CrewfareTrips',      pk: 'tripId',      sk: null },
    { name: 'CrewfareMembers',    pk: 'memberId',    sk: 'tripId' },
    { name: 'CrewfareHotels',     pk: 'hotelId',     sk: 'tripId' },
    { name: 'CrewfareActivities', pk: 'activityId',  sk: 'tripId' },
  ];

  let totalDeleted = 0;
  const results = [];

  for (const table of TABLES) {
    let deleted = 0;
    let lastKey = undefined;
    try {
      do {
        // Project both hash key and sort key so DeleteItem has the full composite key
        const projFields = table.sk ? `${table.pk}, ${table.sk}` : table.pk;
        const scanRes = await docClient.send(new ScanCommand({
          TableName: table.name,
          ProjectionExpression: projFields,
          ExclusiveStartKey: lastKey,
          Limit: 100,
        }));
        const items = scanRes.Items || [];
        for (const item of items) {
          const key = { [table.pk]: item[table.pk] };
          if (table.sk && item[table.sk] !== undefined) key[table.sk] = item[table.sk];
          await docClient.send(new DeleteCommand({ TableName: table.name, Key: key }));
          deleted++;
        }
        lastKey = scanRes.LastEvaluatedKey;
      } while (lastKey);
      results.push({ table: table.name, deleted, status: 'ok' });
    } catch (err) {
      results.push({ table: table.name, deleted, status: `error: ${err.message}` });
    }
    totalDeleted += deleted;
  }

  return { tables: results, rows: totalDeleted };
};

export default {
  saveTrip, getTrip,
  saveMember, getMembers,
  saveHotel, getHotels,
  saveActivity, getActivities,
  resetAllData,
};
