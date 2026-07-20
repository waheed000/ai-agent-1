import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api-client';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Register() {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      await register(name, email, password);
      // Navigation is handled inside register() via AuthContext
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setServerError('An account with this email already exists. Try logging in instead.');
        } else if (err.status === 429) {
          setServerError('Too many attempts. Please wait a moment and try again.');
        } else if (err.status === 0) {
          setServerError('Cannot reach the server. Check your connection and try again.');
        } else {
          const mapped: Record<string, string> = {};
          for (const [field, msgs] of Object.entries(err.fieldErrors)) {
            mapped[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
          }
          if (Object.keys(mapped).length > 0) {
            setFieldErrors(mapped);
          } else {
            setServerError(err.message || 'Something went wrong. Please try again.');
          }
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background font-sans">
      {/* Visual Side */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-secondary/50 border-r border-border relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative z-10 max-w-md mx-auto">
          <div className="flex items-center gap-2 text-primary font-bold text-2xl tracking-tight mb-12">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <BrainCircuit size={20} />
            </div>
            CreatorOS AI
          </div>
          <h2 className="text-4xl font-bold mb-6">Upgrade your strategy.</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join the top 1% of creators who use data and AI to build sustainable, scalable businesses.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card/80 backdrop-blur-sm">
              <div className="text-2xl font-bold text-foreground mb-1">+42%</div>
              <div className="text-sm text-muted-foreground">Average engagement increase in 30 days</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card/80 backdrop-blur-sm">
              <div className="text-2xl font-bold text-foreground mb-1">15hrs</div>
              <div className="text-sm text-muted-foreground">Saved per week on research & planning</div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="text-muted-foreground mt-2">Start your 14-day free trial. No credit card required.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Server-level error */}
            {serverError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Jane Doe"
                required
                disabled={isLoading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`bg-secondary/50 border-border ${fieldErrors.name ? 'border-destructive' : ''}`}
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`bg-secondary/50 border-border ${fieldErrors.email ? 'border-destructive' : ''}`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`bg-secondary/50 border-border ${fieldErrors.password ? 'border-destructive' : ''}`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Creator Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Select your primary niche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                  <SelectItem value="educator">Educator</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base bg-primary hover:bg-primary/90 mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
