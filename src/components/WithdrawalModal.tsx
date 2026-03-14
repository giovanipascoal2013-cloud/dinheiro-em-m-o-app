import { useState } from 'react';
import { Wallet, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  onSuccess: () => void;
}

type Method = 'iban' | 'express';
type Step = 'form' | 'processing' | 'success';

export function WithdrawalModal({ isOpen, onClose, availableBalance, onSuccess }: WithdrawalModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [method, setMethod] = useState<Method>('iban');
  const [amount, setAmount] = useState(availableBalance.toString());

  // IBAN fields
  const [titular, setTitular] = useState('');
  const [iban, setIban] = useState('');
  const [banco, setBanco] = useState('');

  // Express fields
  const [telefone, setTelefone] = useState('');

  const handleClose = () => {
    if (step === 'success') onSuccess();
    setStep('form');
    setTitular('');
    setIban('');
    setBanco('');
    setTelefone('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) return;
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > availableBalance) {
      toast({ title: 'Valor inválido', description: 'Insira um valor válido.', variant: 'destructive' });
      return;
    }

    if (method === 'iban' && (!titular || !iban)) {
      toast({ title: 'Preencha os dados', description: 'Titular e IBAN são obrigatórios.', variant: 'destructive' });
      return;
    }
    if (method === 'express' && !telefone) {
      toast({ title: 'Preencha o telefone', variant: 'destructive' });
      return;
    }

    setStep('processing');

    try {
      const bankDetails = method === 'iban'
        ? { titular, iban, banco }
        : { telefone };

      const { error } = await supabase.from('withdrawals').insert({
        agent_id: user.id,
        amount_kz: amountNum,
        method,
        bank_details: bankDetails,
        status: 'pending',
      });

      if (error) throw error;

      setStep('success');
      toast({ title: 'Solicitação enviada', description: 'O administrador irá processar o seu levantamento.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      setStep('form');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Levantar Saldo
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            <div className="bg-success/10 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">Saldo disponível</p>
              <p className="text-2xl font-bold text-success">{Math.round(availableBalance).toLocaleString()} KZ</p>
            </div>

            <div className="space-y-2">
              <Label>Valor a levantar (KZ)</Label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                max={availableBalance}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Método de recebimento</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMethod('iban')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    method === 'iban' ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground'
                  }`}
                >
                  Transferência IBAN
                </button>
                <button
                  onClick={() => setMethod('express')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    method === 'express' ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground'
                  }`}
                >
                  Multicaixa Express
                </button>
              </div>
            </div>

            {method === 'iban' ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nome do titular</Label>
                  <Input value={titular} onChange={e => setTitular(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-1">
                  <Label>IBAN</Label>
                  <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="AO06 ..." className="font-mono" />
                </div>
                <div className="space-y-1">
                  <Label>Banco</Label>
                  <Input value={banco} onChange={e => setBanco(e.target.value)} placeholder="Ex: BAI, BFA..." />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Número de telefone</Label>
                <div className="flex">
                  <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+244</div>
                  <Input
                    value={telefone}
                    onChange={e => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="9XX XXX XXX"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            )}

            <Button variant="hero" size="lg" className="w-full" onClick={handleSubmit}>
              Levantar {Number(amount).toLocaleString()} KZ
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">A enviar solicitação...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="bg-success/10 p-4 rounded-full">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">Solicitação enviada!</p>
              <p className="text-muted-foreground mt-1">
                O administrador irá processar o seu levantamento. Será notificado quando for concluído.
              </p>
            </div>
            <Button variant="default" onClick={handleClose} className="mt-4">Entendido</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
