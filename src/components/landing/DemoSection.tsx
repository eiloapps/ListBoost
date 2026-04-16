import { Upload, ChevronDown, Sparkles, Copy } from "lucide-react";

const DemoSection = () => (
  <section id="demo" className="py-20 md:py-28 bg-background">
    <div className="container max-w-5xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">See It In Action</h2>
      <p className="mt-3 text-center text-muted-foreground text-lg">Here's what your dashboard looks like</p>

      <div className="mt-12 bg-card rounded-2xl shadow-elevated border overflow-hidden">
        <div className="bg-muted/50 px-6 py-3 border-b flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-accent/80" />
          <div className="w-3 h-3 rounded-full bg-primary/60" />
          <span className="ml-4 text-xs text-muted-foreground font-medium">ListBoost - Generator</span>
        </div>

        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
          <div className="p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-sm">Product Details</h3>
            <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
              <Upload className="h-8 w-8 mx-auto mb-2 text-primary/40" />
              <p className="text-sm">Drop product image here</p>
            </div>
            <div className="space-y-3">
              {["Product Type", "Style", "Target Audience"].map((label) => (
                <div key={label} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <div className="flex-1 h-10 rounded-lg gradient-primary flex items-center justify-center text-sm font-medium text-primary-foreground gap-2">
                <Sparkles className="h-4 w-4" /> Generate Listing
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-sm">Generated Output</h3>
            <OutputCard title="SEO Title" content="Handmade Ceramic Mug - Minimalist Pottery Cup, Earthy Stoneware, Gift for Coffee Lovers, Modern Kitchen Decor" />
            <OutputCard title="Description" content="Elevate your morning routine with this beautifully handcrafted ceramic mug. Made from high-quality stoneware clay with a smooth matte finish, this minimalist cup is perfect for coffee, tea, or as a stunning kitchen accent..." />
            <OutputCard title="Tags (13)" content="handmade ceramic mug, pottery coffee cup, minimalist mug, stoneware cup, earthy kitchen decor, gift for coffee lovers, modern pottery, artisan mug, matte ceramic cup, boho kitchen, housewarming gift, unique coffee mug, handcrafted pottery" />
          </div>
        </div>
      </div>
    </div>
  </section>
);

const OutputCard = ({ title, content }: { title: string; content: string }) => (
  <div className="bg-muted/40 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold text-primary">{title}</span>
      <button className="text-muted-foreground hover:text-foreground transition-colors">
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
    <p className="text-sm text-foreground leading-relaxed line-clamp-3">{content}</p>
  </div>
);

export default DemoSection;
