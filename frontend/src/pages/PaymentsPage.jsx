import { useState } from 'react';
import { dashboardApi, leaseApi, paymentApi } from '../api/resources.js';
import useFetch from '../../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge from '../components/ui/Badge.jsx';
import Stat from '../components/ui/Stat.jsx';
import SectionHeader from '../components/ui/SectionHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Modal, { Field, inputClass } from '../components/ui/Modal.jsx';
import { ErrorState, Loading } from '../components/ui/States.jsx';
import { compactPeso, peso, shortDate, statusColor, statusLabel } from '../../lib.js';
import iconNavy from '../assets/rentease-icon-navy.svg';

const METHODS = ['cash', 'gcash', 'bank_transfer', 'paymongo'];
const EMPTY = { lease: '', amount: '', paymentMethod: 'cash', reference: '', notes: '', proof: null };

const ACCEPTED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_PROOF_BYTES = 4 * 1024 * 1024;

const proofDataUri = (proof) => `data:${proof.contentType};base64,${proof.data}`;

// Decodes the base64 payload into a real Blob rather than relying on an
// anchor's `download` attribute against a data: URI — more robust across
// browsers, and works from a plain button instead of needing a link.
const downloadProof = (proof) => {
  const bytes = atob(proof.data);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);

  const url = URL.createObjectURL(new Blob([array], { type: proof.contentType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = proof.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const receiptNumber = (paymentId) => `RCPT-${paymentId.slice(-8).toUpperCase()}`;

function Receipt({ payment }) {
  const unit = payment.lease?.unit;
  const propertyName = unit?.property?.name ?? '—';
  const description = `Rent — Unit ${unit?.unitNumber ?? '—'}, ${propertyName}`;

  return (
    <div id="receipt-print-area" className="border border-gray-200 rounded-lg p-6 text-sm">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <img src={iconNavy} alt="" className="w-9 h-9 shrink-0" />
          <div>
            <p className="font-bold text-slate-800">{propertyName}</p>
            <p className="text-gray-400 text-xs">Unit {unit?.unitNumber ?? '—'}</p>
          </div>
        </div>
        <p className="text-2xl font-extrabold tracking-wide text-navy">RECEIPT</p>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bill To</p>
          <p className="font-semibold text-slate-800">{payment.tenant?.name ?? '—'}</p>
          <p className="text-gray-400 text-xs">{payment.tenant?.email}</p>
        </div>
        <div className="text-right space-y-1.5">
          <p>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Receipt # </span>
            <span className="text-xs text-slate-700">{receiptNumber(payment._id)}</span>
          </p>
          <p>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date </span>
            <span className="text-xs text-slate-700">{shortDate(payment.paymentDate)}</span>
          </p>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
            <Badge label={statusLabel(payment.status)} color={statusColor(payment.status)} />
          </div>
        </div>
      </div>

      <table className="w-full mb-4">
        <thead>
          <tr className="bg-navy text-white text-xs">
            <th className="text-left font-bold py-2 px-3 rounded-l-md">Description</th>
            <th className="text-right font-bold py-2 px-3 rounded-r-md">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="py-2.5 px-3 text-slate-700">{description}</td>
            <td className="py-2.5 px-3 text-right font-mono text-slate-700">{peso(payment.amount)}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end mb-6">
        <div className="w-48">
          <div className="flex justify-between py-1.5 text-xs text-gray-500">
            <span>Subtotal</span>
            <span>{peso(payment.amount)}</span>
          </div>
          <div className="flex justify-between py-2 px-3 mt-1 rounded-md bg-slate-100 font-bold text-navy">
            <span>Total</span>
            <span>{peso(payment.amount)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 text-xs text-gray-500">
        <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1">Payment Details</p>
        <p>Method: {statusLabel(payment.paymentMethod)}</p>
        {payment.reference && <p>Reference: {payment.reference}</p>}
        {payment.notes && <p>Notes: {payment.notes}</p>}
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const isManager = user.role === 'admin' || user.role === 'landlord';
  const isTenant = user.role === 'tenant';

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [receivingId, setReceivingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [viewingProof, setViewingProof] = useState(null); // the payment whose proof modal is open, or null
  const [viewingReceipt, setViewingReceipt] = useState(null); // the payment whose receipt modal is open, or null

  const payments = useFetch(() => paymentApi.list(), []);
  const stats = useFetch(
    () => (isManager ? dashboardApi.paymentStats() : Promise.resolve(null)),
    [isManager],
  );
  // A tenant may hold more than one lease (past units, or several active at
  // once) — they pick which one a payment is for, so fetch all active ones.
  const tenantLeases = useFetch(
    () => (isTenant ? leaseApi.list({ status: 'active' }) : Promise.resolve([])),
    [isTenant],
  );
  const hasActiveLease = (tenantLeases.data?.length ?? 0) > 0;

  const openModal = () => {
    setFormError(null);
    setForm(EMPTY);
    setModal(true);
  };

  const onLeaseChange = (leaseId) => {
    const lease = tenantLeases.data?.find((l) => l._id === leaseId);
    setForm({ ...form, lease: leaseId, amount: lease ? String(lease.monthlyRent) : form.amount });
  };

  const onProofChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // let the same file be re-picked after an error
    if (!file) return;

    if (!ACCEPTED_PROOF_TYPES.includes(file.type)) {
      setFormError('Proof of payment must be a JPG, PNG, WEBP image, or PDF.');
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setFormError('Proof of payment must be smaller than 4MB.');
      return;
    }

    setFormError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result).split(',')[1]; // strip the "data:...;base64," prefix
      setForm((f) => ({ ...f, proof: { filename: file.name, contentType: file.type, data } }));
    };
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError(null);

    if (!form.proof) {
      setFormError('Please attach proof of payment.');
      return;
    }

    setSaving(true);
    try {
      await paymentApi.create({ ...form, amount: Number(form.amount) });
      setModal(false);
      payments.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const markReceived = async (id) => {
    setReceivingId(id);
    try {
      await paymentApi.receive(id);
      payments.refetch();
      stats.refetch();
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert(err.message);
    } finally {
      setReceivingId(null);
    }
  };

  const markRejected = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Reject this payment? The tenant will need to resubmit it.')) return;

    setRejectingId(id);
    try {
      await paymentApi.reject(id);
      payments.refetch();
      stats.refetch();
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert(err.message);
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Payments"
        action={isTenant && hasActiveLease ? 'Make a payment' : undefined}
        onAction={openModal}
      />

      {isManager && stats.data && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Stat label="Collected (mo)" value={compactPeso(stats.data.collected)} />
          <Stat label="Outstanding" value={compactPeso(stats.data.outstanding)} />
          <Stat label="Overdue" value={stats.data.overdueCount} sub="leases" />
        </div>
      )}

      {isTenant && tenantLeases.data && !hasActiveLease && (
        <p className="mb-5 text-sm text-gray-400">
          You don&rsquo;t have an active lease yet, so there&rsquo;s nothing to pay.
        </p>
      )}

      {payments.loading && <Loading />}
      {payments.error && <ErrorState message={payments.error} onRetry={payments.refetch} />}

      {payments.data && (
        <DataTable
          columns={[
            { key: 'tenant', label: 'Tenant — Unit' },
            { key: 'date', label: 'Date', hideBelow: 'md' },
            { key: 'method', label: 'Method', hideBelow: 'lg' },
            { key: 'amount', label: 'Amount', align: 'right' },
            { key: 'status', label: 'Status', align: 'right' },
          ]}
          rows={payments.data}
          emptyMessage="No payments recorded yet."
          renderRow={(payment) => (
            <tr key={payment._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="py-3.5 px-4">
                <p className="font-semibold text-slate-800">{payment.tenant?.name ?? '—'}</p>
                <p className="text-xs text-gray-400">
                  Unit {payment.lease?.unit?.unitNumber} · {payment.lease?.unit?.property?.name}
                </p>
              </td>
              <td className="py-3.5 px-4 text-gray-400 text-xs hidden md:table-cell">
                {shortDate(payment.paymentDate)}
              </td>
              <td className="py-3.5 px-4 text-gray-400 text-xs hidden lg:table-cell">
                {statusLabel(payment.paymentMethod)}
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-slate-700">{peso(payment.amount)}</td>
              <td className="py-3.5 px-4 text-right">
                <div className="flex items-center justify-end gap-3">
                  {payment.proof?.data && (
                    <button
                      type="button"
                      onClick={() => setViewingProof(payment)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1 hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      Proof
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingReceipt(payment)}
                    className="text-xs font-semibold text-navy hover:underline"
                  >
                    Receipt
                  </button>
                  <Badge label={statusLabel(payment.status)} color={statusColor(payment.status)} />
                  {isManager && payment.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => markReceived(payment._id)}
                        disabled={receivingId === payment._id || rejectingId === payment._id}
                        className="text-xs font-semibold text-brand-green hover:underline disabled:opacity-50"
                      >
                        {receivingId === payment._id ? 'Marking…' : 'Mark as received'}
                      </button>
                      <button
                        type="button"
                        onClick={() => markRejected(payment._id)}
                        disabled={receivingId === payment._id || rejectingId === payment._id}
                        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                      >
                        {rejectingId === payment._id ? 'Rejecting…' : 'Reject'}
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      )}

      <Modal open={modal} title="Make a payment" onClose={() => setModal(false)}>
        <form onSubmit={submit}>
          {formError && <p className="mb-3 text-xs text-red-600">{formError}</p>}
          <Field label="Unit">
            <select
              className={inputClass}
              value={form.lease}
              onChange={(e) => onLeaseChange(e.target.value)}
              required
            >
              <option value="">Select which unit you&rsquo;re paying for…</option>
              {(tenantLeases.data ?? []).map((lease) => (
                <option key={lease._id} value={lease._id}>
                  Unit {lease.unit?.unitNumber} — {lease.unit?.property?.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </Field>
          <Field label="Method">
            <select
              className={inputClass}
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              {METHODS.map((method) => (
                <option key={method} value={method}>
                  {statusLabel(method)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reference (optional)">
            <input
              className={inputClass}
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </Field>
          <Field label="Proof of payment">
            <input
              type="file"
              accept={ACCEPTED_PROOF_TYPES.join(',')}
              className={inputClass}
              onChange={onProofChange}
            />
            {form.proof && (
              <p className="mt-1 text-xs text-brand-green">Attached: {form.proof.filename}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              A screenshot or photo of your receipt. JPG, PNG, WEBP, or PDF, up to 4MB.
            </p>
          </Field>
          <p className="mb-4 text-xs text-gray-400">
            Your landlord will confirm this payment once it&rsquo;s received.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Submitting…' : 'Submit payment'}
          </button>
        </form>
      </Modal>

      <Modal open={!!viewingProof} title="Proof of payment" onClose={() => setViewingProof(null)}>
        {viewingProof && (
          <div>
            {viewingProof.proof.contentType.startsWith('image/') ? (
              <img
                src={proofDataUri(viewingProof.proof)}
                alt={viewingProof.proof.filename}
                className="w-full max-h-[60vh] object-contain rounded-md border border-gray-200 mb-4"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-10 mb-4 rounded-md border border-gray-200 bg-gray-50">
                <span className="text-4xl" aria-hidden="true">📄</span>
                <p className="text-sm text-gray-600 break-all px-4 text-center">
                  {viewingProof.proof.filename}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => downloadProof(viewingProof.proof)}
              className="w-full py-2.5 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90"
            >
              Download
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={!!viewingReceipt}
        title="Receipt"
        onClose={() => setViewingReceipt(null)}
        maxWidthClass="max-w-lg"
      >
        {viewingReceipt && (
          <div>
            <Receipt payment={viewingReceipt} />
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full mt-4 py-2.5 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90"
            >
              Download
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
