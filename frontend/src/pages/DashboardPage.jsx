import { dashboardApi } from '../api/resources.js';
import useFetch from '../../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge from '../components/ui/Badge.jsx';
import Stat from '../components/ui/Stat.jsx';
import SectionHeader from '../components/ui/SectionHeader.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import { ErrorState, Loading } from '../components/ui/States.jsx';
import { compactPeso, peso, statusColor, statusLabel } from '../../lib.js';

function ManagerDashboard() {
  const summary = useFetch(() => dashboardApi.summary(), []);
  const rentDue = useFetch(() => dashboardApi.rentDue(), []);

  if (summary.loading) return <Loading />;
  if (summary.error) return <ErrorState message={summary.error} onRetry={summary.refetch} />;

  const s = summary.data;

  return (
    <div>
      <SectionHeader title="Overview" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Total Properties" value={s.totalProperties} />
        <Stat
          label="Occupied Units"
          value={`${s.occupiedUnits} / ${s.totalUnits}`}
          sub={`${s.occupancyRate}% occupancy`}
        />
        <Stat
          label="Revenue (mo)"
          value={compactPeso(s.monthlyRevenue)}
          sub={new Date().toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
        />
        <Stat label="Open Requests" value={s.openRequests} sub="maintenance" />
      </div>

      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Rent Due This Month</h3>

      {rentDue.loading && <Loading />}
      {rentDue.error && <ErrorState message={rentDue.error} onRetry={rentDue.refetch} />}
      {rentDue.data && (
        <DataTable
          columns={[
            { key: 'unit', label: 'Unit' },
            { key: 'tenant', label: 'Tenant' },
            { key: 'property', label: 'Property', hideBelow: 'md' },
            { key: 'amount', label: 'Amount', align: 'right' },
            { key: 'status', label: 'Status', align: 'right' },
          ]}
          rows={rentDue.data}
          emptyMessage="No active leases yet. Add a property, a unit, then a lease."
          renderRow={(row) => (
            <tr key={row.leaseId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 font-semibold text-slate-700">Unit {row.unit}</td>
              <td className="py-3 px-4 text-gray-600">{row.tenant}</td>
              <td className="py-3 px-4 text-gray-400 hidden md:table-cell">{row.property}</td>
              <td className="py-3 px-4 text-right font-mono text-slate-700">{peso(row.amount)}</td>
              <td className="py-3 px-4 text-right">
                <Badge label={statusLabel(row.status)} color={statusColor(row.status)} />
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}

function TenantDashboard() {
  const { data, error, loading, refetch } = useFetch(() => dashboardApi.summary(), []);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const lease = data.currentLease;

  return (
    <div>
      <SectionHeader title="Overview" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Stat
          label="My Unit"
          value={lease ? `Unit ${lease.unit?.unitNumber}` : '—'}
          sub={lease?.unit?.property?.name ?? 'No active lease'}
        />
        <Stat label="Monthly Rent" value={peso(data.monthlyRent)} />
        <Stat label="Paid This Month" value={peso(data.paidThisMonth)} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
          Open Maintenance Requests
        </h3>
        <p className="text-2xl font-bold text-slate-800">{data.openRequests}</p>
        <p className="text-xs text-gray-400 mt-1">
          Submit a new one from the Maintenance page.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  return user.role === 'tenant' ? <TenantDashboard /> : <ManagerDashboard />;
}
