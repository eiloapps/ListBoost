import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "Using ListBoost",
    body: [
      "You must provide accurate account information and keep your login credentials secure.",
      "You are responsible for the product details, keywords, images, and other content you submit.",
      "You may use generated listings for your own Etsy shop or business, subject to your compliance with Etsy rules and applicable law.",
      "You may not use ListBoost for unlawful, abusive, misleading, infringing, or harmful activity.",
    ],
  },
  {
    title: "AI-Generated Content",
    body: [
      "ListBoost uses AI to generate listing titles, descriptions, and tags from the inputs you provide.",
      "AI output may be inaccurate, incomplete, or unsuitable for your specific product. You are responsible for reviewing and editing generated content before publishing it.",
      "We do not guarantee that generated content will improve search ranking, traffic, sales, or marketplace performance.",
    ],
  },
  {
    title: "Images and Product Inputs",
    body: [
      "You must have the right to upload and use any image or product information you submit.",
      "Do not submit private, sensitive, illegal, or third-party content unless you have permission to use it.",
      "You are responsible for ensuring your listings accurately describe your products.",
    ],
  },
  {
    title: "Accounts, Credits, and Subscriptions",
    body: [
      "Free and paid usage limits may apply based on your plan.",
      "Credits, subscriptions, and plan features may change as we improve the service.",
      "Paid subscriptions are processed by our payment provider. We do not store your full payment card details.",
      "If a payment fails, subscription access may be limited or suspended.",
    ],
  },
  {
    title: "Refunds and Cancellations",
    body: [
      "You can cancel a subscription according to the checkout or billing portal made available to you.",
      "Refund eligibility, if any, may depend on payment provider rules, usage, and applicable consumer laws.",
      "Contact support@listboost.co for billing questions.",
    ],
  },
  {
    title: "Intellectual Property",
    body: [
      "ListBoost, including its branding, design, software, and service features, belongs to ListBoost or its licensors.",
      "You retain responsibility for your own submitted content.",
      "You may not copy, reverse engineer, resell, or misuse the service or its underlying technology.",
    ],
  },
  {
    title: "Service Availability",
    body: [
      "We aim to keep ListBoost reliable, but the service may be interrupted, changed, or unavailable from time to time.",
      "We may update, suspend, or discontinue parts of the service when needed for maintenance, security, legal, or business reasons.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "ListBoost is provided as a tool to assist with listing creation. You use it at your own discretion.",
      "To the fullest extent permitted by law, we are not liable for lost profits, lost data, marketplace actions, ranking changes, or indirect damages.",
    ],
  },
  {
    title: "Changes to These Terms",
    body: [
      "We may update these Terms from time to time. If we make material changes, we will update the effective date or provide notice where appropriate.",
      "Continued use of ListBoost after changes means you accept the updated Terms.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For questions about these Terms, contact us at support@listboost.co.",
    ],
  },
];

const TermsOfService = () => (
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
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground md:text-4xl">Terms of Service</h1>
      <p className="mt-3 text-sm text-muted-foreground">Effective date: May 9, 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
        <p>
          These Terms of Service govern your access to and use of ListBoost. By creating an account,
          purchasing a plan, or using the service, you agree to these Terms.
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

export default TermsOfService;
