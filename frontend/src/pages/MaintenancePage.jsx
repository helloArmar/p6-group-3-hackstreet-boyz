import { useState } from 'react';
import { maintenanceApi } from '../api/resources.js';
import useFetch from '../../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge from '../components/ui/Badge.jsx';
import SectionHeader from '../components/ui/SectionHeader.jsx';
import Modal, { Field, inputClass } from '../components/ui/Modal.jsx';
import { Empty, ErrorState, Loading } from '../components/ui/States.jsx';
import { shortDate, statusColor, statusLabel } from '../../lib.js';

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

const STATUSES = ['pending', 'assigned', 'in_progress', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];
const EMPTY = { title: '', description: '' };

export default function MaintenancePage() {
  const { user } = useAuth();
  const isManager = user.role === 'admin' || user.role === 'landlord';

  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const requests = useFetch(
    () => maintenanceApi.list(filter ? { status: filter } : {}),
    [filter],
  );

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await maintenanceApi.create(form);
      setModal(false);
      setForm(EMPTY);
      requests.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await maintenanceApi.setStatus(id, { status });
      requests.refetch();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const changePriority = async (id, priority) => {
    try {
      await maintenanceApi.update(id, { priority });
      requests.refetch();
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Maintenance Requests"
        action={user.role === 'tenant' ? 'New request' : undefined}
        onAction={() => {
          setFormError(null);
          setModal(true);
        }}
      />

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

      {requests.loading && <Loading />}
      {requests.error && (
        <ErrorState message={requests.error} onRetry={requests.refetch} />
      )}

      {requests.data && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {requests.data.length === 0 ? (
            <Empty message="No requests match this filter." />
          ) : (
            requests.data.map((request, index) => (
              <div
                key={request._id}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                  index < requests.data.length - 1
                    ? 'border-b border-gray-100'
                    : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {request.title} — Unit {request.unit?.unitNumber}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {request.tenant?.name} · {shortDate(request.dateSubmitted)}
                    {request.assignedTo ? ` · ${request.assignedTo}` : ''}
                  </p>
                </div>

                {isManager ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={request.priority}
                      onChange={(e) => changePriority(request._id, e.target.value)}
                      title="Priority"
                      className="text-xs font-semibold border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {statusLabel(priority)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={request.status}
                      onChange={(e) => changeStatus(request._id, e.target.value)}
                      title="Status"
                      className="text-xs font-semibold border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge label={statusLabel(request.priority)} color={statusColor(request.priority)} />
                    <Badge label={statusLabel(request.status)} color={statusColor(request.status)} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <Modal
        open={modal}
        title="New maintenance request"
        onClose={() => setModal(false)}
      >
        <form onSubmit={submit}>
          {formError && (
            <p className="mb-3 text-xs text-red-600">{formError}</p>
          )}
          <Field label="Title">
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Leaking faucet"
              required
            />
          </Field>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-24`}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              required
            />
          </Field>
          <p className="mb-4 text-xs text-gray-400">
            Your landlord will triage and set the priority once it&rsquo;s reviewed.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
