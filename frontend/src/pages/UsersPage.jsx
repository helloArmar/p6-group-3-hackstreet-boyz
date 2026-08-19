import { useState } from 'react';
import { userApi } from '../api/resources.js';
import { useAuth } from '../context/AuthContext.jsx';
import useFetch from '../../useFetch.js';
import SectionHeader from '../components/ui/SectionHeader.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal, { Field, inputClass } from '../components/ui/Modal.jsx';
import { Empty, ErrorState, Loading } from '../components/ui/States.jsx';
import { initials, roleLabel } from '../../lib.js';

const EMPTY = { name: '', email: '', password: '' };

export default function UsersPage() {
  const { user: me } = useAuth();

  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const users = useFetch(() => userApi.list(query ? { q: query } : {}), [query]);
  const visibleUsers = users.data?.filter((u) => u.role !== 'tenant') ?? null;

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await userApi.create({ ...form, role: 'landlord' });
      setModal(false);
      setForm(EMPTY);
      users.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (user) => {
    if (!window.confirm(`Deactivate ${user.name}? They will no longer be able to sign in.`)) return;

    setBusyId(user._id);
    setActionError(null);
    try {
      await userApi.remove(user._id);
      users.refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Users"
        action="Add landlord"
        onAction={() => {
          setFormError(null);
          setModal(true);
        }}
      />

      <SearchBar placeholder="Search by name or email" value={query} onChange={setQuery} />

      {actionError && (
        <div className="mb-4">
          <ErrorState message={actionError} />
        </div>
      )}

      {users.loading && <Loading />}
      {users.error && <ErrorState message={users.error} onRetry={users.refetch} />}

      {visibleUsers && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {visibleUsers.length === 0 ? (
            <Empty message={query ? `No users match “${query}”.` : 'No admin or property manager accounts yet.'} />
          ) : (
            visibleUsers.map((user, index) => (
              <div
                key={user._id}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                  index < visibleUsers.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-navy shrink-0">
                    {initials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge label={roleLabel(user.role)} color={user.role === 'admin' ? 'navy' : 'blue'} />
                  {user._id !== me._id && (
                    <button
                      type="button"
                      onClick={() => deactivate(user)}
                      disabled={busyId === user._id}
                      className="text-xs font-semibold text-brand-red hover:underline disabled:opacity-50"
                    >
                      {busyId === user._id ? 'Deactivating…' : 'Deactivate'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal open={modal} title="Add landlord" onClose={() => setModal(false)}>
        <form onSubmit={submit}>
          {formError && <p className="mb-3 text-xs text-red-600">{formError}</p>}
          <p className="mb-4 text-xs text-gray-400">This creates a Property Manager account.</p>
          <Field label="Full name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add landlord'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
