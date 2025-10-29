"use client";

import { useState, useEffect, FormEvent } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";

interface PaymentFormProps {
  chargePointId: string;
  connectorId: number;
  tenantId: string;
  clientSecret: string;
}

export default function PaymentForm({
  chargePointId,
  connectorId,
  tenantId,
  clientSecret,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error" | "processing" | "">("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Check if returning from 3DS authentication
    const checkPaymentStatus = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntentClientSecret = urlParams.get("payment_intent_client_secret");

      if (!paymentIntentClientSecret) {
        return; // Not returning from 3DS authentication
      }

      setMessage("⏳ Verifying payment...");
      setMessageType("processing");
      setIsProcessing(true);

      try {
        const { paymentIntent, error } = await stripe.retrievePaymentIntent(
          paymentIntentClientSecret
        );

        if (error) {
          setMessage(`Verification failed: ${error.message}`);
          setMessageType("error");
          setIsProcessing(false);
          return;
        }

        if (paymentIntent) {
          if (paymentIntent.status === "requires_capture") {
            handlePaymentSuccess(paymentIntent);
          } else if (paymentIntent.status === "processing") {
            setMessage("⏳ Payment is still processing...");
            setMessageType("processing");
          } else if (paymentIntent.status === "requires_payment_method") {
            setMessage("Authentication failed. Please try again with a different card.");
            setMessageType("error");
            setIsProcessing(false);
          } else {
            setMessage(`Payment status: ${paymentIntent.status}`);
            setMessageType("error");
          }
        }
      } catch (err) {
        setMessage("Failed to verify payment status.");
        setMessageType("error");
        console.error("Verification error:", err);
      }
    };

    checkPaymentStatus();
  }, [stripe]);

  const handlePaymentSuccess = (paymentIntent: any) => {
    const amount = (paymentIntent.amount / 100).toFixed(2);
    const currency = paymentIntent.currency.toUpperCase();

    setMessage(
      `✓ Payment Authorized Successfully!\nPayment Intent: ${paymentIntent.id}\nAmount: ${amount} ${currency}\nStatus: ${paymentIntent.status}`
    );
    setMessageType("success");

    console.log("=== Payment Authorized ===");
    console.log("Charge Point ID:", chargePointId);
    console.log("Connector ID:", connectorId);
    console.log("Tenant ID:", tenantId);
    console.log("Payment Intent ID:", paymentIntent.id);
    console.log("Status:", paymentIntent.status);
    console.log("Amount:", paymentIntent.amount);
    console.log("Currency:", paymentIntent.currency);
    console.log("========================");

    // Redirect to success page with all params preserved
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("payment_success", "true");
    currentUrl.searchParams.set("payment_intent", paymentIntent.id);
    // Keep connectorId and tenantId in the URL
    if (!currentUrl.searchParams.has("connectorId")) {
      currentUrl.searchParams.set("connectorId", connectorId.toString());
    }
    if (!currentUrl.searchParams.has("tenantId")) {
      currentUrl.searchParams.set("tenantId", tenantId);
    }
    window.location.href = currentUrl.toString();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage("");
    setMessageType("");

    try {
      const { paymentIntent, error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          setMessage(error.message || "An error occurred");
        } else {
          setMessage("An unexpected error occurred. Please try again.");
        }
        setMessageType("error");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "requires_capture") {
        handlePaymentSuccess(paymentIntent);
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "processing") {
        setMessage("⏳ Payment is processing. Please wait...");
        setMessageType("processing");
      }
    } catch (err) {
      setMessage("An error occurred. Please try again.");
      setMessageType("error");
      console.error("Payment error:", err);
      setIsProcessing(false);
    }
  };

  const getMessageClassName = () => {
    const baseClass = "mt-5 p-3 rounded text-sm leading-relaxed";
    switch (messageType) {
      case "success":
        return `${baseClass} bg-[#d4edda] text-[#155724] border border-[#c3e6cb]`;
      case "error":
        return `${baseClass} bg-[#f8d7da] text-[#721c24] border border-[#f5c6cb]`;
      case "processing":
        return `${baseClass} bg-[#fff3cd] text-[#856404] border border-[#ffeeba]`;
      default:
        return "";
    }
  };

  return (
    <div className="max-w-[500px] mx-auto my-12 bg-white p-10 rounded-lg shadow-md">
      <h2 className="text-[#32325d] mb-6 text-2xl font-semibold">💳 Enter Payment Details</h2>

      <div className="mt-5 p-3 bg-[#e7f3ff] border-l-4 border-[#2196f3] text-sm text-[#0c5460]">
        <strong>Test Mode:</strong> Use card <code>4242 4242 4242 4242</code> with any future expiry
        and CVC.
      </div>

      <form onSubmit={handleSubmit}>
        <div className="my-6">
          <PaymentElement />
        </div>

        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements || messageType === "success"}
          className={`w-full py-3.5 px-6 border-none rounded cursor-pointer text-base font-semibold transition-colors duration-300 ${
            messageType === "success"
              ? "bg-[#28a745] text-white cursor-not-allowed"
              : isProcessing || !stripe || !elements
              ? "bg-[#cbd5e0] cursor-not-allowed text-white"
              : "bg-[#5469d4] text-white hover:bg-[#4056c7]"
          }`}
        >
          {messageType === "success"
            ? "✓ Payment Authorized"
            : isProcessing
            ? "Processing..."
            : "Authorize Payment"}
        </button>

        {message && (
          <div className={getMessageClassName()}>
            {message.split("\n").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          Charge Point ID: <strong>{chargePointId}</strong>
        </p>
        <p>
          Connector ID: <strong>{connectorId}</strong>
        </p>
      </div>
    </div>
  );
}
