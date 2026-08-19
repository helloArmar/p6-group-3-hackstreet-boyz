import { useState } from 'react';
import { tenantApi } from '../api/resources.js';
import useFetch from '../../useFetch.js';
import SectionHeader from '../components/ui/SectionHeader.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import Modal, { Field, inputClass } from '../components/ui/Modal.jsx';
import { Empty, ErrorState, Loading } from '../components/ui/States.jsx';
import { initials } from '../../lib.js';

const EMPTY = { name: '', email: '', phone: '', password: '' };

export default function TenantsPage() {
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [credModal, setCredModal] = useState(null); 
  const [credPassword, setCredPassword] = useState('');
  const [credError, setCredError] = useState(null);
  const [credSaving, setCredSaving] = useState(false);

  const tenants = useFetch(() => tenantApi.list(query ? { q: query } : {}), [query]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await tenantApi.create(form);
      setModal(false);
      setForm(EMPTY);
      tenants.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openCredModal = (tenant) => {
    setCredModal(tenant);
    setCredPassword('');
    setCredError(null);
  };

  const submitCredentials = async (event) => {
    event.preventDefault();
    setCredSaving(true);
    setCredError(null);
    try {
      await tenantApi.generateCredentials(credModal._id, credPassword);
      setCredModal(null);
      tenants.refetch();
    } catch (err) {
      setCredError(err.message);
    } finally {
      setCredSaving(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Tenants"
        action="Add tenant"
        onAction={() => {
          setFormError(null);
          setModal(true);
        }}
      />

      <SearchBar placeholder="Search by name, email or phone" value={query} onChange={setQuery} />

      {tenants.loading && <Loading />}
      {tenants.error && <ErrorState message={tenants.error} onRetry={tenants.refetch} />}

      {tenants.data && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {tenants.data.length === 0 ? (
            <Empty message={query ? `No tenants match “${query}”.` : 'No tenants yet.'} />
          ) : (
            tenants.data.map((tenant, index) => {
              const lease = tenant.currentLease;
              const where = lease
                ? `Unit ${lease.unit?.unitNumber} · ${lease.unit?.property?.name}`
                : 'No active lease';

              return (
                <div
                  key={tenant._id}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                    index < tenants.data.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-navy shrink-0">
                      {initials(tenant.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{tenant.name}</p>
                      <p className="text-xs text-gray-400 truncate">{where}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400 hidden sm:block">{tenant.phone}</span>
                    {tenant.user ? (
                      <span className="text-xs font-semibold text-brand-green">Has login</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openCredModal(tenant)}
                        className="text-xs font-semibold text-brand-blue hover:underline"
                      >
                        Generate login
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <Modal open={modal} title="Add tenant" onClose={() => setModal(false)}>
        <form onSubmit={submit}>
          {formError && <p className="mb-3 text-xs text-red-600">{formError}</p>}
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
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </Field>
          <Field label="Login password (optional)">
            <input
              type="password"
              className={inputClass}
              placeholder="Leave blank to add without a login"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-gray-400">
              Set a password to let this tenant sign in right away — requires an email above.
              You can also generate one later.
            </p>
          </Field>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add tenant'}
          </button>
        </form>
      </Modal>

      <Modal
        open={!!credModal}
        title={`Generate login for ${credModal?.name ?? ''}`}
        onClose={() => setCredModal(null)}
      >
        <form onSubmit={submitCredentials}>
          {credError && <p className="mb-3 text-xs text-red-600">{credError}</p>}
          {!credModal?.email && (
            <p className="mb-3 text-xs text-amber-600">
              This tenant has no email on file — add one first via edit before generating a login.
            </p>
          )}
          <Field label="Password">
            <input
              type="password"
              className={inputClass}
              value={credPassword}
              onChange={(e) => setCredPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
          <button
            type="submit"
            disabled={credSaving || !credModal?.email}
            className="w-full py-2.5 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90 disabled:opacity-50"
          >
            {credSaving ? 'Generating…' : 'Generate login'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
