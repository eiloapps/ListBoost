import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "One-time trial",
    desc: "Experience the power of AI-generated Etsy listings with your first creation on us.",
    features: ["1 free listing generation", "SEO-optimized title, description & tags", "Instant copy to clipboard", "Basic support"],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    desc: "For serious Etsy sellers",
    features: ["100 generations / month", "Premium descriptions", "Save listing drafts", "Image-based input", "Priority support"],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Unlimited",
    price: "$29",
    period: "/month",
    desc: "Scale without limits",
    features: ["Unlimited generations", "Everything in Pro", "Priority AI processing", "Bulk generation", "Dedicated support"],
    cta: "Get Unlimited",
    popular: false,
  },
];

const PricingSection = () => (
  <section id="pricing" className="py-20 md:py-28 bg-secondary/50">
    <div className="container max-w-5xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">Simple, Transparent Pricing</h2>
      <p className="mt-3 text-center text-muted-foreground text-lg">Start free. Upgrade when you're ready.</p>

      <div className="mt-14 grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.name} className={`relative bg-card rounded-2xl p-8 shadow-card flex flex-col ${p.popular ? "ring-2 ring-primary" : ""}`}>
            {p.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Most Popular
              </div>
            )}
            <h3 className="font-bold text-foreground text-lg">{p.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-foreground">{p.price}</span>
              <span className="text-muted-foreground text-sm">{p.period}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            <ul className="mt-6 space-y-3 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="mt-8 w-full" variant={p.popular ? "default" : "outline"}>
              {p.cta}
            </Button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
