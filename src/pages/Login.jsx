import { Link, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import GoogleIcon from '@/components/GoogleIcon';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const { login, simulateUnregistered } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen">
      <div className="absolute left-0 right-0 top-6 z-10 flex justify-center px-4">
        <Link to="/" className="font-display text-2xl italic tracking-tight text-foreground">
          Tonight
        </Link>
      </div>
      <AuthLayout
        icon={Lock}
        title="Welcome back"
        subtitle="Sign in to save films for later"
        footer="Preview environment — authentication is simulated"
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              login();
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => {
              simulateUnregistered();
              navigate('/');
            }}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Simulate unregistered user
          </button>
        </div>
      </AuthLayout>
    </div>
  );
}
