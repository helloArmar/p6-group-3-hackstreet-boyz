import { useNavigate } from 'react-router-dom';
import { userApi } from '../api/resources.js';
import useFetch from '../../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import Stat from '../components/ui/Stat.jsx';
import { ErrorState, Loading } from '../components/ui/States.jsx';

export default function AdminHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();


  const users = useFetch(() => userApi.list(), []);

  const counts = users.data && {
    landlords: users.data.filter((u) => u.role === 'landlord').length,
    admins: users.data.filter((u) => u.role === 'admin').length,
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Welcome, {user.name.split(' ')[0]}</h2>
      <p className="text-sm text-gray-400 mb-6">Account management overview</p>

      {users.loading && <Loading />}
      {users.error && <ErrorState message={users.error} onRetry={users.refetch} />}

      {counts && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Stat label="Property Managers" value={counts.landlords} />
          <Stat label="Admins" value={counts.admins} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => navigate('/users')}
          className="text-left bg-white border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors"
        >
          <p className="font-semibold text-slate-800 mb-1">Manage Users</p>
          <p className="text-xs text-gray-400">Create and deactivate Property Manager accounts.</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className="text-left bg-white border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors"
        >
          <p className="font-semibold text-slate-800 mb-1">Messages</p>
          <p className="text-xs text-gray-400">Message property managers directly.</p>
        </button>
      </div>
    </div>
  );
}
