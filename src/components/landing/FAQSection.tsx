import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "How does the generator work?", a: "Simply enter your product details or upload a photo. Our AI analyzes your product and generates an optimized Etsy title, description, and all 13 tags - ready to copy and paste into your listing." },
  { q: "Is this made specifically for Etsy sellers?", a: "Yes! ListBoost is built from the ground up for Etsy. Our AI is trained on Etsy search behavior and best practices to maximize your listing visibility." },
  { q: "Can I use my own product photos?", a: "Absolutely. You can upload a product image and our AI will identify what you're selling, then generate tailored SEO copy based on the visual analysis." },
  { q: "Do I need SEO knowledge to use this?", a: "Not at all. ListBoost handles the SEO research and optimization for you. Just describe your product and we'll do the rest." },
  { q: "Is there a free plan?", a: "Yes. Your first AI-generated Etsy listing is on us, so you can try ListBoost before upgrading." },
];

const FAQSection = () => (
  <section id="faq" className="py-20 md:py-28 bg-secondary/50">
    <div className="container max-w-2xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">Frequently Asked Questions</h2>
      <p className="mt-3 text-center text-muted-foreground text-lg">Got questions? We've got answers.</p>

      <Accordion type="single" collapsible className="mt-12">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left font-medium text-foreground">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQSection;
