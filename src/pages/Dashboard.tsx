import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Sparkles, Trash2, Copy, Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { GeneratedListingSchema, PRODUCT_TYPES, STYLES, TONES, type GeneratedListing } from "@/lib/etsy-listing";
import { useAuth } from "@/components/AuthProvider";

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read the selected image."));
    reader.readAsDataURL(file);
  });

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut, session, user } = useAuth();
  const [generated, setGenerated] = useState(false);
  const [generatedListing, setGeneratedListing] = useState<GeneratedListing | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState<boolean | null>(null);
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

  useEffect(() => {
    const loadTrialStatus = async () => {
      if (!session?.access_token) {
        setHasUsedFreeTrial(null);
        return;
      }

      try {
        const response = await fetch("/api/generate-listing", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load free trial status.");
        }

        setHasUsedFreeTrial(Boolean(payload?.has_used_free_trial));
      } catch {
        setHasUsedFreeTrial(null);
      }
    };

    void loadTrialStatus();
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
      if (hasUsedFreeTrial) {
        throw new Error("You’ve used your free listing. Upgrade to continue.");
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

      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        throw new Error(payload?.error || "Generation failed.");
      }

      const parsedListing = GeneratedListingSchema.parse(payload);
      setGeneratedListing(parsedListing);
      setGenerated(true);
      setHasUsedFreeTrial(true);

      toast({
        title: "Listing generated",
        description: uploadedFileName
          ? "AI generated your Etsy listing using the image, selected product type, and form inputs."
          : "AI generated your Etsy listing using the selected product type and form inputs.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed.";
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

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
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
          {/* Input Panel */}
          <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 space-y-5 h-fit">
            <h2 className="text-lg font-bold text-foreground">Product Details</h2>
            <p className="text-sm text-muted-foreground">
              {user?.email ? `${user.email} • ` : ""}{hasUsedFreeTrial ? "Free listing used" : "1 free listing available"}
            </p>

            {/* Image upload */}
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
              <Button className="flex-1" onClick={handleGenerate} disabled={isGenerating || hasUsedFreeTrial === true}>
                <Sparkles className="h-4 w-4 mr-2" /> {isGenerating ? "Generating..." : "Generate Listing"}
              </Button>
              <Button variant="outline" onClick={handleClear} disabled={isGenerating}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Output Panel */}
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
