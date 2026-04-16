import { Type, FileText, Tags, ImageIcon, Copy, Save, Zap } from "lucide-react";

const features = [
  { icon: Type, title: "SEO Title Generator", desc: "Craft click-worthy titles packed with high-traffic Etsy keywords." },
  { icon: FileText, title: "Description Generator", desc: "Get compelling, SEO-rich product descriptions that convert browsers to buyers." },
  { icon: Tags, title: "Etsy Tag Generator", desc: "All 13 tags optimized for maximum search visibility on Etsy." },
  { icon: ImageIcon, title: "Image-Based Input", desc: "Upload a product photo and let AI identify what you're selling." },
  { icon: Copy, title: "Copy to Clipboard", desc: "One-click copy for titles, descriptions, and tags — paste right into Etsy." },
  { icon: Save, title: "Save Listing Drafts", desc: "Save your generated listings and come back to edit them anytime." },
  { icon: Zap, title: "Fast & Beginner-Friendly", desc: "No SEO expertise needed. Get professional results in under 30 seconds." },
];

const FeaturesSection = () => (
  <section id="features" className="py-20 md:py-28 bg-secondary/50">
    <div className="container">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">Everything You Need</h2>
      <p className="mt-3 text-center text-muted-foreground text-lg max-w-xl mx-auto">Powerful tools designed specifically for Etsy sellers</p>
      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {features.map((f, i) => (
          <div key={i} className="bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-shadow duration-300">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
