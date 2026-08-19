// Small shared helpers. Kept in one file so pages don't each grow their own copy.

export const peso = (amount) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount || 0);

export const compactPeso = (amount) => {
  const n = amount || 0;
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) {
    // Round to one decimal place instead of the nearest whole thousand —
    // rounding 7500 straight to "8K" reads as 8,000 and doesn't match the
    // real amount anywhere else in the UI.
    const thousands = Math.round((n / 1000) * 10) / 10;
    return `₱${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
  }
  return peso(n);
};

export const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const shortTime = (value) =>
  value ? new Date(value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '';

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

// 'landlord' is the database value; "Property Manager" is what the UI shows.
export const roleLabel = (role) =>
  ({ admin: 'Admin', landlord: 'Property Manager', tenant: 'Tenant' })[role] || role;

// Admin doesn't see landlord operational data, so their home is account
// management, not the Dashboard.
export const roleHome = (role) => (role === 'admin' ? '/admin-home' : '/dashboard');

// Maintenance and payment statuses are stored lowercase/snake_case.
export const statusLabel = (status = '') =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const statusColor = (status) =>
  ({
    paid: 'green',
    active: 'green',
    completed: 'green',
    vacant: 'green',
    due_soon: 'amber',
    pending: 'amber',
    unpaid: 'amber',
    overdue: 'red',
    rejected: 'red',
    terminated: 'red',
    assigned: 'blue',
    in_progress: 'blue',
    expired: 'gray',
    occupied: 'navy',
    low: 'gray',
    medium: 'amber',
    high: 'red',
  })[status] || 'gray';
