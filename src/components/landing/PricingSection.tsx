import { useNavigate, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "3 credits total",
    desc: "Start free and generate your first Etsy listings before you upgrade.",
    features: [
      "3 listing generations total",
      "SEO-optimized title, description & tags",
      "Instant copy to clipboard",
      "Basic support",
    ],
    cta: "Go to Dashboard",
    popular: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "50 credits / month",
    desc: "For sellers who want reliable monthly listing output without hitting limits too quickly.",
    features: [
      "50 listing generations each month",
      "Image + structured input generation",
      "Premium Etsy SEO copy",
      "Fast monthly credit reset",
      "Priority support",
    ],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Unlimited",
    price: "$29",
    period: "unlimited / month",
    desc: "For high-volume shops that want always-on generation with no monthly cap.",
    features: [
      "Unlimited listing generations",
      "Everything in Pro",
      "No credit decrement on generate",
      "Best fit for large catalogs",
      "Dedicated support",
    ],
    cta: "Get Unlimited",
    popular: false,
  },
] as const;

const PricingSection = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, session, loading } = useAuth();

  const openAuthModal = (mode: "login" | "signup") => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("auth", mode);
    setSearchParams(nextParams, { replace: true });
  };

  const requireSignInForUpgrade = () => {
    toast({
      title: "Sign in required",
      description: "Please sign in to upgrade your plan.",
      variant: "destructive",
    });
    openAuthModal("login");
  };

  const handlePaidCheckout = async (plan: "pro" | "unlimited") => {
    if (loading) {
      toast({
        title: "Checking session",
        description: "Please wait a moment and try again.",
      });
      return;
    }

    if (!supabase) {
      toast({
        title: "Checkout unavailable",
        description: "Supabase is not configured.",
        variant: "destructive",
      });
      return;
    }

    const {
      data: { session: liveSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      toast({
        title: "Checkout unavailable",
        description: sessionError.message,
        variant: "destructive",
      });
      return;
    }

    const authUser = liveSession?.user ?? user;
    const accessToken = liveSession?.access_token;

    console.info("[pricing-checkout] session available:", Boolean(accessToken));

    if (!authUser || !accessToken) {
      requireSignInForUpgrade();
      return;
    }

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan,
          userId: authUser.id,
          email: authUser.email ?? "",
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        requireSignInForUpgrade();
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to start checkout.");
      }

      if (!payload?.url) {
        throw new Error("Checkout URL was not returned.");
      }

      window.location.href = payload.url;
    } catch (error) {
      toast({
        title: "Checkout unavailable",
        description: error instanceof Error ? error.message : "Unable to start checkout.",
        variant: "destructive",
      });
    }
  };

  return (
    <section id="pricing" className="py-20 md:py-28 bg-secondary/50">
      <div className="container max-w-5xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">
          Simple, Transparent Pricing
        </h2>
        <p className="mt-3 text-center text-muted-foreground text-lg">
          Start free. Upgrade when you're ready.
        </p>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-card rounded-2xl p-8 shadow-card flex flex-col ${
                plan.popular ? "ring-2 ring-primary" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  Most Popular
                </div>
              )}

              <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">
                  {plan.price}
                </span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>

              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                className="mt-8 w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => {
                  if (plan.name === "Free") {
                    navigate("/dashboard");
                    return;
                  }

                  void handlePaidCheckout(plan.name.toLowerCase() as "pro" | "unlimited");
                }}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
