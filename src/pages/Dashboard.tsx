import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Upload, Sparkles, Trash2, Copy, Check, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GeneratedListingSchema, PRODUCT_TYPES, STYLES, TONES, type GeneratedListing } from "@/lib/etsy-listing";

const NO_CREDITS_MESSAGE = "You've used all your free credits. Upgrade to continue.";

const formatProNoCreditsMessage = (currentPeriodEnd: string | null) => {
  if (!currentPeriodEnd) {
    return "You've used all 50 Pro credits for this billing period. More credits arrive next cycle, or upgrade to Unlimited.";
  }

  const formattedDate = new Date(currentPeriodEnd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `You've used all 50 Pro credits for this billing period. Credits reset on ${formattedDate}, or upgrade to Unlimited.`;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read the selected image."));
    reader.readAsDataURL(file);
  });

const parseApiJsonResponse = async (response: Response, context: string) => {
  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    console.error(`[${context}] Non-JSON response received`, {
      status: response.status,
      contentType,
      bodyPreview: responseText.slice(0, 200),
    });

    throw new Error(
      response.ok
        ? "The server returned a non-JSON response."
        : `The server returned a non-JSON ${response.status} response.`,
    );
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut, session, user } = useAuth();
  const [generated, setGenerated] = useState(false);
  const [generatedListing, setGeneratedListing] = useState<GeneratedListing | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreditsLoading, setIsCreditsLoading] = useState(false);
  const [creditsLoadError, setCreditsLoadError] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState("");
  const [productType, setProductType] = useState("");
  const [style, setStyle] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [occasion, setOccasion] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (uploadedPreviewUrl) {
        URL.revokeObjectURL(uploadedPreviewUrl);
      }
    };
  }, [uploadedPreviewUrl]);

  const loadCreditsStatus = async () => {
    if (!session?.access_token) {
      setIsCreditsLoading(false);
      setCreditsLoadError(null);
      setCreditsRemaining(null);
      setCurrentPlan(null);
      setCurrentPeriodEnd(null);
      return;
    }

    setIsCreditsLoading(true);
    setCreditsLoadError(null);

    try {
      const response = await fetch("/api/generate-listing", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = await parseApiJsonResponse(response, "credits-status");

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to load credits.");
      }

      setCurrentPlan(typeof payload?.plan === "string" ? payload.plan : "free");
      setCreditsRemaining(typeof payload?.credits_remaining === "number" ? payload.credits_remaining : 0);
      setCurrentPeriodEnd(typeof payload?.current_period_end === "string" ? payload.current_period_end : null);
    } catch (error) {
      setCreditsLoadError(
        error instanceof Error ? error.message : "Unable to load your credit status right now.",
      );
    } finally {
      setIsCreditsLoading(false);
    }
  };

  useEffect(() => {
    void loadCreditsStatus();
  }, [session?.access_token]);

  const handleLogout = async () => {
    await signOut();
    navigate("/?auth=login");
  };

  const handleGenerate = async () => {
    if (!productType) {
      toast({
        title: "Select a product type",
        description: "Choose a product type so the AI can generate the listing in the correct Etsy category style.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const knowsCreditsAreExhausted =
        !isCreditsLoading &&
        !creditsLoadError &&
        currentPlan !== "unlimited" &&
        creditsRemaining === 0;

      if (knowsCreditsAreExhausted) {
        throw new Error("NO_CREDITS");
      }

      const imageDataUrl = uploadedFile ? await readFileAsDataUrl(uploadedFile) : "";

      const response = await fetch("/api/generate-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          productType,
          style,
          targetAudience,
          occasion,
          keywords,
          tone,
          imageFilename: uploadedFileName,
          imageDataUrl,
        }),
      });

      const payload = await parseApiJsonResponse(response, "generate-listing");

      if (!response.ok) {
        const message = payload?.error === "NO_CREDITS"
          ? payload?.message || "NO_CREDITS"
          : payload?.error || "Generation failed.";
        throw new Error(message);
      }

      const parsedListing = GeneratedListingSchema.parse(payload);
      setGeneratedListing(parsedListing);
      setGenerated(true);

      if (currentPlan !== "unlimited" && creditsRemaining !== null) {
        setCreditsRemaining((current) => Math.max((current ?? 0) - 1, 0));
      }

      toast({
        title: "Listing generated",
        description: uploadedFileName
          ? "AI generated your Etsy listing using the image, selected product type, and form inputs."
          : "AI generated your Etsy listing using the selected product type and form inputs.",
      });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Generation failed.";
      const message = rawMessage === "NO_CREDITS"
        ? currentPlan === "pro"
          ? formatProNoCreditsMessage(currentPeriodEnd)
          : NO_CREDITS_MESSAGE
        : rawMessage;

      setGenerated(false);
      setGeneratedListing(null);
      toast({
        title: "Generation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setGenerated(false);
    setGeneratedListing(null);
    setProductType("");
    setStyle("");
    setTargetAudience("");
    setOccasion("");
    setKeywords("");
    setTone("");
    setUploadedFile(null);
    if (uploadedPreviewUrl) {
      URL.revokeObjectURL(uploadedPreviewUrl);
    }
    setUploadedFileName("");
    setUploadedPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Unsupported file",
        description: "Please upload a PNG, JPG, JPEG, or WEBP image.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (uploadedPreviewUrl) {
      URL.revokeObjectURL(uploadedPreviewUrl);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setUploadedFile(file);
    setUploadedFileName(file.name);
    setUploadedPreviewUrl(nextPreviewUrl);

    toast({
      title: "Image uploaded",
      description: `${file.name} is ready for AI analysis.`,
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
    setTimeout(() => setCopied(null), 2000);
  };

  const statusText = currentPlan === "unlimited"
    ? "Unlimited plan active"
    : isCreditsLoading
      ? "Loading credit status..."
      : creditsLoadError
        ? "Credit status unavailable right now"
        : currentPlan === "pro" && creditsRemaining !== null
          ? `${creditsRemaining} Pro credits left this month`
          : currentPlan === "free" && creditsRemaining !== null
            ? `${creditsRemaining} free credits remaining`
            : "Credit status unavailable";

  const isGenerateDisabled =
    isGenerating ||
    (!isCreditsLoading &&
      !creditsLoadError &&
      currentPlan !== "unlimited" &&
      creditsRemaining === 0);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="font-bold text-foreground">List<span className="text-primary">Boost</span></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">Generator</div>
            <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>Log out</Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 space-y-5 h-fit">
            <h2 className="text-lg font-bold text-foreground">Product Details</h2>
            <p className="text-sm text-muted-foreground">
              {user?.email ? `${user.email} - ` : ""}
              {statusText}
            </p>

            {creditsLoadError && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p>We couldn't load your credit status. You can still try generating, or retry now.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void loadCreditsStatus()}
                  disabled={isCreditsLoading}
                >
                  {isCreditsLoading ? "Retrying..." : "Retry credit check"}
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              id="product-image-upload"
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={handleImageSelect}
            />
            <label htmlFor="product-image-upload" className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors">
              {uploadedPreviewUrl ? (
                <img src={uploadedPreviewUrl} alt={uploadedFileName || "Uploaded product preview"} className="mx-auto mb-2 max-h-40 rounded-lg object-cover" />
              ) : (
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">Click or drag to upload product image</p>
              <p className="text-xs text-muted-foreground mt-1">{uploadedFileName || "PNG, JPG up to 5MB"}</p>
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Type</Label>
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                  <SelectContent>
                    {STYLES.map((styleOption) => (
                      <SelectItem key={styleOption} value={styleOption}>{styleOption}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Input value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} placeholder="e.g. Coffee lovers, moms" />
              </div>
              <div className="space-y-2">
                <Label>Occasion / Use Case</Label>
                <Input value={occasion} onChange={(event) => setOccasion(event.target.value)} placeholder="e.g. Birthday gift, home decor" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Keywords (optional)</Label>
              <Input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="e.g. handmade, ceramic, matte" />
            </div>

            <div className="space-y-2">
              <Label>Tone of Voice</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue placeholder="Select tone" /></SelectTrigger>
                <SelectContent>
                  {TONES.map((toneOption) => (
                    <SelectItem key={toneOption} value={toneOption}>{toneOption}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1"
                onClick={handleGenerate}
                disabled={isGenerateDisabled}
              >
                <Sparkles className="h-4 w-4 mr-2" /> {isGenerating ? "Generating..." : "Generate Listing"}
              </Button>
              <Button variant="outline" onClick={handleClear} disabled={isGenerating}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {isGenerating ? (
              <div className="bg-card rounded-2xl shadow-card p-12 text-center">
                <Sparkles className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="font-semibold text-foreground">Generating your Etsy listing</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {uploadedFileName
                    ? "Analyzing the image and product inputs, then building SEO-focused copy."
                    : "Using your product inputs to build SEO-focused Etsy copy."}
                </p>
              </div>
            ) : !generated || !generatedListing ? (
              <div className="bg-card rounded-2xl shadow-card p-12 text-center">
                <Sparkles className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="font-semibold text-foreground">Your listing will appear here</h3>
                <p className="text-sm text-muted-foreground mt-2">Fill in your product details and click Generate</p>
              </div>
            ) : (
              <>
                <OutputCard
                  label="SEO Title"
                  content={generatedListing.seo_title}
                  onCopy={() => copyToClipboard(generatedListing.seo_title, "SEO Title")}
                  isCopied={copied === "SEO Title"}
                />
                <OutputCard
                  label="Product Description"
                  content={generatedListing.description}
                  onCopy={() => copyToClipboard(generatedListing.description, "Description")}
                  isCopied={copied === "Description"}
                  multiline
                />
                <div className="bg-card rounded-2xl shadow-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-primary">Etsy Tags (13)</span>
                    <button
                      className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-xs"
                      onClick={() => copyToClipboard(generatedListing.tags.join(", "), "Tags")}
                    >
                      {copied === "Tags" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === "Tags" ? "Copied" : "Copy all"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {generatedListing.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const OutputCard = ({ label, content, onCopy, isCopied, multiline }: {
  label: string; content: string; onCopy: () => void; isCopied: boolean; multiline?: boolean;
}) => (
  <div className="bg-card rounded-2xl shadow-card p-6">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-semibold text-primary">{label}</span>
      <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-xs" onClick={onCopy}>
        {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {isCopied ? "Copied" : "Copy"}
      </button>
    </div>
    <p className={`text-sm text-foreground leading-relaxed ${multiline ? "whitespace-pre-line" : ""}`}>{content}</p>
  </div>
);

export default Dashboard;
