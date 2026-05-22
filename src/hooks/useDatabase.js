import { useState, useEffect, useCallback } from 'react';
import {
  saveTrip, getTrip,
  saveMember, getMembers,
  saveHotel, getHotels,
  saveActivity, getActivities
} from '../services/database';
import { MEMBERS, HOTELS, ACTIVITIES } from '../constants';

const TRIP_ID = import.meta.env.VITE_TRIP_ID || 'trip-orlando-2026';

// ───── HOOK: Use Members with Database Sync ────────────────────
// Falls back to mock MEMBERS data if database is empty
export const useMembers = () => {
  const [members, setMembers] = useState(() => MEMBERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const data = await getMembers(TRIP_ID);
        // Use database data if available, otherwise use mock MEMBERS
        setMembers(data.length > 0 ? data : MEMBERS);
      } catch (error) {
        console.warn('Failed to load members, using defaults:', error);
        setMembers(MEMBERS);
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, []);

  const addMember = useCallback(async (memberData) => {
    try {
      const saved = await saveMember(TRIP_ID, memberData);
      setMembers(prev => [...prev, saved]);
      return saved;
    } catch (error) {
      console.error('Failed to add member:', error);
      // Still add locally even if database fails
      setMembers(prev => [...prev, memberData]);
    }
  }, []);

  const updateMember = useCallback(async (memberId, updates) => {
    try {
      const updated = { id: memberId, ...updates };
      await saveMember(TRIP_ID, updated);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...updates } : m));
    } catch (error) {
      console.error('Failed to update member:', error);
      // Still update locally even if database fails
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...updates } : m));
    }
  }, []);

  return { members, loading, addMember, updateMember };
};

// ───── HOOK: Use Hotels with Database Sync ────────────────────
// Falls back to mock HOTELS data if database is empty
export const useHotels = () => {
  const [hotels, setHotels] = useState(() => HOTELS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHotels = async () => {
      try {
        const data = await getHotels(TRIP_ID);
        // Always start from the full HOTELS list and merge in any saved data
        // so hotels that haven't been explicitly saved still appear
        const merged = HOTELS.map(h => {
          const saved = data.find(d => d.id === h.id);
          return saved ? { ...h, ...saved, bookedBy: saved.bookedBy || [] } : h;
        });
        setHotels(merged);
      } catch (error) {
        console.warn('Failed to load hotels, using defaults:', error);
        setHotels(HOTELS);
      } finally {
        setLoading(false);
      }
    };
    loadHotels();
  }, []);

  const updateHotel = useCallback(async (hotelId, updates) => {
    try {
      const updated = { id: hotelId, ...updates };
      await saveHotel(TRIP_ID, updated);
      setHotels(prev => prev.map(h => h.id === hotelId ? { ...h, ...updates } : h));
    } catch (error) {
      console.error('Failed to update hotel:', error);
      // Still update locally even if database fails
      setHotels(prev => prev.map(h => h.id === hotelId ? { ...h, ...updates } : h));
    }
  }, []);

  return { hotels, loading, updateHotel };
};

// ───── HOOK: Use Activities with Database Sync ──────────────────
// Falls back to mock ACTIVITIES data if database is empty
export const useActivities = () => {
  const [activities, setActivities] = useState(() => ACTIVITIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const data = await getActivities(TRIP_ID);
        // Use database data if available, otherwise use mock ACTIVITIES
        setActivities(data.length > 0 ? data : ACTIVITIES);
      } catch (error) {
        console.warn('Failed to load activities, using defaults:', error);
        setActivities(ACTIVITIES);
      } finally {
        setLoading(false);
      }
    };
    loadActivities();
  }, []);

  const addActivity = useCallback(async (activityData) => {
    try {
      const saved = await saveActivity(TRIP_ID, activityData);
      setActivities(prev => [...prev, saved]);
      return saved;
    } catch (error) {
      console.error('Failed to add activity:', error);
      setActivities(prev => [...prev, activityData]);
    }
  }, []);

  const updateActivity = useCallback(async (activityId, updates) => {
    try {
      const updated = { id: activityId, ...updates };
      await saveActivity(TRIP_ID, updated);
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...updates } : a));
    } catch (error) {
      console.error('Failed to update activity:', error);
      // Still update locally even if database fails
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...updates } : a));
    }
  }, []);

  return { activities, loading, addActivity, updateActivity };
};
