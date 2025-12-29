import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, CreditCard, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Subscription {
  id: string;
  status: string;
  start_date: string;
  expiry_date: string;
  amount_kz: number;
  zone: {
    id: string;
    name: string;
    description: string | null;
  };
}

export default function MyZones() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user.id);
        fetchSubscriptions(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchSubscriptions = async (userId: string) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        start_date,
        expiry_date,
        amount_kz,
        zone:zones(id, name, description)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSubscriptions(data as unknown as Subscription[]);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string, expiryDate: string) => {
    const isExpired = new Date(expiryDate) < new Date();
    
    if (isExpired || status === 'expired') {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (status === 'active') {
      return <Badge className="bg-emerald-500">Ativo</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="secondary">Pendente</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Minhas Zonas</h1>
          <p className="text-muted-foreground">
            Gerencie suas subscrições de zonas
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !user ? (
          <Card className="text-center py-12">
            <CardContent>
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Faça login para ver suas zonas</h2>
              <p className="text-muted-foreground mb-4">
                Precisa estar autenticado para visualizar suas subscrições
              </p>
              <Button asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
            </CardContent>
          </Card>
        ) : subscriptions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Nenhuma zona subscrita</h2>
              <p className="text-muted-foreground mb-4">
                Explore as zonas disponíveis e faça sua primeira subscrição
              </p>
              <Button asChild>
                <Link to="/">Explorar Zonas</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((sub) => (
              <Card key={sub.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">{sub.zone.name}</CardTitle>
                    {sub.zone.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {sub.zone.description}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(sub.status, sub.expiry_date)}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Expira: {format(new Date(sub.expiry_date), "d 'de' MMMM, yyyy", { locale: pt })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>{sub.amount_kz.toLocaleString('pt-AO')} Kz</span>
                  </div>
                  <Button asChild variant="outline" className="w-full mt-2">
                    <Link to={`/zone/${sub.zone.id}`}>Ver Detalhes</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
