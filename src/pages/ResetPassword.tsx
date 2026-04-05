import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logoIcon from '@/assets/logo-icon.png';
import { Footer } from '@/components/Footer';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidToken, setHasValidToken] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasValidToken(true);
      }
    });

    // Check if we already have a session from recovery
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check URL hash for recovery type
        const hash = window.location.hash;
        if (hash.includes('type=recovery')) {
          setHasValidToken(true);
        } else {
          setHasValidToken(true); // session exists, allow reset
        }
      } else {
        // Wait a moment for the auth state change
        setTimeout(() => {
          setHasValidToken((prev) => prev === null ? false : prev);
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (password.length < 6) {
      newErrors.password = 'A senha deve ter pelo menos 6 caracteres';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrors({ general: error.message });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Senha alterada com sucesso!',
      description: 'Pode agora entrar com a sua nova senha.',
    });
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const inputClasses = "w-full h-12 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  if (hasValidToken === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasValidToken) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="py-4 px-4">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <img src={logoIcon} alt="Dinheiro em Mão" className="h-8 w-8" />
            <span className="font-bold text-foreground">Dinheiro em Mão</span>
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-foreground mb-4">Link inválido ou expirado</h1>
            <p className="text-muted-foreground mb-6">
              O link de recuperação de senha é inválido ou já expirou. Solicite um novo link na página de login.
            </p>
            <Button variant="hero" size="lg" onClick={() => navigate('/auth')}>
              Voltar ao login
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="py-4 px-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <img src={logoIcon} alt="Dinheiro em Mão" className="h-8 w-8" />
          <span className="font-bold text-foreground">Dinheiro em Mão</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Definir nova senha</h1>
            <p className="text-muted-foreground">Introduza a sua nova senha abaixo</p>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-destructive text-sm text-center">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nova senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '', general: '' })); }}
                  placeholder="••••••••"
                  className={`${inputClasses} pl-12 pr-12`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar nova senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                  placeholder="••••••••"
                  className={`${inputClasses} pl-12 pr-4`}
                />
              </div>
              {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  Alterar senha
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ResetPassword;
