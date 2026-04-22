import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, MapPin, Loader2, RefreshCw, CheckCircle2, AlertTriangle, ArrowLeft, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgentOnboarding } from '@/hooks/useAgentOnboarding';
import { toast } from '@/hooks/use-toast';

type Step = 'photo' | 'gps' | 'details';

const TIMER_SECONDS = 120;

export default function RegisterATM() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useAgentOnboarding();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('photo');
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [hasCash, setHasCash] = useState(true);
  const [hasPaper, setHasPaper] = useState(true);
  const [obs, setObs] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 2-minute timer for photo capture
  useEffect(() => {
    if (step !== 'photo') return;
    setSecondsLeft(TIMER_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(interval);
          resetAll();
          toast({
            title: 'Tempo esgotado',
            description: 'Recomece o processo. Garanta que está em frente ao ATM.',
            variant: 'destructive',
          });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const resetAll = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setCoords(null);
    setGpsError(null);
    setName(''); setAddress(''); setObs('');
    setHasCash(true); setHasPaper(true);
    setStep('photo');
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setStep('gps');
    requestGps();
  };

  const requestGps = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Este dispositivo não suporta geolocalização.');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        // Reverse geocode (Nominatim) — best effort
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt`
          );
          const data = await res.json();
          if (data?.display_name) setAddress(data.display_name);
        } catch {/* ignore */}
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(err.message || 'Precisamos da sua localização para registar este ATM.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const goToDetails = () => {
    if (!coords) return;
    setStep('details');
  };

  const submit = async () => {
    if (!user || !photoFile || !coords) return;
    if (!name.trim() || !address.trim()) {
      toast({ title: 'Preencha o nome e endereço', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // Upload photo
      const ext = photoFile.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('atm-photos')
        .upload(path, photoFile, { contentType: photoFile.type, upsert: false });
      if (upErr) throw upErr;

      // Insert ATM as pending
      const { data: atm, error: insErr } = await supabase.from('atms').insert({
        bank_name: name.trim(),
        address: address.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        has_cash: hasCash,
        has_paper: hasPaper,
        obs: obs.trim() || null,
        status: 'Operacional',
        status_approval: 'pending',
        submitted_by: user.id,
        photo_url: path,
      } as any).select('id').maybeSingle();
      if (insErr) throw insErr;

      // Update progress
      await supabase.from('agent_onboarding_progress' as any).update({
        first_atm_submitted: true,
        pending_atm_id: atm?.id,
      }).eq('agent_id', user.id);

      // Notify admins/supervisors
      await supabase.rpc('notify_users_by_role' as any, {
        _role: 'admin',
        _title: 'Novo ATM para aprovar',
        _message: `Um agente submeteu o ATM "${name.trim()}". Reveja na fila de aprovações.`,
        _type: 'info',
      });
      await supabase.rpc('notify_users_by_role' as any, {
        _role: 'supervisor',
        _title: 'Novo ATM para aprovar',
        _message: `Um agente submeteu o ATM "${name.trim()}". Reveja na fila de aprovações.`,
        _type: 'info',
      });

      await refresh();
      toast({ title: 'ATM submetido!', description: 'Aguarde aprovação do administrador.' });
      navigate('/agent/pending', { replace: true });
    } catch (e: any) {
      toast({ title: 'Erro ao submeter', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <h1 className="font-semibold text-foreground">Registar ATM</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-md">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-6">
          {(['photo', 'gps', 'details'] as Step[]).map((s, i) => (
            <div key={s} className="flex-1 flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-primary text-primary-foreground' :
                ['photo', 'gps', 'details'].indexOf(step) > i ? 'bg-primary/30 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>{i + 1}</div>
              {i < 2 && <div className="flex-1 h-0.5 bg-muted mx-2" />}
            </div>
          ))}
        </div>

        {step === 'photo' && (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-mono bg-card border border-border rounded-lg py-2">
              <Timer className="h-4 w-4 text-primary" />
              Tempo restante: <span className="font-bold text-primary">{mm}:{ss}</span>
            </div>
            <div className="bg-primary/10 rounded-2xl p-6">
              <Camera className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="font-bold text-foreground mb-1">Tire uma foto do ATM</h2>
              <p className="text-xs text-muted-foreground">
                Use a câmara do telemóvel. Fotos da galeria não são aceites.
                Posicione-se em frente ao ATM antes de iniciar.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhoto}
            />
            <Button variant="hero" size="lg" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <Camera className="h-5 w-5 mr-2" /> Tirar foto agora
            </Button>
          </div>
        )}

        {step === 'gps' && (
          <div className="space-y-4">
            {photoPreview && (
              <img src={photoPreview} alt="ATM" className="w-full h-48 object-cover rounded-xl border border-border" />
            )}
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
              {gpsLoading && (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">A obter localização…</p>
                </div>
              )}
              {coords && !gpsLoading && (
                <div>
                  <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-1" />
                  <p className="text-sm font-medium text-foreground">Localização capturada</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                  </p>
                </div>
              )}
              {gpsError && !gpsLoading && (
                <div>
                  <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-1" />
                  <p className="text-sm font-medium text-destructive">{gpsError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={requestGps} disabled={gpsLoading}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refazer GPS
              </Button>
              <Button variant="hero" className="flex-1" onClick={goToDetails} disabled={!coords}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="atm-name">Nome do ATM *</Label>
              <Input
                id="atm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: ATM BAI Kilamba, ATM BFA Bombeiros, ATM Keve Kikagil"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use uma referência próxima conhecida.
              </p>
            </div>

            <div>
              <Label htmlFor="atm-addr">Endereço *</Label>
              <Input
                id="atm-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-preenchido a partir do GPS.</p>
            </div>

            <div>
              <Label>Coordenadas</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : ''}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => { setStep('gps'); requestGps(); }}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">Tem dinheiro?</p>
                <p className="text-xs text-muted-foreground">Estado actual do ATM</p>
              </div>
              <Switch checked={hasCash} onCheckedChange={setHasCash} />
            </div>

            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">Tem papel?</p>
                <p className="text-xs text-muted-foreground">Para imprimir recibos</p>
              </div>
              <Switch checked={hasPaper} onCheckedChange={setHasPaper} />
            </div>

            <div>
              <Label htmlFor="obs">Observações</Label>
              <Textarea
                id="obs"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Informações adicionais (opcional)"
                className="mt-1"
                rows={3}
              />
            </div>

            <Button variant="hero" size="lg" className="w-full" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submeter para aprovação'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}