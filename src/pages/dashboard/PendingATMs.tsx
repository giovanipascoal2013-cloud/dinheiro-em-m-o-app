import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, MapPin, User as UserIcon, Image as ImageIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface PendingATM {
  id: string;
  bank_name: string;
  address: string;
  latitude: number;
  longitude: number;
  has_cash: boolean;
  has_paper: boolean | null;
  obs: string | null;
  photo_url: string | null;
  submitted_by: string;
  created_at: string;
  submitter_name?: string;
  submitter_phone?: string;
  signed_photo?: string;
}

export default function PendingATMs() {
  const [items, setItems] = useState<PendingATM[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingATM | null>(null);
  const [approveTarget, setApproveTarget] = useState<PendingATM | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zonePrice, setZonePrice] = useState('0');
  const [reason, setReason] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('atms')
      .select('id, bank_name, address, latitude, longitude, has_cash, has_paper, obs, photo_url, submitted_by, created_at')
      .eq('status_approval', 'pending')
      .order('created_at', { ascending: false });
    const list = (data ?? []) as PendingATM[];

    // Fetch profiles + signed urls
    const ids = [...new Set(list.map(i => i.submitted_by))];
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, nome, telefone')
        .in('user_id', ids);
      const map = new Map(profs?.map(p => [p.user_id, p]) ?? []);
      for (const it of list) {
        const p = map.get(it.submitted_by);
        it.submitter_name = p?.nome ?? '—';
        it.submitter_phone = p?.telefone ?? '';
        if (it.photo_url) {
          const { data: signed } = await supabase.storage
            .from('atm-photos')
            .createSignedUrl(it.photo_url, 3600);
          it.signed_photo = signed?.signedUrl;
        }
      }
    }
    setItems(list);
    setLoading(false);
  };

  const openApprove = (atm: PendingATM) => {
    setApproveTarget(atm);
    setZoneName(`${atm.bank_name}`);
    setZonePrice('0');
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    setApproving(approveTarget.id);
    const { error } = await supabase.rpc('approve_pending_atm' as any, {
      _atm_id: approveTarget.id,
      _zone_id: null,
      _zone_name: zoneName.trim() || null,
      _zone_price: Number(zonePrice) || 0,
    });
    if (error) {
      toast({ title: 'Erro ao aprovar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'ATM aprovado', description: 'Zona criada e agente notificado.' });
      setApproveTarget(null);
      fetchData();
    }
    setApproving(null);
  };

  const confirmReject = async () => {
    if (!rejectTarget || !reason.trim()) return;
    const { error } = await supabase.rpc('reject_pending_atm' as any, {
      _atm_id: rejectTarget.id,
      _reason: reason.trim(),
    });
    if (error) {
      toast({ title: 'Erro ao rejeitar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'ATM rejeitado' });
      setRejectTarget(null);
      setReason('');
      fetchData();
    }
  };

  return (
    <DashboardLayout title="ATMs pendentes" subtitle="Aprove ou rejeite submissões dos agentes">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success" />
          Nenhum ATM pendente.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(atm => (
            <div key={atm.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              {atm.signed_photo ? (
                <img src={atm.signed_photo} alt={atm.bank_name} className="w-full h-40 object-cover rounded-lg" />
              ) : (
                <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-foreground">{atm.bank_name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {atm.address}
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {atm.latitude.toFixed(6)}, {atm.longitude.toFixed(6)}
                </p>
              </div>
              <div className="text-xs text-muted-foreground border-t border-border/50 pt-2 flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                Submetido por <strong>{atm.submitter_name}</strong> {atm.submitter_phone && `(${atm.submitter_phone})`} •
                {' '}{formatDistanceToNow(new Date(atm.created_at), { locale: pt, addSuffix: true })}
              </div>
              {atm.obs && <p className="text-xs text-muted-foreground italic">"{atm.obs}"</p>}
              <div className="flex gap-2 pt-1">
                <Button variant="hero" className="flex-1" onClick={() => openApprove(atm)} disabled={approving === atm.id}>
                  {approving === atm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar</>}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setRejectTarget(atm)}>
                  <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(v) => !v && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar ATM</DialogTitle>
            <DialogDescription>Será criada uma nova zona com este ATM e atribuída ao agente submissor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da zona</Label>
              <Input value={zoneName} onChange={(e) => setZoneName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Preço da zona (Kz)</Label>
              <Input type="number" min="0" value={zonePrice} onChange={(e) => setZonePrice(e.target.value)} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Deixe 0 para usar o preço por ATM definido na plataforma.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveTarget(null)}>Cancelar</Button>
            <Button variant="hero" onClick={confirmApprove} disabled={!!approving}>
              {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar ATM</DialogTitle>
            <DialogDescription>O agente será notificado e pode submeter novamente.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Motivo</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Foto desfocada, coordenadas erradas…" rows={3} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={!reason.trim()}>Rejeitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}