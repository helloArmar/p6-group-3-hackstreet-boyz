import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/resources.js';
import { useAuth } from '../context/AuthContext.jsx';
import SectionHeader from '../components/ui/SectionHeader.jsx';
import { inputClass } from '../components/ui/Modal.jsx';
import { initials, roleLabel } from '../../lib.js';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: user.name, email: user.email, password: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = { name: form.name, email: form.email };
      if (form.password) payload.password = form.password;

      const updated = await authApi.updateMe(payload);
      setUser(updated);
      setForm({ ...form, password: '' });
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <SectionHeader title="Account Settings" />

      <form onSubmit={save} className="max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white bg-navy">
              {initials(user.name)}
            </div>
            <div>
              <p className="font-bold text-slate-800">{user.name}</p>
              <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600 font-semibold">
                {roleLabel(user.role)}
              </span>
            </div>
          </div>

          {message && <p className="mb-3 text-xs text-green-700">{message}</p>}
          {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
            Profile Details
          </h4>
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
            Change Password
          </h4>
          <input
            type="password"
            placeholder="New password (leave blank to keep current)"
            className={inputClass}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-md text-sm font-bold text-white bg-brand-red hover:opacity-90 transition-opacity"
          >
            Log Out
          </button>
        </div>
      </form>
    </div>
  );
}
