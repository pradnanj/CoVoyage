// Hybrid Database: localStorage (immediate) + DynamoDB (optional)
// Uses localStorage by default, switches to DynamoDB when AWS credentials are provided

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

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
// ═══════════════════════════════════════════════════════════════════════════

const storageKey = (type) => `crewfare_${type}`;

const localStorage_save = (type, id, data) => {
  const key = storageKey(type);
  const store = JSON.parse(window.localStorage.getItem(key) || '{}');
  store[id] = { ...data, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(key, JSON.stringify(store));
};

const localStorage_get = (type, id) => {
  const key = storageKey(type);
  const store = JSON.parse(window.localStorage.getItem(key) || '{}');
  return store[id] || null;
};

const localStorage_getAll = (type) => {
  const key = storageKey(type);
  const store = JSON.parse(window.localStorage.getItem(key) || '{}');
  return Object.values(store);
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API - Works with localStorage or DynamoDB
// ═══════════════════════════════════════════════════════════════════════════

// ───── TRIP OPERATIONS ─────────────────────────────────────────
export const saveTrip = async (tripData) => {
  const trip = {
    tripId: tripData.id || `trip-${Date.now()}`,
    ...tripData,
    createdAt: new Date().toISOString(),
  };

  if (USE_DYNAMODB && docClient) {
    try {
      await docClient.send(new PutCommand({ TableName: "CrewfareTrips", Item: trip }));
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error);
      localStorage_save('trips', trip.tripId, trip);
    }
  } else {
    localStorage_save('trips', trip.tripId, trip);
  }
  return trip;
};

export const getTrip = async (tripId) => {
  if (USE_DYNAMODB && docClient) {
    try {
      const response = await docClient.send(new GetCommand({ TableName: "CrewfareTrips", Key: { tripId } }));
      return response.Item;
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error);
      return localStorage_get('trips', tripId);
    }
  }
  return localStorage_get('trips', tripId);
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
      console.error("DynamoDB error, falling back to localStorage:", error);
      localStorage_save('members', member.memberId, member);
    }
  } else {
    localStorage_save('members', member.memberId, member);
  }
  return member;
};

export const getMembers = async (tripId) => {
  if (USE_DYNAMODB && docClient) {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: "CrewfareMembers",
        KeyConditionExpression: "tripId = :tripId",
        ExpressionAttributeValues: { ":tripId": tripId }
      }));
      return response.Items || [];
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error);
      return localStorage_getAll('members').filter(m => m.tripId === tripId);
    }
  }
  return localStorage_getAll('members').filter(m => m.tripId === tripId);
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
      console.error("DynamoDB error, falling back to localStorage:", error);
      localStorage_save('hotels', hotel.hotelId, hotel);
    }
  } else {
    localStorage_save('hotels', hotel.hotelId, hotel);
  }
  return hotel;
};

export const getHotels = async (tripId) => {
  if (USE_DYNAMODB && docClient) {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: "CrewfareHotels",
        KeyConditionExpression: "tripId = :tripId",
        ExpressionAttributeValues: { ":tripId": tripId }
      }));
      return response.Items || [];
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error);
      return localStorage_getAll('hotels').filter(h => h.tripId === tripId);
    }
  }
  return localStorage_getAll('hotels').filter(h => h.tripId === tripId);
};

// ───── ACTIVITIES OPERATIONS ───────────────────────────────────
export const saveActivity = async (tripId, activityData) => {
  const activity = {
    activityId: activityData.id || `activity-${Date.now()}`,
    tripId,
    ...activityData,
    createdAt: new Date().toISOString(),
  };

  if (USE_DYNAMODB && docClient) {
    try {
      await docClient.send(new PutCommand({ TableName: "CrewfareActivities", Item: activity }));
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error);
      localStorage_save('activities', activity.activityId, activity);
    }
  } else {
    localStorage_save('activities', activity.activityId, activity);
  }
  return activity;
};

export const getActivities = async (tripId) => {
  if (USE_DYNAMODB && docClient) {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: "CrewfareActivities",
        KeyConditionExpression: "tripId = :tripId",
        ExpressionAttributeValues: { ":tripId": tripId }
      }));
      return response.Items || [];
    } catch (error) {
      console.error("DynamoDB error, falling back to localStorage:", error);
      return localStorage_getAll('activities').filter(a => a.tripId === tripId);
    }
  }
  return localStorage_getAll('activities').filter(a => a.tripId === tripId);
};

export default {
  saveTrip, getTrip,
  saveMember, getMembers,
  saveHotel, getHotels,
  saveActivity, getActivities,
};
