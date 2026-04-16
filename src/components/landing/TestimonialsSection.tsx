import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    role: "Jewelry Seller",
    text: "I used to spend 45 minutes per listing trying to figure out tags. Now I do it in under a minute. My views went up 60% in the first month!",
  },
  {
    name: "Marcus T.",
    role: "Vintage Shop Owner",
    text: "ListBoost completely changed how I list products. The titles it generates are so much better than what I was writing on my own. Game changer.",
  },
  {
    name: "Emily R.",
    role: "Handmade Candles",
    text: "As a new Etsy seller, I had no idea about SEO. This tool made it so easy - I just upload a photo and everything is done. Absolutely love it.",
  },
];

const TestimonialsSection = () => (
  <section className="py-20 md:py-28 bg-background">
    <div className="container max-w-5xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">Loved by Etsy Sellers</h2>
      <p className="mt-3 text-center text-muted-foreground text-lg">See what our users have to say</p>

      <div className="mt-14 grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <div key={i} className="bg-card rounded-2xl p-6 shadow-card">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-accent text-accent" />
              ))}
            </div>
            <p className="text-sm text-foreground leading-relaxed">"{t.text}"</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {t.name[0]}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
