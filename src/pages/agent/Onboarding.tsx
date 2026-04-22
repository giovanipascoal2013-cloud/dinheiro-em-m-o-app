import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ChevronRight, ChevronLeft, Briefcase, Banknote, Gift, Share2,
  Camera, Timer, MapPin, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAgentOnboarding } from '@/hooks/useAgentOnboarding';

const STEPS = [
  { icon: Briefcase, title: 'Bem-vindo, Agente', desc: 'É a pessoa de referência por uma zona de ATMs. Mantém a informação actualizada para os clientes.' },
  { icon: Banknote, title: 'Como ganha dinheiro', desc: 'Recebe uma comissão de cada subscrição mensal feita na sua zona.' },
  { icon: Gift, title: 'Bónus por referência', desc: 'Partilhe o seu link único: cada subscrição com o seu código gera comissão extra.' },
  { icon: Share2, title: 'Partilhar zonas', desc: 'O Dashboard gera automaticamente flyers com QR para divulgar nas redes sociais.' },
  { icon: MapPin, title: 'Registar o seu primeiro ATM', desc: 'Para começar, vai precisar de registar um ATM. Deve estar fisicamente em frente ao equipamento.' },
  { icon: Camera, title: 'Foto cronometrada', desc: 'Tem 2 minutos para tirar a foto a partir da câmara do seu telemóvel. Fotos da galeria não são aceites.' },
  { icon: Timer, title: 'GPS obrigatório', desc: 'O seu dispositivo deve permitir o acesso à localização para capturar as coordenadas exactas do ATM.' },
  { icon: ShieldCheck, title: 'Aprovação', desc: 'Após submissão, um administrador valida e cria a zona. Será notificado assim que aprovado.' },
];

export default function AgentOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const { update } = useAgentOnboarding();

  const isLast = step === STEPS.length - 1;
  const S = STEPS[step];
  const Icon = S.icon;

  const finish = async () => {
    await update({ onboarding_seen: true });
    navigate('/profile?setup=1', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              Passo {step + 1} de {STEPS.length}
            </span>
          </div>

          <div className="flex justify-center">
            <div className="bg-primary/10 rounded-2xl p-5">
              <Icon className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-foreground">{S.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{S.desc}</p>
          </div>

          <div className="flex items-center gap-3 pt-4">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button
              variant={isLast ? 'hero' : 'default'}
              className="flex-1"
              onClick={() => isLast ? finish() : setStep(s => s + 1)}
            >
              {isLast ? 'Começar registo' : 'Próximo'}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>

          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === step ? "bg-primary w-6" : "bg-muted-foreground/30 w-2"
                )}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}