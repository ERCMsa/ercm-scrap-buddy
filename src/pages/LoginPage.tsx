import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ercmLogo from '@/assets/ercm-logo.png';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: displayName } },
        });
        if (error) { setError(error.message); return; }
        toast.success('Account created! Check your email to verify.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError(error.message); return; }
      }
    } finally {
      setLoading(false);
    }
  };

  // const handleGoogleSignIn = async () => {
  //   setLoading(true);
  //   try {
  //     const { error } = await supabase.auth.signInWithOAuth({
  //       provider: 'google',
  //       options: { redirectTo: window.location.origin },
  // ...    });
  //     if (error) toast.error('Google sign-in failed');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className="min-h-screen industrial-gradient flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        <div className="flex justify-center mb-6">
          <img src={ercmLogo} alt="ERCM SA" className="h-20 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-center text-foreground mb-1">Steel Scrap Management</h1>
        <p className="text-center text-muted-foreground mb-8">{isSignUp ? 'Create an account' : 'Sign in to continue'}</p>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <Input placeholder="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} className="h-12 text-base" />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Email" type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} className="pl-11 h-12 text-base" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input type="password" placeholder="Password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} className="pl-11 h-12 text-base" />
          </div>
          {error && <p className="text-destructive text-sm font-medium">{error}</p>}
          <Button type="submit" className="w-full btn-industrial red-gradient" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-primary font-medium hover:underline">
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
