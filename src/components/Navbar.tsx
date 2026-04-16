import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import AuthModal from "./AuthModal";
import { useAuth } from "./AuthProvider";
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const authParam = searchParams.get("auth");
  const authModal = authParam === "login" || authParam === "signup" ? authParam : null;
  const { isAuthenticated, signOut, user, loading } = useAuth();
  const { toast } = useToast();

  const links = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  const setAuthModal = (mode: "login" | "signup" | null) => {
    const nextParams = new URLSearchParams(searchParams);

    if (mode) {
      nextParams.set("auth", mode);
    } else {
      nextParams.delete("auth");
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been signed out.",
    });
    setMobileOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-foreground">
            List<span className="text-primary">Boost</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {loading ? "Checking session..." : isAuthenticated ? `Signed in${user?.email ? ` as ${user.email}` : ""}` : "Not logged in"}
            </span>
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button size="sm" onClick={() => void handleSignOut()}>Log out</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setAuthModal("login")}>Log in</Button>
                <Button size="sm" onClick={() => setAuthModal("signup")}>Get Started</Button>
              </>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t bg-background px-4 pb-4 pt-2 space-y-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="block text-sm font-medium text-muted-foreground py-2" onClick={() => setMobileOpen(false)}>
                {l.label}
              </a>
            ))}
            <div className="text-xs text-muted-foreground">
              {loading ? "Checking session..." : isAuthenticated ? "Signed in" : "Not logged in"}
            </div>
            <div className="flex gap-2 pt-2">
              {isAuthenticated ? (
                <>
                  <Button variant="ghost" size="sm" className="flex-1" asChild>
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => void handleSignOut()}>Log out</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setAuthModal("login"); setMobileOpen(false); }}>Log in</Button>
                  <Button size="sm" className="flex-1" onClick={() => { setAuthModal("signup"); setMobileOpen(false); }}>Get Started</Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSwitch={(m) => setAuthModal(m)} />
    </>
  );
};

export default Navbar;
