import { useState, useEffect } from 'react';
import { Copy, CheckCircle, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
}

const COMPANY_IBAN = '0040 0000 1340 3139 1010 5';
const COMPANY_WHATSAPP = '933 986 318';

type Step = 'info' | 'processing' | 'pending' | 'error';

export function PaymentModal({ zone, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<Step>('info');
  const [paymentRef, setPaymentRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      const ref = `DEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setPaymentRef(ref);
      setStep('info');
      setError(null);
    }
  }, [isOpen]);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: 'Copiado!', description: `${field} copiado para a área de transferência.` });
  };

  const handleConfirmPayment = async () => {
    if (!user) {
      setError('Por favor, faça login para continuar.');
      setStep('error');
      return;
    }

    setStep('processing');

    try {
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        zone_id: zone.id,
        amount_kz: zone.price_kz,
        method: 'transferencia',
        status: 'pending',
        payment_ref: paymentRef,
      });

      if (txError) throw txError;

      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const { error: subError } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        zone_id: zone.id,
        amount_kz: zone.price_kz,
        expiry_date: expiryDate.toISOString(),
        payment_ref: paymentRef,
        status: 'pending',
      });

      if (subError) throw subError;

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'pending' ? 'Subscrição Pendente' : `Subscrever ${zone.name}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'info' && (
          <div className="space-y-5">
            <div className="bg-secondary/50 rounded-xl p-4">
              <h4 className="font-semibold text-foreground">{zone.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">Acesso por 30 dias</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-bold text-foreground">{zone.price_kz}</span>
                <span className="text-muted-foreground">KZ</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Dados para transferência:</p>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">IBAN</p>
                  <p className="font-mono font-semibold text-foreground text-sm">{COMPANY_IBAN}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(COMPANY_IBAN, 'IBAN')}>
                  {copiedField === 'IBAN' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Referência (incluir na transferência)</p>
                  <p className="font-mono font-bold text-primary text-sm">{paymentRef}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(paymentRef, 'Referência')}>
                  {copiedField === 'Referência' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Enviar comprovativo via WhatsApp</p>
                  <p className="font-semibold text-foreground text-sm">{COMPANY_WHATSAPP}</p>
                </div>
                <a
                  href={`https://wa.me/244${COMPANY_WHATSAPP.replace(/\s/g, '')}?text=${encodeURIComponent(`Olá! Fiz a transferência para a zona "${zone.name}". Referência: ${paymentRef}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="icon" className="text-success">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>

            <div className="bg-warning/10 rounded-lg p-3">
              <p className="text-xs text-warning font-medium">
                ⚠️ Inclua a referência na descrição da transferência e envie o comprovativo por WhatsApp para ativar a sua subscrição.
              </p>
            </div>

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
