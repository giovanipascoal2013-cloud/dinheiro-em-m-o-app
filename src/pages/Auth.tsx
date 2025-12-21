import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import logoIcon from '@/assets/logo-icon.png';

type AuthMode = 'login' | 'register';

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePhone = (phone: string): boolean => {
    // Angola phone format: 9XX XXX XXX (9 digits starting with 9)
    const cleaned = phone.replace(/\D/g, '');
    return /^9\d{8}$/.test(cleaned);
  };

  const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setTelefone(formatted);
    setErrors(prev => ({ ...prev, telefone: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validatePhone(telefone)) {
      newErrors.telefone = 'Número de telefone inválido (formato: 9XX XXX XXX)';
    }

    if (password.length < 6) {
      newErrors.password = 'A senha deve ter pelo menos 6 caracteres';
    }

    if (mode === 'register' && password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const cleanedPhone = '+244' + telefone.replace(/\D/g, '');

    if (mode === 'login') {
      toast({
        title: 'Bem-vindo de volta!',
        description: `Sessão iniciada com ${cleanedPhone}`,
      });
      navigate('/');
    } else {
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Agora pode aceder a todas as funcionalidades.',
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-4 px-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <img src={logoIcon} alt="Dinheiro em Mão" className="h-8 w-8" />
          <span className="font-bold text-foreground">Dinheiro em Mão</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {mode === 'login' ? 'Entrar na sua conta' : 'Criar nova conta'}
            </h1>
            <p className="text-muted-foreground">
              {mode === 'login' 
                ? 'Aceda às zonas de ATMs subscritas' 
                : 'Registe-se para subscrever zonas de ATMs'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Número de telefone
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 h-full flex items-center pl-4 pointer-events-none">
                  <span className="text-muted-foreground font-medium">+244</span>
                </div>
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={telefone}
                  onChange={handlePhoneChange}
                  placeholder="9XX XXX XXX"
                  maxLength={11}
                  className="w-full h-12 pl-16 pr-12 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              {errors.telefone && (
                <p className="text-destructive text-sm mt-1.5">{errors.telefone}</p>
              )}
            </div>

            {/* Password input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  placeholder="••••••••"
                  className="w-full h-12 pl-12 pr-12 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-sm mt-1.5">{errors.password}</p>
              )}
            </div>

            {/* Confirm password (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }}
                    placeholder="••••••••"
                    className="w-full h-12 pl-12 pr-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-destructive text-sm mt-1.5">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Forgot password (login only) */}
            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => toast({
                    title: 'Recuperação de senha',
                    description: 'Funcionalidade em desenvolvimento. Contacte o suporte.',
                  })}
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              variant="hero"
              size="xl"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Entrar' : 'Criar conta'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle mode */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
            </p>
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrors({});
              }}
              className="text-primary font-medium hover:underline mt-1"
            >
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Ao continuar, aceita os termos de serviço e política de privacidade
        </p>
      </footer>
    </div>
  );
};

export default Auth;
