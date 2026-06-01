import { useState, useEffect, useCallback } from 'react';
import {
  saveTrip, getTrip,
  saveMember, getMembers,
  saveHotel, getHotels,
  saveActivity, updateActivityFields, getActivities
} from '../services/database';
import { MEMBERS, HOTELS } from '../constants';

// Derive trip ID from URL param (?trip=…) or env, falling back to default
function resolveTripId() {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlTrip = params.get('trip');
    if (urlTrip) return urlTrip;
  } catch {}
  return import.meta.env.VITE_TRIP_ID || 'trip-2026';
}

// ───── HOOK: Use Members with Database Sync ────────────────────
// Falls back to mock MEMBERS data if database is empty
export const useMembers = (tripId = null) => {
  const TRIP_ID = tripId || resolveTripId();
  const [members, setMembers] = useState(() => {
    // Load plan-specific members from localStorage immediately
    try {
      const saved = localStorage.getItem(`crewfare_members_${TRIP_ID}`);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && parsed.length > 0) return parsed;
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(true);

  const syncFromDB = useCallback(async (silent = false) => {
    try {
      const data = await getMembers(TRIP_ID);
      if (data.length > 0) {
        setMembers(data);
        localStorage.setItem(`crewfare_members_${TRIP_ID}`, JSON.stringify(data));
      }
      // Never clear state on empty DB response — could be a credential/connectivity issue
    } catch (error) {
      if (!silent) console.warn('Failed to load members, using cached:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [TRIP_ID]);

  // Initial load
  useEffect(() => {
    syncFromDB(false);
  }, [syncFromDB]);

  // Poll every 15 seconds so crew list stays live for all users
  useEffect(() => {
    const interval = setInterval(() => syncFromDB(true), 15000);
    return () => clearInterval(interval);
  }, [syncFromDB]);

  const addMember = useCallback(async (memberData) => {
    try {
      const saved = await saveMember(TRIP_ID, memberData);
      setMembers(prev => {
        const next = [...prev, saved];
        localStorage.setItem(`crewfare_members_${TRIP_ID}`, JSON.stringify(next));
        return next;
      });
      return saved;
    } catch (error) {
      console.error('Failed to add member:', error);
      setMembers(prev => {
        const next = [...prev, memberData];
        localStorage.setItem(`crewfare_members_${TRIP_ID}`, JSON.stringify(next));
        return next;
      });
    }
  }, [TRIP_ID]);

  const updateMember = useCallback(async (memberId, updates) => {
    try {
      const updated = { id: memberId, ...updates };
      await saveMember(TRIP_ID, updated);
      setMembers(prev => {
        const next = prev.map(m => m.id === memberId ? { ...m, ...updates } : m);
        localStorage.setItem(`crewfare_members_${TRIP_ID}`, JSON.stringify(next));
        return next;
      });
    } catch (error) {
      console.error('Failed to update member:', error);
      setMembers(prev => {
        const next = prev.map(m => m.id === memberId ? { ...m, ...updates } : m);
        localStorage.setItem(`crewfare_members_${TRIP_ID}`, JSON.stringify(next));
        return next;
      });
    }
  }, [TRIP_ID]);

  return { members, loading, addMember, updateMember };
};

// ───── HOOK: Use Hotels with Database Sync ────────────────────
export const useHotels = (externalHotels = null, tripId = null) => {
  const TRIP_ID = tripId || resolveTripId();
  const [hotels, setHotels] = useState(() => {
    if (externalHotels && externalHotels.length > 0) return externalHotels;
    try {
      const saved = localStorage.getItem('crewfare_real_hotels');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && parsed.length > 0) return parsed;
    } catch {}
    return HOTELS;
  });
  const [loading, setLoading] = useState(true);

  // When external (real) hotels arrive or change (e.g. from Marriott API), adopt them
  useEffect(() => {
    if (!externalHotels || externalHotels.length === 0) return;
    setHotels(prev => externalHotels.map(eh => {
      const existing = prev.find(p => p.id === eh.id);
      return existing ? { ...eh, bookedBy: existing.bookedBy || [] } : eh;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify((externalHotels || []).map(h => h.id))]);

  useEffect(() => {
    const loadHotels = async () => {
      try {
        const data = await getHotels(TRIP_ID);
        if (data.length > 0) {
          setHotels(prev => prev.map(h => {
            const saved = data.find(d => d.id === h.id || d.hotelId === h.id);
            return saved ? { ...h, ...saved, bookedBy: saved.bookedBy || h.bookedBy || [] } : h;
          }));
        }
      } catch (error) {
        console.warn('Failed to load hotels, using defaults:', error);
      } finally {
        setLoading(false);
      }
    };
    loadHotels();
  }, [TRIP_ID]);

  const updateHotel = useCallback(async (hotelId, updates) => {
    try {
      const updated = { id: hotelId, ...updates };
      await saveHotel(TRIP_ID, updated);
      setHotels(prev => prev.map(h => h.id === hotelId ? { ...h, ...updates } : h));
    } catch (error) {
      console.error('Failed to update hotel:', error);
      setHotels(prev => prev.map(h => h.id === hotelId ? { ...h, ...updates } : h));
    }
  }, [TRIP_ID]);

  return { hotels, loading, updateHotel };
};

// ───── HOOK: Use Activities with Database Sync ──────────────────
export const useActivities = (tripId = null) => {
  const TRIP_ID = tripId || resolveTripId();
  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem(`crewfare_activities_${TRIP_ID}`);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && parsed.length > 0) return parsed;
    } catch {}
    // For a new attendee with no local data yet, start empty — DB load will fill it
    return [];
  });
  const [loading, setLoading] = useState(true);

  const syncFromDB = useCallback(async (silent = false) => {
    try {
      const data = await getActivities(TRIP_ID);
      if (data.length > 0) {
        setActivities(data);
        localStorage.setItem(`crewfare_activities_${TRIP_ID}`, JSON.stringify(data));
      }
      // Never clear state when DB returns 0 rows — that could mean credentials are missing
      // or the table is being repopulated. Only the explicit reset flow should clear activities.
    } catch (error) {
      if (!silent) console.warn('Failed to load activities from DB:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [TRIP_ID]);

  // Initial load
  useEffect(() => {
    syncFromDB(false);
  }, [syncFromDB]);

  // Poll every 15 seconds so all users see activities added by others
  useEffect(() => {
    const interval = setInterval(() => syncFromDB(true), 15000);
    return () => clearInterval(interval);
  }, [syncFromDB]);

  const addActivity = useCallback(async (activityData) => {
    try {
      const saved = await saveActivity(TRIP_ID, activityData);
      setActivities(prev => {
        // avoid duplicates if polling already picked it up
        if (prev.find(a => a.id === saved.id || a.activityId === saved.activityId)) return prev;
        const next = [...prev, saved];
        localStorage.setItem(`crewfare_activities_${TRIP_ID}`, JSON.stringify(next));
        return next;
      });
      return saved;
    } catch (error) {
      console.error('Failed to add activity:', error);
      setActivities(prev => {
        const next = [...prev, activityData];
        localStorage.setItem(`crewfare_activities_${TRIP_ID}`, JSON.stringify(next));
        return next;
      });
    }
  }, [TRIP_ID]);

  const updateActivity = useCallback(async (activityId, updates) => {
    // Optimistically update React state immediately
    setActivities(prev => {
      const next = prev.map(a =>
        (a.id === activityId || a.activityId === activityId) ? { ...a, ...updates } : a
      );
      localStorage.setItem(`crewfare_activities_${TRIP_ID}`, JSON.stringify(next));
      return next;
    });
    // Persist only the changed fields — never a full replace
    try {
      await updateActivityFields(TRIP_ID, activityId, updates);
    } catch (error) {
      console.error('Failed to persist activity update:', error);
    }
  }, [TRIP_ID]);

  return { activities, loading, addActivity, updateActivity };
};
