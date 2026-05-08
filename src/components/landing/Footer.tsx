import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t bg-muted/30 py-12">
    <div className="container">
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <div className="text-lg font-bold text-foreground">List<span className="text-primary">Boost</span></div>
          <p className="mt-2 text-sm text-muted-foreground">AI-powered Etsy SEO tool for smarter listings.</p>
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-sm mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
            <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
            <li><a href="#demo" className="hover:text-foreground transition-colors">Demo</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-sm mb-3">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
            <li><a href="mailto:support@listboost.co" className="hover:text-foreground transition-colors">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-sm mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} ListBoost. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
