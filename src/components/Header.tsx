import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MapPin, User, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import logoIcon from '@/assets/logo-icon.png';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isSupervisor, isAgent, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: 'Sessão terminada',
      description: 'Até breve!',
    });
    navigate('/');
  };

  // Determine which dashboard to link to based on role
  const getDashboardLink = () => {
    if (isAdmin || isSupervisor) return '/dashboard';
    if (isAgent) return '/agent';
    return null;
  };

  const dashboardLink = getDashboardLink();

  const navItems = [
    { label: 'Início', href: '/', icon: Home },
    { label: 'Minhas Zonas', href: '/my-zones', icon: MapPin },
    ...(dashboardLink ? [{ label: 'Dashboard', href: dashboardLink, icon: LayoutDashboard }] : []),
  ];

  const isLoggedIn = !!user;

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoIcon} alt="Dinheiro em Mão" className="h-9 w-9" />
            <span className="font-bold text-lg text-foreground hidden sm:block">
              Dinheiro em Mão
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Auth button */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:block">Perfil</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-md transition-all"
              >
                Entrar
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            {isLoggedIn && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
              >
                <LogOut className="h-5 w-5" />
                Terminar sessão
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
