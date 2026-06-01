// Hybrid Database: localStorage (immediate) + DynamoDB (optional)
// Uses localStorage by default, switches to DynamoDB when AWS credentials are provided

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

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
// saveActivity: full PUT — use for new activities
export const saveActivity = async (tripId, activityData) => {
  const actId = activityData.id || activityData.activityId || `activity-${Date.now()}`;
  const activity = {
    activityId: actId,
    id: actId,
    tripId,
    ...activityData,
    createdAt: activityData.createdAt || new Date().toISOString(),
  };

  if (USE_DYNAMODB && docClient) {
    try {
      await docClient.send(new PutCommand({ TableName: "CrewfareActivities", Item: activity }));
    } catch (error) {
      console.error("DynamoDB saveActivity error, falling back to localStorage:", error.name);
      localStorage_save('activities', activity.activityId, activity, tripId);
    }
  } else {
    localStorage_save('activities', activity.activityId, activity, tripId);
  }
  return activity;
};

// updateActivityFields: partial UPDATE — only writes the specified fields, never replaces
export const updateActivityFields = async (tripId, activityId, updates) => {
  if (USE_DYNAMODB && docClient) {
    try {
      // Build a DynamoDB UpdateExpression from the updates object
      const names = {};
      const values = {};
      const sets = [];
      Object.entries(updates).forEach(([k, v], i) => {
        // Skip DynamoDB key fields — they cannot be updated
        if (k === 'activityId' || k === 'tripId') return;
        const nameKey = `#f${i}`;
        const valKey = `:v${i}`;
        names[nameKey] = k;
        values[valKey] = v;
        sets.push(`${nameKey} = ${valKey}`);
      });
      if (sets.length === 0) return;
      await docClient.send(new UpdateCommand({
        TableName: "CrewfareActivities",
        Key: { activityId, tripId },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }));
      return;
    } catch (error) {
      console.error("DynamoDB updateActivityFields error, falling back to localStorage:", error.name);
    }
  }
  // localStorage fallback: read existing array, find and merge item, write back
  const key = storageKey('activities', tripId);
  // useDatabase.js stores activities as an array; database.js localStorage_save stores as object-by-id.
  // Handle both formats gracefully.
  const raw = window.localStorage.getItem(key);
  let store;
  try { store = JSON.parse(raw || '[]'); } catch { store = []; }

  if (Array.isArray(store)) {
    // Array format (written by useDatabase.js hooks)
    const next = store.map(item => {
      const itemId = item.activityId || item.id;
      if (itemId === activityId) return { ...item, ...updates, activityId: itemId, id: itemId, updatedAt: new Date().toISOString() };
      return item;
    });
    window.localStorage.setItem(key, JSON.stringify(next));
  } else {
    // Object-by-id format (written by localStorage_save)
    const existing = store[activityId] || {};
    store[activityId] = { ...existing, ...updates, activityId, tripId, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(key, JSON.stringify(store));
  }
};

export const getActivities = async (tripId) => {
  const normalise = (items) => items.map(a => ({
    ...a,
    id: a.id || a.activityId,
    voters:    Array.isArray(a.voters)    ? a.voters    : [],
    comments:  Array.isArray(a.comments)  ? a.comments  : [],
    upvotes:   typeof a.upvotes   === 'number' ? a.upvotes   : 0,
    downvotes: typeof a.downvotes === 'number' ? a.downvotes : 0,
    bookedBy:  Array.isArray(a.bookedBy)  ? a.bookedBy  : [],
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
      console.error("DynamoDB getActivities error, falling back to localStorage:", error.name);
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

// ───── ITINERARY OPERATIONS ────────────────────────────────────
// Stored as a field on the trip record (no extra table needed)
// ───── EXPENSES OPERATIONS ─────────────────────────────────────
// Expenses are stored as a single JSON attribute on the trip record,
// mirroring the same pattern used for the itinerary.
// ───── PHOTOS / MEMORIES OPERATIONS ──────────────────────────────────────
// Strategy: metadata (id, label, day, tag, caption, uploadedBy, etc.) goes to DynamoDB.
// The actual base64 src is stored in localStorage only (DynamoDB 400KB item limit).
// Other users see metadata immediately; the src loads from their own localStorage if
// they uploaded that photo, or shows a placeholder if they have not yet.

// Strip src before sending to DynamoDB to stay under item size limits
const photoMeta = (p) => {
  const { src, ...meta } = p; // eslint-disable-line no-unused-vars
  return meta;
};

export const savePhotos = async (tripId, photos) => {
  const metaOnly = photos.map(photoMeta);
  const key = `crewfare_photos_meta_${tripId}`;
  window.localStorage.setItem(key, JSON.stringify(metaOnly));

  if (USE_DYNAMODB && docClient) {
    try {
      await docClient.send(new UpdateCommand({
        TableName: "CrewfareTrips",
        Key: { tripId },
        UpdateExpression: "SET #ph = :ph",
        ExpressionAttributeNames: { "#ph": "photos" },
        ExpressionAttributeValues: { ":ph": metaOnly },
      }));
    } catch (error) {
      console.error("DynamoDB savePhotos error:", error.name);
    }
  }
};

export const getPhotos = async (tripId) => {
  if (USE_DYNAMODB && docClient) {
    try {
      const response = await docClient.send(new GetCommand({
        TableName: "CrewfareTrips",
        Key: { tripId },
        ProjectionExpression: "photos",
      }));
      if (response.Item?.photos) return response.Item.photos;
    } catch (error) {
      console.error("DynamoDB getPhotos error:", error.name);
    }
  }
  try {
    const saved = window.localStorage.getItem(`crewfare_photos_meta_${tripId}`);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

export const saveExpenses = async (tripId, expenses) => {
  const key = `crewfare_expenses_${tripId}`;
  window.localStorage.setItem(key, JSON.stringify(expenses));
  if (USE_DYNAMODB && docClient) {
    try {
      await docClient.send(new UpdateCommand({
        TableName: "CrewfareTrips",
        Key: { tripId },
        UpdateExpression: "SET #ex = :ex",
        ExpressionAttributeNames: { "#ex": "expenses" },
        ExpressionAttributeValues: { ":ex": expenses },
      }));
    } catch (error) {
      console.error("DynamoDB saveExpenses error:", error.name);
    }
  }
};

export const getExpenses = async (tripId) => {
  if (USE_DYNAMODB && docClient) {
    try {
      const response = await docClient.send(new GetCommand({
        TableName: "CrewfareTrips",
        Key: { tripId },
        ProjectionExpression: "expenses",
      }));
      if (response.Item?.expenses) return response.Item.expenses;
    } catch (error) {
      console.error("DynamoDB getExpenses error:", error.name);
    }
  }
  try {
    const saved = window.localStorage.getItem(`crewfare_expenses_${tripId}`);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

export const saveItinerary = async (tripId, itinerary) => {
  const key = `crewfare_itinerary_${tripId}`;
  window.localStorage.setItem(key, JSON.stringify(itinerary));
  if (USE_DYNAMODB && docClient) {
    try {
      await docClient.send(new UpdateCommand({
        TableName: "CrewfareTrips",
        Key: { tripId },
        UpdateExpression: "SET #it = :it",
        ExpressionAttributeNames: { "#it": "itinerary" },
        ExpressionAttributeValues: { ":it": itinerary },
      }));
    } catch (error) {
      console.error("DynamoDB saveItinerary error:", error.name);
    }
  }
};

export const getItinerary = async (tripId) => {
  if (USE_DYNAMODB && docClient) {
    try {
      const response = await docClient.send(new GetCommand({
        TableName: "CrewfareTrips",
        Key: { tripId },
        ProjectionExpression: "itinerary",
      }));
      if (response.Item?.itinerary) return response.Item.itinerary;
    } catch (error) {
      console.error("DynamoDB getItinerary error:", error.name);
    }
  }
  try {
    const saved = window.localStorage.getItem(`crewfare_itinerary_${tripId}`);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
};

export default {
  saveTrip, getTrip,
  saveMember, getMembers,
  saveHotel, getHotels,
  saveActivity, updateActivityFields, getActivities,
  savePhotos, getPhotos,
  saveExpenses, getExpenses,
  saveItinerary, getItinerary,
  resetAllData,
};
