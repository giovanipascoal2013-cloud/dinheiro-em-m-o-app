import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, User, MapPin, Phone } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PROVINCIAS_ANGOLA = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte',
  'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Icolo e Bengo', 'Lunda Norte',
  'Lunda Sul', 'Luanda', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire',
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAgent } = useAuth();
  const [nome, setNome] = useState('');
  const [provincia, setProvincia] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefone, setTelefone] = useState('');
  const [iban, setIban] = useState('');
  const [ibanTitular, setIbanTitular] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    supabase.from('profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setNome(data.nome || '');
        setTelefone(data.telefone || '');
        setProvincia(data.provincia || '');
        setCidade(data.cidade || '');
        setIban((data as any).iban || '');
        setIbanTitular((data as any).iban_titular || '');
      }
      setLoaded(true);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const { error } = await supabase.from('profiles').update({
      nome: nome.trim() || null,
      provincia: provincia || null,
      cidade: cidade.trim() || null,
    }).eq('user_id', user.id);

    if (error) {
      toast({ title: 'Erro ao guardar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Perfil actualizado!' });
    }
    setIsSaving(false);
  };

  const inputClasses = "w-full h-12 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16"><div className="h-48 bg-card rounded-2xl animate-pulse" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /><span className="text-sm">Voltar</span>
        </button>
      </div>

      <main className="container mx-auto px-4 pb-8 max-w-lg">
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nome</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" maxLength={100} className={`${inputClasses} pl-11 pr-4`} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" value={telefone} readOnly className={`${inputClasses} pl-11 pr-4 opacity-60 cursor-not-allowed`} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Contacte o suporte para alterar o telefone</p>
            </div>

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

            <Button variant="hero" size="lg" className="w-full mt-2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />Guardar alterações</>}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
