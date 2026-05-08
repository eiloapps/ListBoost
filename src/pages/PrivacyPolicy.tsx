import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "Information We Collect",
    body: [
      "Account information such as your email address and basic profile details when you sign up or log in.",
      "Product inputs you provide, including listing details, keywords, selected product type, tone, and any product image you upload for generation.",
      "Billing and subscription status provided by our payment processor. We do not store your full payment card details.",
      "Technical information such as device, browser, pages visited, and basic usage events needed to operate and improve ListBoost.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "To create and manage your ListBoost account.",
      "To generate Etsy-focused titles, descriptions, and tags from the inputs you provide.",
      "To manage credits, subscriptions, checkout, fraud prevention, and customer support.",
      "To maintain, secure, debug, and improve the service.",
      "To send account, verification, billing, and service-related messages.",
    ],
  },
  {
    title: "AI Processing",
    body: [
      "ListBoost sends your product inputs and uploaded image, when provided, to an AI provider so the listing can be generated.",
      "Do not upload images or enter information that you do not have the right to use or that includes sensitive personal information.",
    ],
  },
  {
    title: "Service Providers",
    body: [
      "We use trusted providers to run the service, including hosting, authentication, database, AI generation, payments, and email delivery.",
      "These providers may process information only as needed to provide their services to ListBoost.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "We keep account, credit, subscription, and service records for as long as needed to provide ListBoost, comply with legal obligations, resolve disputes, and prevent abuse.",
      "You may request deletion of your account information, subject to records we must keep for legitimate business, security, billing, or legal reasons.",
    ],
  },
  {
    title: "Your Choices",
    body: [
      "You can choose what product details and images you submit for generation.",
      "You can contact us to request access, correction, or deletion of personal information associated with your account.",
      "You can unsubscribe from non-essential emails if we send them in the future. Service and billing emails may still be sent.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use reasonable technical and organizational safeguards to protect information. No online service can guarantee complete security.",
      "You are responsible for keeping your login credentials safe and using a unique password for your account.",
    ],
  },
  {
    title: "Children",
    body: [
      "ListBoost is not intended for children under 13, and we do not knowingly collect personal information from children.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update this Privacy Policy from time to time. If we make material changes, we will update the effective date or provide notice where appropriate.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy questions or requests, contact us at support@listboost.co.",
    ],
  },
];

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b bg-card">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <Link to="/" className="font-bold text-foreground">
          List<span className="text-primary">Boost</span>
        </Link>
      </div>
    </header>

    <main className="container max-w-3xl py-10 md:py-14">
      <p className="text-sm font-medium text-primary">Legal</p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground md:text-4xl">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">Effective date: May 9, 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
        <p>
          ListBoost helps Etsy sellers generate listing copy with AI. This Privacy Policy explains what
          information we collect, how we use it, and the choices you have when using our website and services.
        </p>

        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
            <ul className="list-disc space-y-2 pl-5">
              {section.body.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  </div>
);

export default PrivacyPolicy;
