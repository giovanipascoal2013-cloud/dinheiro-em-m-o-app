import { useState, useEffect } from 'react';
import { Copy, CheckCircle, MessageCircle, Loader2, AlertCircle, Tag, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformMargin } from '@/hooks/usePlatformMargin';

interface PaymentZone {
  id: string;
  name: string;
  price_kz: number;
}

interface PaymentModalProps {
  zone: PaymentZone;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialRefCode?: string;
}

const PAYMENT_ENTITY = '00930';
const PAYMENT_REFERENCE = '949 344 625';
const COMPANY_WHATSAPP = '933 986 318';

type Step = 'info' | 'processing' | 'pending' | 'error';

export function PaymentModal({ zone, isOpen, onClose, onSuccess, initialRefCode }: PaymentModalProps) {
  const [step, setStep] = useState<Step>('info');
  const [paymentRef, setPaymentRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [refCode, setRefCode] = useState('');
  const [refValid, setRefValid] = useState<boolean | null>(null);
  const [refAgentId, setRefAgentId] = useState<string | null>(null);
  const [checkingRef, setCheckingRef] = useState(false);
  const [showRefInput, setShowRefInput] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { referralDiscount } = usePlatformMargin();

  const discountPct = Math.round(referralDiscount * 100);
  const discount = refValid ? Math.round(zone.price_kz * referralDiscount) : 0;
  const finalPrice = zone.price_kz - discount;

  useEffect(() => {
    if (isOpen) {
      // Persist reference per zone in localStorage
      const storageKey = `payment_ref_${zone.id}`;
      const existingRef = localStorage.getItem(storageKey);
      if (existingRef) {
        setPaymentRef(existingRef);
      } else {
        const ref = `DEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        setPaymentRef(ref);
        localStorage.setItem(storageKey, ref);
      }
      setStep('info');
      setError(null);
      setRefCode(initialRefCode || '');
      setRefValid(null);
      setRefAgentId(null);
      setShowRefInput(!!initialRefCode);
      if (initialRefCode) validateRefCode(initialRefCode);
    }
  }, [isOpen]);

  const validateRefCode = async (code: string) => {
    if (!code || code.length < 3) { setRefValid(null); setRefAgentId(null); return; }
    setCheckingRef(true);
    const { data } = await supabase
      .from('agent_zones')
      .select('agent_id, zone_id')
      .eq('referral_code', code.toUpperCase())
      .eq('zone_id', zone.id)
      .maybeSingle();
    
    if (data) {
      setRefValid(true);
      setRefAgentId(data.agent_id);
    } else {
      setRefValid(false);
      setRefAgentId(null);
    }
    setCheckingRef(false);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: 'Copiado!', description: `${field} copiado para a área de transferência.` });
  };

  const handleConfirmPayment = async () => {
    setStep('processing');

    // Check for existing pending subscription
    const { data: existingPending } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user!.id)
      .eq('zone_id', zone.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      setError('Já tem uma subscrição pendente para esta zona. Aguarde a aprovação ou contacte o suporte.');
      setStep('error');
      return;
    }

    try {
      const { data: txData, error: txError } = await supabase.from('transactions').insert({
        user_id: user!.id,
        zone_id: zone.id,
        amount_kz: finalPrice,
        method: 'referencia',
        status: 'pending',
        payment_ref: paymentRef,
      }).select('id').single();

      if (txError) throw txError;

      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const { data: subData, error: subError } = await supabase.from('subscriptions').insert({
        user_id: user!.id,
        zone_id: zone.id,
        amount_kz: finalPrice,
        expiry_date: expiryDate.toISOString(),
        payment_ref: paymentRef,
        status: 'pending',
        transaction_id: txData?.id,
      }).select('id').single();

      if (subError) throw subError;

      // Track referral if valid
      if (refValid && refAgentId && subData) {
        await supabase.from('referrals').insert({
          agent_id: refAgentId,
          referral_code: refCode.toUpperCase(),
          subscription_id: subData.id,
        });
      }

      // Clear persisted reference after successful submission
      localStorage.removeItem(`payment_ref_${zone.id}`);

      // Notify agent of this zone
      const { data: agentZone } = await supabase
        .from('agent_zones')
        .select('agent_id')
        .eq('zone_id', zone.id)
        .maybeSingle();

      if (agentZone) {
        await supabase.rpc('notify_user', {
          _user_id: agentZone.agent_id,
          _title: 'Nova subscrição na sua zona!',
          _message: `Um utilizador subscreveu a zona ${zone.name}. Aguarde a aprovação pelo supervisor.`,
          _type: 'subscription',
        });
      }

      // Notify admins and supervisors
      await supabase.rpc('notify_users_by_role', {
        _role: 'admin',
        _title: 'Nova subscrição pendente',
        _message: `Nova subscrição pendente na zona ${zone.name}. Aprove em Subscrições.`,
        _type: 'subscription',
      });
      await supabase.rpc('notify_users_by_role', {
        _role: 'supervisor',
        _title: 'Nova subscrição pendente',
        _message: `Nova subscrição pendente na zona ${zone.name}. Aprove em Subscrições.`,
        _type: 'subscription',
      });

      setStep('pending');
    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      setError(err.message || 'Erro inesperado. Tente novamente.');
      setStep('error');
    }
  };

  const handleClose = () => {
    if (step === 'pending') onSuccess();
    setStep('info');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'pending' ? 'Subscrição Pendente' : `Subscrever ${zone.name}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'info' && (
          <div className="space-y-5">
            {/* 1. Zone summary + price */}
            <div className="bg-secondary/50 rounded-xl p-4">
              <h4 className="font-semibold text-foreground">{zone.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">Acesso por 30 dias</p>
              <div className="flex items-baseline gap-1 mt-2">
                {discount > 0 ? (
                  <>
                    <span className="text-lg line-through text-muted-foreground">{zone.price_kz}</span>
                    <span className="text-3xl font-bold text-foreground">{finalPrice}</span>
                    <span className="text-muted-foreground">KZ</span>
                    <span className="bg-success/10 text-success text-xs font-semibold px-2 py-0.5 rounded-full ml-2">-{discountPct}%</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-foreground">{zone.price_kz}</span>
                    <span className="text-muted-foreground">KZ</span>
                  </>
                )}
              </div>
            </div>

            {/* 2. Payment instructions */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Dados para pagamento por referência:</p>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  Vai ao Multicaixa, escolhe o menu <strong>Pagamentos → Pagamentos por Referência</strong>, escolhe a entidade <strong>UNITEL Money</strong> ou insere o código da entidade <strong>{PAYMENT_ENTITY}</strong>.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Entidade</p>
                  <p className="font-mono font-semibold text-foreground text-sm">{PAYMENT_ENTITY}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(PAYMENT_ENTITY, 'Entidade')}>
                  {copiedField === 'Entidade' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Referência de pagamento</p>
                  <p className="font-mono font-semibold text-foreground text-sm">{PAYMENT_REFERENCE}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(PAYMENT_REFERENCE, 'Referência')}>
                  {copiedField === 'Referência' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Valor a pagar</p>
                  <p className="font-mono font-bold text-primary text-sm">{finalPrice.toLocaleString()} KZ</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Referência da plataforma</p>
                  <p className="font-mono font-bold text-primary text-sm">{paymentRef}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(paymentRef, 'Ref. Plataforma')}>
                  {copiedField === 'Ref. Plataforma' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Enviar comprovativo via WhatsApp (apenas a referência da plataforma)</p>
                  <p className="font-semibold text-foreground text-sm">{COMPANY_WHATSAPP}</p>
                </div>
                <a
                  href={`https://wa.me/244${COMPANY_WHATSAPP.replace(/\s/g, '')}?text=${encodeURIComponent(`Ref: ${paymentRef}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="icon" className="text-success">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>

            {/* 3. Critical warning */}
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-xs text-destructive font-semibold">
                🚨 IMPORTANTE: Após o pagamento, volte aqui e clique no botão "Já paguei" abaixo. Se fechar esta janela sem clicar, a sua referência será mantida, mas deve reabrir e confirmar.
              </p>
            </div>

            {/* 4. Referral code — hidden by default */}
            <div>
              <button
                type="button"
                onClick={() => setShowRefInput(!showRefInput)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Tag className="h-3.5 w-3.5" />
                <span>Tem um código de desconto?</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showRefInput ? 'rotate-180' : ''}`} />
              </button>

              {showRefInput && (
                <div className="space-y-2 mt-3">
                  <div className="flex gap-2">
                    <Input
                      value={refCode}
                      onChange={(e) => {
                        setRefCode(e.target.value.toUpperCase());
                        setRefValid(null);
                      }}
                      placeholder="Ex: AB12CD34"
                      className="font-mono uppercase"
                      maxLength={10}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => validateRefCode(refCode)}
                      disabled={checkingRef || refCode.length < 3}
                      className="shrink-0"
                    >
                      {checkingRef ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar'}
                    </Button>
                  </div>
                  {refValid === true && (
                    <p className="text-xs text-success flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Código válido! {discountPct}% de desconto aplicado.
                    </p>
                  )}
                  {refValid === false && (
                    <p className="text-xs text-destructive">Código inválido para esta zona.</p>
                  )}
                </div>
              )}
            </div>

            {/* 5. Confirm button */}
            <Button variant="hero" size="lg" className="w-full" onClick={handleConfirmPayment}>Já paguei</Button>
            <p className="text-xs text-muted-foreground text-center">A subscrição será ativada após verificação do pagamento.</p>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">A registar o seu pagamento...</p>
          </div>
        )}

        {step === 'pending' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="bg-warning/10 p-4 rounded-full">
              <CheckCircle className="h-12 w-12 text-warning" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">Pagamento registado!</p>
              <p className="text-muted-foreground mt-1">A sua subscrição está pendente de aprovação.</p>
              {discount > 0 && (
                <p className="text-success text-sm mt-2">Desconto de {discount.toLocaleString()} KZ aplicado!</p>
              )}
              <p className="text-xs text-muted-foreground mt-3 font-mono">Ref: {paymentRef}</p>
            </div>
            <Button variant="default" onClick={handleClose} className="mt-4">Entendido</Button>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="bg-destructive/10 p-4 rounded-full">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">Erro</p>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button variant="default" onClick={() => setStep('info')}>Tentar novamente</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
