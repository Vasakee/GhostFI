"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GhostLogo } from "@/components/GhostLogo";
import { ShieldCheck, CreditCard, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const intentId = searchParams.get("intent");
  
  const [loading, setLoading] = useState(true);
  const [intent, setIntent] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!intentId) return;
    // In a real app, we'd fetch the intent details from our API
    // For this mock, we'll just show the intent ID
    setLoading(false);
  }, [intentId]);

  async function handlePayment() {
    setProcessing(true);
    try {
      const res = await fetch("/api/webhook/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId, status: "success" }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        alert("Payment failed. Please try again.");
      }
    } catch (e) {
      alert("Error processing payment.");
    }
    setProcessing(false);
  }

  if (!intentId) return <div className="min-h-screen flex items-center justify-center">Invalid intent.</div>;

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md glass rounded-3xl border border-white/10 p-8 flex flex-col items-center gap-6">
        <GhostLogo size={40} />
        
        {!success ? (
          <>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white mb-1">Secure Checkout</h1>
              <p className="text-gray-400 text-sm">Fund your GhostFi account via Fiat</p>
            </div>

            <div className="w-full bg-white/5 rounded-2xl p-5 border border-white/5 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Purchase</span>
                <span className="text-white font-semibold">USDC (Solana Mainnet)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Gas Setup Fee</span>
                <span className="text-white font-semibold">Included</span>
              </div>
              <div className="h-px bg-white/5 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-medium">Total to Pay</span>
                <span className="text-2xl font-bold text-purple-400">$...</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full btn-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 group"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Simulate Payment <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest flex items-center justify-center gap-1">
                <ShieldCheck size={12} /> Secure 256-bit Encrypted Payment
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Payment Successful!</h2>
              <p className="text-gray-400 text-sm">Your USDC and SOL are being sent to your bot wallet. You will receive a notification shortly.</p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition"
            >
              Back to GhostFi
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
