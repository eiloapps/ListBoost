import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from "@/lib/supabase";

interface AuthModalProps {
  mode: "login" | "signup" | null;
  onClose: () => void;
  onSwitch: (mode: "login" | "signup") => void;
}

const AuthModal = ({ mode, onClose, onSwitch }: AuthModalProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!mode) return null;
  const isLogin = mode === "login";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    if (!isLogin && !name) {
      toast({
        title: "Missing information",
        description: "Please enter your full name to create an account.",
        variant: "destructive",
      });
      return;
    }

    if (!email) {
      toast({
        title: "Missing information",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Missing information",
        description: "Please enter your password.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error(getSupabaseConfigError());
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const lowerMessage = error.message.toLowerCase();

          if (lowerMessage.includes("email not confirmed")) {
            throw new Error("Please verify your email before logging in.");
          }

          if (lowerMessage.includes("invalid login credentials")) {
            throw new Error("Incorrect email or password.");
          }

          throw error;
        }

        if (!data.session) {
          throw new Error("Login succeeded but no session was created.");
        }

        toast({
          title: "Logged in",
          description: "Welcome back. Redirecting to your dashboard.",
        });

        onClose();
        navigate("/dashboard");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/?auth=login`,
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        await supabase.auth.signOut();
      }

      toast({
        title: "Verify your email",
        description: "Check your inbox and confirm your email before logging in.",
      });

      onClose();
      navigate(location.pathname === "/" ? "/?auth=login" : "/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      toast({
        title: isLogin ? "Login failed" : "Signup failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!mode} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {isLogin ? "Welcome back" : "Create your account"}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4 pt-2" onSubmit={handleSubmit} noValidate>
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" placeholder="Jane Doe" required={!isLogin} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="........" required />
          </div>
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : isLogin ? "Log in" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" className="text-primary font-medium hover:underline" onClick={() => onSwitch(isLogin ? "signup" : "login")}>
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
