import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShoppingBag, Loader2, CheckCircle, Sparkles, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

type CheckoutStep = "shipping" | "payment" | "success";

export default function Checkout() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const { user, isAuthenticated } = useAuth();

  const designRequestId = parseInt(params.get("requestId") ?? "0");
  const imageUrl = params.get("imageUrl") ?? "";
  const productId = parseInt(params.get("productId") ?? "358");
  const variantId = parseInt(params.get("variantId") ?? "0");
  const productName = decodeURIComponent(params.get("productName") ?? "All-Over Print T-Shirt");
  const retailPrice = parseInt(params.get("price") ?? "6900");

  const [step, setStep] = useState<CheckoutStep>("shipping");
  const [paymentIntentId, setPiId] = useState("");
  const [printfulOrderId, setPrintfulOrderId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    address1: "",
    address2: "",
    city: "",
    stateCode: "",
    zip: "",
    countryCode: "US",
  });

  const createPi = trpc.checkout.createPaymentIntent.useMutation({
    onSuccess: (data) => { setPiId(data.paymentIntentId); setStep("payment"); },
    onError: (err) => toast.error("Payment setup failed: " + err.message),
  });

  const confirmOrder = trpc.checkout.confirmAndFulfill.useMutation({
    onSuccess: (data) => { setPrintfulOrderId(data.printfulOrderId); setStep("success"); },
    onError: (err) => toast.error("Order failed: " + err.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
        <Sparkles className="w-12 h-12 mb-4" style={{ color: "oklch(0.72 0.22 340)" }} />
        <h2 className="text-2xl font-bold mb-2">Sign in to complete your order</h2>
        <p className="text-muted-foreground mb-6 text-center">Your design is saved — sign in to checkout.</p>
        <Button
          className="font-bold px-8 py-3"
          style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
          onClick={() => { window.location.href = getLoginUrl(); }}
        >
          Sign In to Continue
        </Button>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
        <div className="max-w-md w-full text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "oklch(0.72 0.22 340 / 0.2)", border: "2px solid oklch(0.72 0.22 340)" }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: "oklch(0.72 0.22 340)" }} />
          </div>
          <h1 className="text-3xl font-black mb-3">Order Confirmed! 🎉</h1>
          <p className="text-muted-foreground mb-2">
            Your custom festival outfit is being printed and ships in 3–5 business days.
          </p>
          {printfulOrderId && (
            <p className="text-sm text-muted-foreground mb-6">Printful Order #{printfulOrderId}</p>
          )}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Your design"
              className="w-48 h-48 object-cover rounded-2xl mx-auto mb-6 border"
              style={{ borderColor: "oklch(0.72 0.22 340 / 0.3)" }}
            />
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/my-designs")}>My Designs</Button>
            <Button
              className="font-bold"
              style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
              onClick={() => navigate("/design-studio")}
            >
              Design Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.address1 || !form.city || !form.stateCode || !form.zip) {
      toast.error("Please fill in all required fields");
      return;
    }
    createPi.mutate({
      amountCents: retailPrice,
      currency: "usd",
      designRequestId,
      productId,
      variantId,
      productName,
      imageUrl,
    });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirmOrder.mutate({
      paymentIntentId,
      designRequestId,
      productId,
      variantId,
      imageUrl,
      recipient: {
        name: form.name,
        email: form.email,
        address1: form.address1,
        address2: form.address2 || undefined,
        city: form.city,
        stateCode: form.stateCode,
        countryCode: form.countryCode,
        zip: form.zip,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "oklch(0.72 0.22 340 / 0.15)" }}
      >
        <button
          onClick={() => navigate(-1 as any)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" style={{ color: "oklch(0.72 0.22 340)" }} />
          <span className="font-bold">Checkout</span>
        </div>
        <div className="w-16" />
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order summary */}
        <div className="order-2 lg:order-1">
          <div
            className="rounded-2xl p-6 border"
            style={{ background: "oklch(0.10 0.02 300)", borderColor: "oklch(0.72 0.22 340 / 0.2)" }}
          >
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" style={{ color: "oklch(0.72 0.22 340)" }} />
              Order Summary
            </h3>
            {imageUrl && (
              <div className="relative mb-4">
                <img src={imageUrl} alt="Your design" className="w-full aspect-square object-cover rounded-xl" />
                <div
                  className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold"
                  style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
                >
                  Custom Design
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{productName}</span>
                <span className="font-semibold">${(retailPrice / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Printing & Production</span>
                <span className="text-green-400">Included</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground">Calculated at fulfillment</span>
              </div>
              <div
                className="border-t pt-3 flex justify-between font-bold"
                style={{ borderColor: "oklch(0.72 0.22 340 / 0.2)" }}
              >
                <span>Total</span>
                <span style={{ color: "oklch(0.72 0.22 340)" }}>${(retailPrice / 100).toFixed(2)}</span>
              </div>
            </div>
            <div
              className="mt-4 p-3 rounded-xl text-xs text-muted-foreground"
              style={{ background: "oklch(0.72 0.22 340 / 0.08)" }}
            >
              <Sparkles className="w-3 h-3 inline mr-1" style={{ color: "oklch(0.72 0.22 340)" }} />
              Printed and fulfilled by Printful. Ships in 3–5 business days.
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="order-1 lg:order-2">
          {step === "shipping" && (
            <form onSubmit={handleShippingSubmit} className="space-y-4">
              <h2 className="text-2xl font-black mb-6">Shipping Details</h2>
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address1">Address *</Label>
                <Input
                  id="address1"
                  value={form.address1}
                  onChange={e => setForm(f => ({ ...f, address1: e.target.value }))}
                  placeholder="Street address"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address2">Apt / Suite (optional)</Label>
                <Input
                  id="address2"
                  value={form.address2}
                  onChange={e => setForm(f => ({ ...f, address2: e.target.value }))}
                  placeholder="Apt, suite, unit"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={form.stateCode}
                    onChange={e => setForm(f => ({ ...f, stateCode: e.target.value.toUpperCase().slice(0, 2) }))}
                    placeholder="CA"
                    maxLength={2}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP *</Label>
                  <Input
                    id="zip"
                    value={form.zip}
                    onChange={e => setForm(f => ({ ...f, zip: e.target.value }))}
                    placeholder="90210"
                    className="mt-1"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full font-bold py-6 text-base"
                style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
                disabled={createPi.isPending}
              >
                {createPi.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting up payment…</>
                  : "Continue to Payment →"}
              </Button>
            </form>
          )}

          {step === "payment" && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <h2 className="text-2xl font-black mb-6">Payment</h2>
              <div
                className="p-4 rounded-xl border mb-4"
                style={{ borderColor: "oklch(0.72 0.22 340 / 0.3)", background: "oklch(0.72 0.22 340 / 0.05)" }}
              >
                <p className="text-sm text-muted-foreground">
                  <Sparkles className="w-3 h-3 inline mr-1" style={{ color: "oklch(0.72 0.22 340)" }} />
                  Secure payment powered by Stripe. Card details are encrypted and never stored.
                </p>
              </div>
              <div>
                <Label>Card Number</Label>
                <Input placeholder="4242 4242 4242 4242" className="mt-1 font-mono" maxLength={19} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Expiry</Label>
                  <Input placeholder="MM / YY" className="mt-1" maxLength={7} />
                </div>
                <div>
                  <Label>CVC</Label>
                  <Input placeholder="123" className="mt-1" maxLength={4} />
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("shipping")}>
                  ← Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 font-bold"
                  style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
                  disabled={confirmOrder.isPending}
                >
                  {confirmOrder.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Placing Order…</>
                    : `Pay $${(retailPrice / 100).toFixed(2)}`}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Orders are non-refundable once sent to print.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
