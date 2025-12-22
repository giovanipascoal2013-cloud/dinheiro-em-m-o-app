import { useState } from 'react';
import { Banknote, CreditCard, Smartphone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Zone } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentModalProps {
  zone: Zone;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentMethod = 'multicaixa_express' | 'referencia' | 'cartao';
type PaymentStep = 'select' | 'phone' | 'processing' | 'success' | 'error';

interface PaymentResult {
  transaction_id: string;
  subscription_id: string;
  payment_ref: string;
  expiry_date: string;
  amount_kz: number;
}

export function PaymentModal({ zone, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('select');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('multicaixa_express');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const { toast } = useToast();

  const handleSelectMethod = () => {
    if (selectedMethod === 'multicaixa_express') {
      setStep('phone');
    }
  };

  const handlePay = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      setError('Por favor, insira um número de telefone válido');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Por favor, faça login para continuar');
        setStep('error');
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('process-payment', {
        body: {
          zone_id: zone.id,
          zone_name: zone.nome,
          amount_kz: zone.price_kz,
          phone_number: phoneNumber,
          method: selectedMethod,
        },
      });

      if (fnError) {
        console.error('Payment error:', fnError);
        setError(fnError.message || 'Erro ao processar pagamento');
        setStep('error');
        return;
      }

      if (data?.success) {
        setPaymentResult(data.data);
        setStep('success');
        toast({
          title: 'Pagamento confirmado!',
          description: `Referência: ${data.data.payment_ref}`,
        });
      } else {
        setError(data?.error || 'Pagamento falhou');
        setStep('error');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erro inesperado. Por favor, tente novamente.');
      setStep('error');
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onSuccess();
    }
    setStep('select');
    setPhoneNumber('');
    setError(null);
    setPaymentResult(null);
    onClose();
  };

  const handleRetry = () => {
    setStep('phone');
    setError(null);
  };

  const paymentMethods = [
    { 
      id: 'multicaixa_express' as const, 
      name: 'Multicaixa Express', 
      icon: Smartphone,
      description: 'Pague com o seu telemóvel',
      available: true 
    },
    { 
      id: 'referencia' as const, 
      name: 'Referência Bancária', 
      icon: Banknote,
      description: 'Em breve',
      available: false 
    },
    { 
      id: 'cartao' as const, 
      name: 'Cartão de Crédito', 
      icon: CreditCard,
      description: 'Em breve',
      available: false 
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'success' ? (
              <>
                <CheckCircle className="h-5 w-5 text-success" />
                Pagamento Confirmado
              </>
            ) : (
              'Subscrever Zona'
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            {/* Zone summary */}
            <div className="bg-secondary/50 rounded-xl p-4">
              <h4 className="font-semibold text-foreground">{zone.nome}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Acesso a {zone.atm_count} ATMs por 90 dias
              </p>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-3xl font-bold text-foreground">{zone.price_kz}</span>
                <span className="text-muted-foreground">KZ</span>
              </div>
            </div>

            {/* Payment methods */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Método de pagamento</p>
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => method.available && setSelectedMethod(method.id)}
                    disabled={!method.available}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                      method.available 
                        ? selectedMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                        : "border-border/50 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg",
                      selectedMethod === method.id ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        selectedMethod === method.id ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{method.name}</p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button 
              variant="hero" 
              size="lg" 
              className="w-full"
              onClick={handleSelectMethod}
            >
              Continuar
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Ao pagar, aceita os termos de serviço e política de privacidade
            </p>
          </div>
        )}

        {step === 'phone' && (
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-xl p-4">
              <h4 className="font-semibold text-foreground">{zone.nome}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Total: <span className="font-bold text-foreground">{zone.price_kz} KZ</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Número de telefone</Label>
              <div className="flex">
                <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">
                  +244
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9XX XXX XXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Receberá um pedido de pagamento no Multicaixa Express
              </p>
            </div>

            <Button 
              variant="hero" 
              size="lg" 
              className="w-full"
              onClick={handlePay}
              disabled={phoneNumber.length < 9}
            >
              Pagar {zone.price_kz} KZ
            </Button>

            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => setStep('select')}
            >
              Voltar
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Processando pagamento...</p>
            <p className="text-xs text-muted-foreground">Confirme no seu telemóvel</p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="bg-success/10 p-4 rounded-full">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">Subscrição ativada!</p>
              <p className="text-muted-foreground mt-1">
                Agora tem acesso à zona {zone.nome} por 90 dias
              </p>
              {paymentResult && (
                <p className="text-xs text-muted-foreground mt-2">
                  Ref: {paymentResult.payment_ref}
                </p>
              )}
            </div>
            <Button variant="default" onClick={handleClose} className="mt-4">
              Ver ATMs
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="bg-destructive/10 p-4 rounded-full">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">Pagamento falhou</p>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button variant="default" onClick={handleRetry}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
