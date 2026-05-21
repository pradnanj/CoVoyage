import { useState } from 'react';
import { M, sans, serif, ITINERARY, MEMBERS, TYPE_COLORS, TRIP } from '../../constants.js';
import { Card, SectionTitle, Tag, Av, PrimaryBtn, GhostBtn } from '../shared.jsx';

const EVENT_TYPES = ['activity', 'food', 'hotel', 'transport', 'personal'];

export default function ItineraryTab({ itinerary, onAddEvent }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterWho, setFilterWho] = useState('All');
  const [newEvent, setNewEvent] = useState({
    date: itinerary[0]?.date || '',
    time: '',
    title: '',
    type: 'activity',
    who: 'All',
    private: false,
    note: '',
  });

  const setE = (k, v) => setNewEvent(f => ({ ...f, [k]: v }));

  const whoOptions = ['All', ...MEMBERS.map(m => m.name)];

  const filteredItinerary = itinerary.map(day => ({
    ...day,
    items: day.items.filter(item => filterWho === 'All' || item.who === 'All' || item.who === filterWho || item.who.includes(filterWho)),
  })).filter(day => day.items.length > 0);

  const handleAdd = () => {
    if (newEvent.title && newEvent.time) {
      onAddEvent && onAddEvent(newEvent);
      setShowAddModal(false);
      setNewEvent({ date: itinerary[0]?.date || '', time: '', title: '', type: 'activity', who: 'All', private: false, note: '' });
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: M.black, padding: '20px 20px 16px' }}>
        <h2 style={{ fontFamily: serif, color: M.white, fontSize: 22, marginBottom: 4 }}>Group Itinerary</h2>
        <p style={{ color: M.gray4, fontSize: 13, marginBottom: 14 }}>{TRIP.startDate} – {TRIP.endDate} · {TRIP.destination}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: M.gray5, marginRight: 4 }}>Filter by:</span>
          {whoOptions.map(w => (
            <button
              key={w}
              onClick={() => setFilterWho(w)}
              style={{
                background: filterWho === w ? M.red : 'rgba(255,255,255,0.08)',
                color: filterWho === w ? M.white : M.gray4,
                border: 'none', borderRadius: 16, padding: '4px 12px', cursor: 'pointer',
                fontFamily: sans, fontSize: 12, fontWeight: filterWho === w ? 700 : 400,
              }}
            >
              {w === 'All' ? '👥 All' : w.split(' ')[0]}
            </button>
          ))}
          <button
            onClick={() => setShowAddModal(true)}
            style={{ marginLeft: 'auto', background: M.red, color: M.white, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontFamily: sans, fontSize: 13, fontWeight: 600 }}
          >
            + Add Event
          </button>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: M.white, borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontFamily: serif, fontSize: 20, color: M.black, marginBottom: 4 }}>Add to Itinerary</h3>
            <p style={{ color: M.gray5, fontSize: 13, marginBottom: 20 }}>Add an activity, meal, flight, or personal event to the group timeline.</p>
            {[
              { label: 'Event Title', field: 'title', placeholder: 'e.g. Spa appointment at Marriott' },
              { label: 'Time', field: 'time', placeholder: 'e.g. 10:00 AM' },
              { label: 'Note (optional)', field: 'note', placeholder: 'Any details...' },
            ].map(({ label, field, placeholder }) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                <input
                  value={newEvent[field]}
                  onChange={e => setE(field, e.target.value)}
                  placeholder={placeholder}
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none' }}
                  onFocus={e => (e.target.style.borderColor = M.red)}
                  onBlur={e => (e.target.style.borderColor = M.gray3)}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 4 }}>Day</label>
                <select
                  value={newEvent.date}
                  onChange={e => setE('date', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: M.white }}
                >
                  {itinerary.map(d => <option key={d.date} value={d.date}>{d.date}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 4 }}>Event Type</label>
                <select
                  value={newEvent.type}
                  onChange={e => setE('type', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: M.white }}
                >
                  {EVENT_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 4 }}>Who's Attending</label>
                <select
                  value={newEvent.who}
                  onChange={e => setE('who', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: M.white }}
                >
                  {whoOptions.map(w => <option key={w}>{w}</option>)}
                  <option value="Adults only">Adults only</option>
                  <option value="Kids only">Kids only</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: M.gray5, fontFamily: sans }}>
                  <input type="checkbox" checked={newEvent.private} onChange={e => setE('private', e.target.checked)} style={{ width: 16, height: 16 }} />
                  Private event
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GhostBtn onClick={() => setShowAddModal(false)}>Cancel</GhostBtn>
              <PrimaryBtn onClick={handleAdd} disabled={!newEvent.title || !newEvent.time}>Add to Itinerary</PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ padding: '20px 20px 0' }}>
        {filteredItinerary.map((day, di) => (
          <div key={day.date} style={{ marginBottom: 28 }}>
            {/* Day header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ background: M.red, color: M.white, borderRadius: 10, padding: '6px 14px', fontWeight: 700, fontSize: 14, fontFamily: sans }}>
                {day.date}
              </div>
              <div style={{ flex: 1, height: 1, background: M.gray2 }} />
            </div>

            {/* Events */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 12, borderLeft: `3px solid ${M.gray2}`, position: 'relative' }}>
              {day.items.map((item, ii) => {
                const typeColor = TYPE_COLORS[item.type] || M.gray4;
                return (
                  <div key={item.id || ii} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                    {/* Timeline dot */}
                    <div style={{ position: 'absolute', left: -19, top: 14, width: 10, height: 10, borderRadius: '50%', background: typeColor, border: `2px solid ${M.white}`, boxShadow: `0 0 0 2px ${typeColor}` }} />
                    <div style={{
                      background: item.private ? '#f8f0ff' : M.white,
                      border: `1.5px solid ${item.private ? '#d0b0f0' : M.gray2}`,
                      borderRadius: 10, padding: '12px 14px', flex: 1,
                      borderLeft: `4px solid ${typeColor}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: M.black }}>{item.title}</span>
                            {item.private && <span style={{ fontSize: 11, background: '#e8d5ff', color: '#6b21a8', borderRadius: 10, padding: '1px 8px', fontWeight: 600 }}>Private</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 12, color: M.gray5 }}>
                            <span style={{ color: typeColor, fontWeight: 600, textTransform: 'capitalize' }}>● {item.type}</span>
                            <span>·</span>
                            <span>👥 {item.who}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: M.black }}>{item.time}</div>
                        </div>
                      </div>
                      {/* Who avatars */}
                      {item.who !== 'All' && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                          {[item.who].flat().map(name => {
                            const m = MEMBERS.find(m => m.name === name || name.includes(m.name.split(' ')[0]));
                            return <Av key={name} name={name} size={20} color={m?.color} />;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredItinerary.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: M.gray4 }}>
            No events for this filter. Try selecting a different person or add a new event.
          </div>
        )}
      </div>
    </div>
  );
}
