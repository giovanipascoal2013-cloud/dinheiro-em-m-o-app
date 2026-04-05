import { useState, useEffect } from 'react';
import { Wallet, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  onSuccess: () => void;
}

type Step = 'form' | 'processing' | 'success';

export function WithdrawalModal({ isOpen, onClose, availableBalance, onSuccess }: WithdrawalModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState(availableBalance.toString());
  const [titular, setTitular] = useState('');
  const [iban, setIban] = useState('');
  const [banco, setBanco] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [hasProfileIban, setHasProfileIban] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    setAmount(availableBalance.toString());
    supabase.from('profiles').select('iban, iban_titular').eq('user_id', user.id).single().then(({ data }) => {
      const d = data as any;
      if (d?.iban) {
        setIban(d.iban);
        setTitular(d.iban_titular || '');
        setHasProfileIban(true);
      } else {
        setHasProfileIban(false);
      }
      setProfileLoaded(true);
    });
  }, [isOpen, user]);

  const handleClose = () => {
    if (step === 'success') onSuccess();
    setStep('form');
    setTitular('');
    setIban('');
    setBanco('');
    setProfileLoaded(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) return;
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > availableBalance) {
      toast({ title: 'Valor inválido', description: 'Insira um valor válido.', variant: 'destructive' });
      return;
    }
    if (!titular || !iban) {
      toast({ title: 'Preencha os dados', description: 'Titular e IBAN são obrigatórios.', variant: 'destructive' });
      return;
    }

    setStep('processing');

    try {
      const { error } = await supabase.from('withdrawals').insert({
        agent_id: user.id,
        amount_kz: amountNum,
        method: 'iban',
        bank_details: { titular, iban, banco },
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

            {profileLoaded && !hasProfileIban && (
              <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">IBAN não configurado</p>
                  <p className="text-muted-foreground">Configure o seu IBAN na página de perfil para pré-preencher automaticamente.</p>
                  <button onClick={() => { handleClose(); navigate('/profile'); }} className="text-primary underline text-xs mt-1">Ir para o perfil</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Valor a levantar (KZ)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} max={availableBalance} min={1} />
            </div>

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
                <Label>Banco (opcional)</Label>
                <Input value={banco} onChange={e => setBanco(e.target.value)} placeholder="Ex: BAI, BFA..." />
              </div>
            </div>

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
