import { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const hints: Record<string, string[]> = {
  admin: [
    'Revise levantamentos pendentes regularmente para manter a confiança dos agentes.',
    'Zonas com mais ATMs atraem mais subscrições — incentive agentes a reportar ATMs activos.',
    'Analise zonas com baixa adesão e considere ajustar preços ou combinar zonas.',
    'Mantenha a equipa de supervisores actualizada sobre novas políticas e processos.',
    'Monitore a frequência de actualizações dos agentes — agentes inactivos afectam a qualidade.',
    'Considere criar promoções sazonais para aumentar as subscrições em períodos de baixa.',
  ],
  supervisor: [
    'Verifique regularmente se os agentes estão a actualizar o estado dos ATMs.',
    'Atribua zonas estrategicamente — agentes próximos às zonas respondem mais rápido.',
    'Aprove subscrições pendentes rapidamente para não perder utilizadores.',
    'Zonas com muitas reclamações podem indicar agentes que precisam de apoio adicional.',
    'Crie zonas em áreas com alta concentração de ATMs para maximizar o valor.',
    'Revise os dados dos agentes para garantir que as informações estão actualizadas.',
  ],
  agent: [
    'Actualize o estado dos ATMs com frequência — utilizadores valorizam informação recente.',
    'Partilhe o seu link de referência nas redes sociais para ganhar comissões extras.',
    'ATMs marcados como "Com dinheiro" geram mais confiança e adesões à sua zona.',
    'Responda rapidamente a mudanças de estado — os utilizadores dependem da sua informação.',
    'Quanto mais ATMs activos na sua zona, maior o preço da subscrição e o seu ganho.',
    'Use as observações dos ATMs para dar dicas úteis (ex: "melhor horário: manhã").',
  ],
  user: [
    'Subscreva zonas perto de si para aceder a informações de ATMs em tempo real.',
    'Use o código de referência de um agente e ganhe desconto na primeira subscrição.',
    'Verifique a hora da última actualização — informação recente é mais fiável.',
    'Explore diferentes zonas antes de subscrever para encontrar a melhor para si.',
    'A fila no ATM pode mudar rapidamente — consulte antes de se deslocar.',
  ],
};

interface DashboardHintProps {
  role: 'admin' | 'supervisor' | 'agent' | 'user';
  className?: string;
}

export function DashboardHint({ role, className }: DashboardHintProps) {
  const [visible, setVisible] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    // Show hint ~40% of the time
    if (Math.random() > 0.6) {
      const roleHints = hints[role] || hints.user;
      setHint(roleHints[Math.floor(Math.random() * roleHints.length)]);
      setVisible(true);
    }
  }, [role]);

  if (!visible || !hint) return null;

  return (
    <div className={cn(
      "flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-xl p-4 mb-6 animate-fade-in",
      className
    )}>
      <div className="bg-primary/10 p-2 rounded-lg shrink-0">
        <Lightbulb className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary mb-0.5">Dica</p>
        <p className="text-sm text-foreground">{hint}</p>
      </div>
      <button onClick={() => setVisible(false)} className="text-muted-foreground hover:text-foreground shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
