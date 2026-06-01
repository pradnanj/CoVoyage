import { useState } from 'react';
import { M, sans, serif, TRIP } from '../../constants.js';
import { Card, SectionTitle, Tag, PrimaryBtn, GhostBtn } from '../shared.jsx';
import { useExpenses } from '../../hooks/useDatabase.js';

const CATEGORIES = ['Activities', 'Food & Drink', 'Transport', 'Shopping', 'Accommodation', 'Other'];

export default function ExpenseTab({ members, currentUser, tripInfo = {}, tripId }) {
  const { expenses, addExpense, settleExpense, deleteExpense } = useExpenses(tripId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: '', amount: '', paidBy: currentUser, splitWith: [], category: 'Activities',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleSplit = (name) => {
    setForm(f => ({
      ...f,
      splitWith: f.splitWith.includes(name)
        ? f.splitWith.filter(n => n !== name)
        : [...f.splitWith, name],
    }));
  };

  const submitExpense = () => {
    if (!form.description || !form.amount) return;
    addExpense({
      id: `exp-${Date.now()}`,
      description: form.description,
      amount: parseFloat(form.amount),
      paidBy: form.paidBy || currentUser,
      splitWith: form.splitWith,
      category: form.category,
      date: new Date().toLocaleDateString(),
      settledBy: [],
      addedBy: currentUser,
    });
    setForm({ description: '', amount: '', paidBy: currentUser, splitWith: [], category: 'Activities' });
    setShowForm(false);
  };

  // Calculate running balances across all unsettled splits
  const balances = {};
  members.forEach(m => { balances[m.name] = 0; });
  expenses.forEach(exp => {
    const people = exp.splitWith.length > 0 ? exp.splitWith : [];
    if (people.length === 0) return;
    const share = exp.amount / (people.length + 1);
    people.forEach(person => {
      if (person !== exp.paidBy) {
        balances[person]  = (balances[person]  || 0) - (exp.settledBy.includes(person) ? 0 : share);
        balances[exp.paidBy] = (balances[exp.paidBy] || 0) + (exp.settledBy.includes(person) ? 0 : share);
      }
    });
  });

  const owes = Object.entries(balances).filter(([, b]) => b < -0.01);
  const owed = Object.entries(balances).filter(([, b]) => b > 0.01);

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: M.black, padding: '20px 20px 16px' }}>
        <h2 style={{ fontFamily: serif, color: M.white, fontSize: 22, marginBottom: 4 }}>Expense Tracking</h2>
        {tripInfo.destination && (
          <p style={{ color: M.red, fontSize: 13, marginBottom: 4 }}>
            📍 {tripInfo.destination}
            {tripInfo.startDate && tripInfo.endDate ? ` · ${tripInfo.startDate} – ${tripInfo.endDate}` : ''}
          </p>
        )}
        <p style={{ color: M.gray4, fontSize: 13 }}>
          Submit shared expenses and track who owes who. Synced live for the whole crew.
        </p>
      </div>

      <div style={{ padding: 20 }}>
        {/* Summary strip */}
        {expenses.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Spent', val: `$${totalSpend.toFixed(2)}`, color: M.red },
              { label: 'Expenses', val: expenses.length, color: M.teal },
              { label: 'Members', val: members.length || 0, color: M.gold },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ flex: 1, minWidth: 90, background: M.white, border: `1.5px solid ${M.gray2}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: sans, fontSize: 18, fontWeight: 800, color }}>{val}</div>
                <div style={{ fontFamily: sans, fontSize: 11, color: M.gray4, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowForm(v => !v)}
          style={{ width: '100%', background: M.red, color: M.white, border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: sans, marginBottom: 20 }}
        >
          + Submit an Expense
        </button>

        {showForm && (
          <Card style={{ marginBottom: 20, background: '#fff8f8' }}>
            <SectionTitle>New Expense</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 5, textTransform: 'uppercase' }}>Description</label>
                <input
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="e.g. Dinner at Nobu"
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none' }}
                  onFocus={e => (e.target.style.borderColor = M.red)}
                  onBlur={e => (e.target.style.borderColor = M.gray3)}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 5, textTransform: 'uppercase' }}>Amount ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = M.red)}
                    onBlur={e => (e.target.style.borderColor = M.gray3)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 5, textTransform: 'uppercase' }}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: M.white }}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 5, textTransform: 'uppercase' }}>Paid By</label>
                <select
                  value={form.paidBy}
                  onChange={e => set('paidBy', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: M.white }}
                >
                  {members.map(m => <option key={m.id}>{m.name}</option>)}
                  {!members.find(m => m.name === currentUser) && currentUser && <option>{currentUser}</option>}
                </select>
              </div>
              {members.length > 1 && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 8, textTransform: 'uppercase' }}>Split With</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {members.filter(m => m.name !== form.paidBy).map(m => (
                      <button
                        key={m.id}
                        onClick={() => toggleSplit(m.name)}
                        style={{ padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${form.splitWith.includes(m.name) ? M.red : M.gray3}`, background: form.splitWith.includes(m.name) ? '#fff0f0' : M.white, color: form.splitWith.includes(m.name) ? M.red : M.gray5, fontFamily: sans, fontSize: 13, cursor: 'pointer', fontWeight: form.splitWith.includes(m.name) ? 700 : 400 }}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <GhostBtn onClick={() => setShowForm(false)}>Cancel</GhostBtn>
                <PrimaryBtn style={{ flex: 1 }} onClick={submitExpense} disabled={!form.description || !form.amount}>
                  Add Expense
                </PrimaryBtn>
              </div>
            </div>
          </Card>
        )}

        {/* Balances */}
        {expenses.length > 0 && (owes.length > 0 || owed.length > 0) && (
          <Card style={{ marginBottom: 20, background: '#f0fafa' }}>
            <SectionTitle>💳 Who Owes What</SectionTitle>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {owes.map(([name, bal]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${M.gray2}`, fontSize: 13 }}>
                  <span style={{ color: M.black, fontWeight: 600 }}>{name}</span>
                  <span style={{ color: M.red, fontWeight: 700 }}>owes ${Math.abs(bal).toFixed(2)}</span>
                </div>
              ))}
              {owed.map(([name, bal]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${M.gray2}`, fontSize: 13 }}>
                  <span style={{ color: M.black, fontWeight: 600 }}>{name}</span>
                  <span style={{ color: M.green, fontWeight: 700 }}>gets back ${bal.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Expense list */}
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: M.gray4 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: M.gray5, marginBottom: 6 }}>No expenses yet</div>
            <div style={{ fontSize: 13 }}>Submit your first shared expense above — it will sync to the whole crew instantly.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {expenses.map(exp => {
              const perPerson = exp.splitWith.length > 0
                ? (exp.amount / (exp.splitWith.length + 1)).toFixed(2)
                : exp.amount.toFixed(2);
              const canDelete = exp.addedBy === currentUser || !exp.addedBy;
              return (
                <Card key={exp.id} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: M.black }}>{exp.description}</div>
                      <div style={{ fontSize: 12, color: M.gray4, marginTop: 2 }}>
                        {exp.date} · <Tag label={exp.category} color={M.teal} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ fontWeight: 800, fontSize: 18, color: M.red }}>${exp.amount.toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: M.gray4 }}>Paid by {exp.paidBy}</div>
                      {canDelete && (
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          style={{ fontSize: 10, color: M.gray3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          ✕ remove
                        </button>
                      )}
                    </div>
                  </div>
                  {exp.splitWith.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: M.gray5, marginBottom: 6 }}>
                        Split with: {exp.splitWith.join(', ')} · ${perPerson}/person
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {exp.splitWith.map(name => {
                          const settled = exp.settledBy.includes(name);
                          return (
                            <button
                              key={name}
                              onClick={() => !settled && settleExpense(exp.id, name)}
                              style={{ padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${settled ? M.green : M.gray3}`, background: settled ? '#e8f5e9' : M.white, color: settled ? M.green : M.gray5, fontFamily: sans, fontSize: 12, cursor: settled ? 'default' : 'pointer', fontWeight: 600 }}
                            >
                              {settled ? '✓ ' : ''}{name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
