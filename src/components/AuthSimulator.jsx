import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function AuthSimulator() {
  const { login, logout, simulateUnregistered, isAuthenticated, authError } = useAuth();
  const navigate = useNavigate();

  const status = authError?.type === 'user_not_registered'
    ? 'unregistered'
    : isAuthenticated
      ? 'logged in'
      : 'logged out';

  return (
    <div className="fixed bottom-4 right-4 z-50 w-64 rounded-xl border border-border bg-card p-3 shadow-lg text-sm">
      <p className="font-medium text-foreground mb-1">Auth preview</p>
      <p className="text-muted-foreground mb-3">State: {status}</p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-left hover:bg-muted"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Simulate logged out
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-left hover:bg-muted"
          onClick={() => {
            login();
            navigate('/');
          }}
        >
          Simulate logged in
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-left hover:bg-muted"
          onClick={() => {
            simulateUnregistered();
            navigate('/');
          }}
        >
          Simulate unregistered
        </button>
      </div>
    </div>
  );
}
