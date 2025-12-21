import { useState } from 'react';
import { X, Banknote, CreditCard, Smartphone, Loader2, CheckCircle } from 'lucide-react';
import { Zone } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PaymentModalProps {
  zone: Zone;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentMethod = 'multicaixa_express' | 'referencia' | 'cartao';
type PaymentStep = 'select' | 'processing' | 'success';

export function PaymentModal({ zone, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('select');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('multicaixa_express');

  const handlePay = async () => {
    setStep('processing');
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setStep('success');
  };

  const handleClose = () => {
    if (step === 'success') {
      onSuccess();
    }
    setStep('select');
    onClose();
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
              onClick={handlePay}
            >
              Pagar {zone.price_kz} KZ
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Ao pagar, aceita os termos de serviço e política de privacidade
            </p>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Processando pagamento...</p>
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
            </div>
            <Button variant="default" onClick={handleClose} className="mt-4">
              Ver ATMs
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
