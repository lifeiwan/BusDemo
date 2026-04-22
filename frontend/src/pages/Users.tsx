import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import type { Role, AppUser } from '../types';

export default function Users() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New user form state
  const [showForm, setShowForm] = useState(false);
  const [newFirebaseUid, setNewFirebaseUid] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<AppUser[]>('/api/v1/users/'),
      apiFetch<Role[]>('/api/v1/roles/'),
    ]).then(([u, r]) => {
      setUsers(u);
      setRoles(r);
      setLoading(false);
    }).catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      const created = await apiFetch<AppUser>('/api/v1/users/', {
        method: 'POST',
        body: JSON.stringify({
          firebaseUid: newFirebaseUid.trim(),
          email: newEmail.trim(),
          name: newName.trim(),
          roleId: Number(newRoleId),
          isActive: true,
        }),
      });
      setUsers(prev => [...prev, created]);
      setNewFirebaseUid('');
      setNewEmail('');
      setNewName('');
      setNewRoleId('');
      setShowForm(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error creating user');
    }
  }

  async function handleRoleChange(user: AppUser, roleId: number) {
    try {
      const updated = await apiFetch<AppUser>(`/api/v1/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...user, roleId }),
      });
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating user');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this user? They will lose access to the app.')) return;
    try {
      await apiFetch(`/api/v1/users/${id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting user');
    }
  }

  if (loading) return <div className="text-slate-500 text-sm">Loading...</div>;
  if (error) return <div className="text-red-500 text-sm">Error: {error}</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-700">Add New User</h2>
          <p className="text-sm text-slate-500">
            Create the Firebase account first (Firebase console → Authentication → Add user),
            then enter the Firebase UID shown in the user row.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Firebase UID *</label>
              <input
                value={newFirebaseUid}
                onChange={e => setNewFirebaseUid(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="abc123xyz..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role *</label>
              <select
                value={newRoleId}
                onChange={e => setNewRoleId(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select role...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Create User
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Firebase UID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-800">{user.email}</td>
                <td className="px-4 py-3 text-slate-600">{user.name || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.roleId}
                    onChange={e => handleRoleChange(user, Number(e.target.value))}
                    className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{user.firebaseUid}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No users yet. Add the first user above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
