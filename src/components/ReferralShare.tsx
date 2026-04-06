import { useState } from 'react';
import { Share2, Copy, CheckCircle, MessageCircle, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { usePlatformMargin } from '@/hooks/usePlatformMargin';

interface ReferralShareProps {
  zoneName: string;
  zoneId: string;
  referralCode: string;
  agentName: string;
}

export function ReferralShare({ zoneName, zoneId, referralCode, agentName }: ReferralShareProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const { referralDiscount, agentShare } = usePlatformMargin();
  const discountPct = Math.round(referralDiscount * 100);
  const commissionPct = Math.round(agentShare * 100);

  const baseUrl = window.location.origin;
  const referralUrl = `${baseUrl}/zone/${zoneId}?ref=${referralCode}`;
  
  const shareText = `🏧 Encontre ATMs com dinheiro na zona "${zoneName}"!\n\nInformação em tempo real sobre ATMs verificados por agentes locais.\n\n👉 Subscreva com 30% de desconto usando o meu link:\n${referralUrl}\n\nCódigo: ${referralCode}\n\n— ${agentName}, Agente Dinheiro em Mão 🇦🇴`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copiado!' });
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(referralCode);
    toast({ title: 'Código copiado!', description: referralCode });
  };

  const nativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: `ATMs com dinheiro - ${zoneName}`, text: shareText, url: referralUrl });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Share2 className="h-3.5 w-3.5" />
          Partilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6 mx-4 sm:mx-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>Partilhar zona</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-secondary/50 rounded-xl p-3 sm:p-4">
            <p className="text-sm font-semibold text-foreground">{zoneName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Quem subscrever pelo seu link recebe 30% de desconto e você ganha 30% de comissão!
            </p>
          </div>

          {/* Referral code */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Código de referência</p>
              <p className="font-mono font-bold text-primary text-base sm:text-lg">{referralCode}</p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={copyCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Link */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-muted/50 rounded-lg p-3 overflow-hidden">
              <p className="text-xs text-muted-foreground font-mono break-all">{referralUrl}</p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={copyLink}>
              {copied ? <CheckCircle className="h-4 w-4 text-success" /> : <LinkIcon className="h-4 w-4" />}
            </Button>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full gap-2 text-success border-success/30 hover:bg-success/5">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </a>
            {typeof navigator.share === 'function' && (
              <Button variant="outline" className="w-full gap-2" onClick={nativeShare}>
                <Share2 className="h-4 w-4" />
                Partilhar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
