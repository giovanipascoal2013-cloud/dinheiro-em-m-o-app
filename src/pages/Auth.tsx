import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, ArrowRight, Loader2, Mail, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logoIcon from '@/assets/logo-icon.png';
import { Footer } from '@/components/Footer';

type AuthMode = 'login' | 'register';
type LoginMethod = 'phone' | 'email';

const PROVINCIAS_ANGOLA = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte',
  'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Icolo e Bengo', 'Lunda Norte',
  'Lunda Sul', 'Luanda', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire',
];

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [provincia, setProvincia] = useState('');
  const [cidade, setCidade] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForgot, setShowForgot] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const redirectByRole = async (userId: string) => {
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    const userRoles = rolesData?.map(r => r.role) ?? [];
    if (userRoles.includes('admin') || userRoles.includes('supervisor')) {
      navigate('/dashboard');
    } else if (userRoles.includes('financeiro')) {
      navigate('/finance');
    } else if (userRoles.includes('agent')) {
      navigate('/agent');
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        redirectByRole(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        redirectByRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return /^9\d{8}$/.test(cleaned);
  };

  const validateEmail = (em: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
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

    if (loginMethod === 'phone') {
      if (!validatePhone(telefone)) {
        newErrors.telefone = 'Número de telefone inválido (formato: 9XX XXX XXX)';
      }
    } else {
      if (!validateEmail(email)) {
        newErrors.email = 'Email inválido';
      }
    }

    if (password.length < 6) {
      newErrors.password = 'A senha deve ter pelo menos 6 caracteres';
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'As senhas não coincidem';
      }
      if (!nome.trim()) {
        newErrors.nome = 'O nome é obrigatório';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);

    let authEmail: string;
    if (loginMethod === 'email') {
      authEmail = email;
    } else {
      const cleanedPhone = telefone.replace(/\D/g, '');
      authEmail = `${cleanedPhone}@dinheiroemao.ao`;
    }

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrors({ general: 'Credenciais incorrectas' });
          } else {
            setErrors({ general: error.message });
          }
          setIsLoading(false);
          return;
        }

        toast({
          title: 'Bem-vindo de volta!',
          description: loginMethod === 'phone' ? `Sessão iniciada com +244 ${telefone}` : `Sessão iniciada com ${email}`,
        });

        const { data: { user: loggedUser } } = await supabase.auth.getUser();
        if (loggedUser) await redirectByRole(loggedUser.id);
      } else {
        const cleanedPhone = loginMethod === 'phone' ? telefone.replace(/\D/g, '') : '';
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              telefone: loginMethod === 'phone' ? `+244${cleanedPhone}` : '',
              nome: nome.trim(),
              provincia: provincia || null,
              cidade: cidade.trim() || null,
            },
          },
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            setErrors({ general: 'Esta conta já está registada. Tente fazer login.' });
          } else {
            setErrors({ general: error.message });
          }
          setIsLoading(false);
          return;
        }

        toast({
          title: 'Conta criada com sucesso!',
          description: 'Agora pode aceder a todas as funcionalidades.',
        });
        navigate('/');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setErrors({ general: 'Erro inesperado. Tente novamente.' });
    }

    setIsLoading(false);
  };

  const inputClasses = "w-full h-12 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

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

          {/* General error */}
          {errors.general && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-destructive text-sm text-center">{errors.general}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Login method toggle */}
            <div className="flex rounded-xl bg-card border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => { setLoginMethod('phone'); setErrors({}); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${loginMethod === 'phone' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Telefone
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('email'); setErrors({}); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${loginMethod === 'email' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Email
              </button>
            </div>

            {/* Phone / Email input */}
            {loginMethod === 'phone' ? (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Número de telefone</label>
                <div className="relative">
                  <div className="absolute left-0 top-0 h-full flex items-center pl-4 pointer-events-none">
                    <span className="text-muted-foreground font-medium">+244</span>
                  </div>
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input type="tel" value={telefone} onChange={handlePhoneChange} placeholder="9XX XXX XXX" maxLength={11} className={`${inputClasses} pl-16 pr-12`} />
                </div>
                {errors.telefone && <p className="text-destructive text-sm mt-1">{errors.telefone}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }} placeholder="exemplo@email.com" className={`${inputClasses} pl-12 pr-4`} />
                </div>
                {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
              </div>
            )}

            {/* Register-only fields */}
            {mode === 'register' && (
              <>
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nome completo *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); setErrors(prev => ({ ...prev, nome: '' })); }} placeholder="Seu nome completo" maxLength={100} className={`${inputClasses} pl-12 pr-4`} />
                  </div>
                  {errors.nome && <p className="text-destructive text-sm mt-1">{errors.nome}</p>}
                </div>

                {/* Província + Cidade */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Província</label>
                    <select value={provincia} onChange={(e) => setProvincia(e.target.value)} className={`${inputClasses} px-3`}>
                      <option value="">Selecionar...</option>
                      {PROVINCIAS_ANGOLA.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Cidade</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: Viana" maxLength={80} className={`${inputClasses} pl-9 pr-3`} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '', general: '' })); }} placeholder="••••••••" className={`${inputClasses} pl-12 pr-12`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: '' })); }} placeholder="••••••••" className={`${inputClasses} pl-12 pr-4`} />
                </div>
                {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            {/* Forgot password */}
            {mode === 'login' && !showForgot && (
              <div className="text-right">
                <button type="button" className="text-sm text-primary hover:underline" onClick={() => setShowForgot(true)}>
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {mode === 'login' && showForgot && (
              <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-3">
                <p className="text-sm text-foreground font-medium">Recuperar senha</p>
                {loginMethod === 'email' ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Introduza o seu email para receber instruções de recuperação.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={forgotLoading || !validateEmail(email)}
                      onClick={async () => {
                        setForgotLoading(true);
                        await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        setForgotLoading(false);
                        setShowForgot(false);
                        toast({
                          title: 'Verifique o seu email',
                          description: 'Se a conta existir, receberá um email com instruções para redefinir a senha.',
                        });
                      }}
                    >
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar link de recuperação'}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Para contas registadas com telefone, a recuperação de senha é feita através do nosso suporte.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const cleaned = telefone.replace(/\D/g, '');
                        const msg = encodeURIComponent(
                          `Olá, preciso de ajuda para recuperar a senha da minha conta registada com o número +244${cleaned}.`
                        );
                        window.open(`https://wa.me/244933986318?text=${msg}`, '_blank');
                      }}
                    >
                      Contactar suporte via WhatsApp
                    </Button>
                  </>
                )}
                <button type="button" onClick={() => setShowForgot(false)} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
                  Cancelar
                </button>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
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
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}); }} className="text-primary font-medium hover:underline mt-1">
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;
