import { useState } from 'react';
import { Share2, Copy, CheckCircle, MessageCircle, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface ReferralShareProps {
  zoneName: string;
  zoneId: string;
  referralCode: string;
  agentName: string;
}

export function ReferralShare({ zoneName, zoneId, referralCode, agentName }: ReferralShareProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partilhar zona</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-xl p-4">
            <p className="text-sm font-semibold text-foreground">{zoneName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Quem subscrever pelo seu link recebe 30% de desconto e você ganha 30% de comissão!
            </p>
          </div>

          {/* Referral code */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Código de referência</p>
              <p className="font-mono font-bold text-primary text-lg">{referralCode}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={copyCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Link */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/50 rounded-lg p-3 overflow-hidden">
              <p className="text-xs text-muted-foreground truncate font-mono">{referralUrl}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={copyLink}>
              {copied ? <CheckCircle className="h-4 w-4 text-success" /> : <LinkIcon className="h-4 w-4" />}
            </Button>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3">
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
