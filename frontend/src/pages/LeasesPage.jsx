import { useState } from 'react';
import { leaseApi, tenantApi, unitApi } from '../api/resources.js';
import useFetch from '../../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge from '../components/ui/Badge.jsx';
import SectionHeader from '../components/ui/SectionHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Modal, { Field, inputClass } from '../components/ui/Modal.jsx';
import { ErrorState, Loading } from '../components/ui/States.jsx';
import { peso, shortDate, statusColor, statusLabel } from '../../lib.js';

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Expired', value: 'expired' },
  { label: 'Terminated', value: 'terminated' },
];

const EMPTY = { tenant: '', unit: '', startDate: '', endDate: '', monthlyRent: '', securityDeposit: '' };

export default function LeasesPage() {
  const { user } = useAuth();
  const isManager = user.role === 'admin' || user.role === 'landlord';

  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Hits GET /api/leases?status= — the second optional query parameter.
  const leases = useFetch(() => leaseApi.list(filter ? { status: filter } : {}), [filter]);
  const tenants = useFetch(
    () => (isManager ? tenantApi.list() : Promise.resolve([])),
    [isManager],
  );
  const availableUnits = useFetch(
    () => (isManager ? unitApi.available() : Promise.resolve([])),
    [isManager],
  );

  const openModal = () => {
    setForm(EMPTY);
    setFormError(null);
    setModal(true);
    availableUnits.refetch();
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await leaseApi.create({
        ...form,
        monthlyRent: Number(form.monthlyRent),
        securityDeposit: Number(form.securityDeposit),
      });
      setModal(false);
      leases.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const terminate = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Terminate this lease? The unit will be marked vacant.')) return;
    try {
      await leaseApi.terminate(id);
      leases.refetch();
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert(err.message);
    }
  };

  // Pre-fill rent from the chosen unit so managers don't retype it.
  const onUnitChange = (unitId) => {
    const unit = availableUnits.data?.find((u) => u._id === unitId);
    setForm({ ...form, unit: unitId, monthlyRent: unit ? String(unit.monthlyRent) : form.monthlyRent });
  };

  return (
    <div>
      <SectionHeader title="Leases" action={isManager ? 'New lease' : undefined} onAction={openModal} />

      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === option.value
                ? 'text-white bg-navy'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {leases.loading && <Loading />}
      {leases.error && <ErrorState message={leases.error} onRetry={leases.refetch} />}

      {leases.data && (
        <DataTable
          columns={[
            { key: 'tenant', label: 'Tenant — Unit' },
            { key: 'period', label: 'Period', hideBelow: 'md' },
            { key: 'rent', label: 'Rent', align: 'right', hideBelow: 'lg' },
            { key: 'status', label: 'Status', align: 'right' },
          ]}
          rows={leases.data}
          emptyMessage="No leases found for this filter."
          renderRow={(lease) => (
            <tr key={lease._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="py-3.5 px-4">
                <p className="font-semibold text-slate-800">{lease.tenant?.name ?? '—'}</p>
                <p className="text-xs text-gray-400">
                  Unit {lease.unit?.unitNumber} · {lease.unit?.property?.name}
                </p>
              </td>
              <td className="py-3.5 px-4 text-gray-500 text-xs hidden md:table-cell">
                {shortDate(lease.startDate)} – {shortDate(lease.endDate)}
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-slate-700 hidden lg:table-cell">
                {peso(lease.monthlyRent)}/mo
              </td>
              <td className="py-3.5 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Badge label={statusLabel(lease.status)} color={statusColor(lease.status)} />
                  {isManager && lease.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => terminate(lease._id)}
                      className="text-xs font-semibold text-brand-red hover:underline"
                    >
                      Terminate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      )}

      <Modal open={modal} title="New lease" onClose={() => setModal(false)}>
        <form onSubmit={submit}>
          {formError && <p className="mb-3 text-xs text-red-600">{formError}</p>}
          <Field label="Tenant">
            <select
              className={inputClass}
              value={form.tenant}
              onChange={(e) => setForm({ ...form, tenant: e.target.value })}
              required
            >
              <option value="">Select a tenant…</option>
              {(tenants.data ?? []).map((tenant) => (
                <option key={tenant._id} value={tenant._id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit (vacant only)">
            <select
              className={inputClass}
              value={form.unit}
              onChange={(e) => onUnitChange(e.target.value)}
              required
            >
              <option value="">Select a unit…</option>
              {(availableUnits.data ?? []).map((unit) => (
                <option key={unit._id} value={unit._id}>
                  Unit {unit.unitNumber} — {unit.property?.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input
                type="date"
                className={inputClass}
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                className={inputClass}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly rent">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.monthlyRent}
                onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                required
              />
            </Field>
            <Field label="Security deposit">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.securityDeposit}
                onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })}
                required
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Create lease'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
