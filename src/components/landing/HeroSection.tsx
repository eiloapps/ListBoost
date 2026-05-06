import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => (
  <section className="gradient-hero pt-32 pb-20 md:pt-40 md:pb-28">
    <div className="container text-center max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
        <Sparkles className="h-4 w-4" />
        AI-powered Etsy listing optimization
      </div>
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight text-balance">
        Generate Etsy Titles, Tags & Descriptions in Seconds
      </h1>
      <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
        Upload a product image or enter details and get optimized Etsy listing copy instantly. More clicks, more sales, less guesswork.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button size="lg" className="text-base px-8 h-12" asChild>
          <Link to="/dashboard">Try It Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
        <Button size="lg" variant="outline" className="text-base px-8 h-12" asChild>
          <a href="#demo">See Demo</a>
        </Button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">No credit card required - 3 free credits included</p>
    </div>
  </section>
);

export default HeroSection;
