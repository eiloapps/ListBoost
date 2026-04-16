import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const FinalCTASection = () => (
  <section className="py-20 md:py-28 bg-background">
    <div className="container max-w-2xl text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-foreground">Ready to Boost Your Etsy Sales?</h2>
      <p className="mt-4 text-lg text-muted-foreground">
        Join thousands of Etsy sellers who save time and get more views with AI-optimized listings.
      </p>
      <Button size="lg" className="mt-8 text-base px-8 h-12" asChild>
        <Link to="/dashboard">Start Generating Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
      </Button>
    </div>
  </section>
);

export default FinalCTASection;
