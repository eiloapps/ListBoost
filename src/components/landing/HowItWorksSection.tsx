import { Upload, Brain, FileText } from "lucide-react";

const steps = [
  { icon: Upload, title: "Upload or Describe", description: "Add a product image or type in your product details — it takes just seconds." },
  { icon: Brain, title: "AI Analyzes", description: "Our AI engine examines your product and researches top-performing Etsy keywords." },
  { icon: FileText, title: "Get Your Listing", description: "Receive a polished SEO title, description, and 13 tags — ready to copy and paste." },
];

const HowItWorksSection = () => (
  <section className="py-20 md:py-28 bg-background">
    <div className="container max-w-4xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">How It Works</h2>
      <p className="mt-3 text-center text-muted-foreground text-lg">Three simple steps to optimized listings</p>
      <div className="mt-14 grid md:grid-cols-3 gap-10">
        {steps.map((s, i) => (
          <div key={i} className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <s.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="text-xs font-bold text-primary mb-2">Step {i + 1}</div>
            <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
