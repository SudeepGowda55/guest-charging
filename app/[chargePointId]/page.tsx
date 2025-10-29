"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import PaymentForm from "./PaymentForm";

interface PageProps {
  params: Promise<{
    chargePointId: string;
  }>;
}

export default function ChargingPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const [chargePointId, setChargePointId] = useState<string>("");
  const [connectorId, setConnectorId] = useState<number | null>(null);
  const [tenantId, setTenantId] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Unwrap params and get connector ID from query params
    params.then((resolvedParams) => {
      setChargePointId(resolvedParams.chargePointId);

      // Get connectorId from URL query params (required)
      const connectorIdParam = searchParams.get("connectorId");
      if (!connectorIdParam) {
        setError("Connector ID is required. Please provide ?connectorId= in the URL");
        setLoading(false);
        return;
      }

      const parsedConnectorId = parseInt(connectorIdParam, 10);
      if (isNaN(parsedConnectorId)) {
        setError("Invalid connector ID. Must be a number");
        setLoading(false);
        return;
      }

      setConnectorId(parsedConnectorId);

      // Get tenantId from URL query params (required)
      const tenantIdParam = searchParams.get("tenantId");
      if (!tenantIdParam) {
        setError("Tenant ID is required. Please provide ?tenantId= in the URL");
        setLoading(false);
        return;
      }

      setTenantId(tenantIdParam);

      // Check if payment was successful
      const paymentSuccessParam = searchParams.get("payment_success");
      if (paymentSuccessParam === "true") {
        setPaymentSuccess(true);
        setLoading(false);
      }
    });
  }, [params, searchParams]);

  useEffect(() => {
    if (!chargePointId || connectorId === null || !tenantId) return;

    // Fetch payment intent from backend API
    const initializePayment = async () => {
      try {
        setLoading(true);

        const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://cpms-dev.evnet.xyz";
        const token = localStorage.getItem("authToken"); // Get token from localStorage if needed

        // Call backend API to create payment intent
        // const response = await fetch(`${apiUrl}/guest-charging`, {
        //   method: "POST",
        //   headers: {
        //     "Content-Type": "application/json",
        //     ...(token && { Authorization: `Bearer ${token}` }),
        //   },
        //   body: JSON.stringify({
        //     chargePointId,
        //     connectorId,
        //     tenantId,
        //   }),
        // });

        // if (!response.ok) {
        //   const errorData = await response.json().catch(() => ({}));
        //   throw new Error(errorData.message || "Failed to create payment intent");
        // }

        // const data = await response.json();
        const data = {
          clientSecret: "pi_3SMqlpBuM2vWUvyZ1UrLyK2U_secret_LkVVWkxc0dwvs8CwVzASbWmCC",
        };

        // Assuming the API returns { clientSecret: string, publishableKey: string }
        // Adjust based on your actual API response structure
        if (!data.clientSecret) {
          throw new Error("Invalid response from server - missing client secret");
        }

        setClientSecret(data.clientSecret);

        // Initialize Stripe with publishable key from response or env
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) {
          throw new Error("Stripe publishable key not found");
        }

        setStripePromise(loadStripe(publishableKey));
        setLoading(false);
      } catch (err) {
        console.error("Payment initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize payment");
        setLoading(false);
      }
    };

    initializePayment();
  }, [chargePointId, connectorId, tenantId]);

  // Show success page after payment
  if (paymentSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f9fc] px-4">
        <div className="max-w-md w-full bg-white p-10 rounded-lg shadow-md text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#32325d] mb-2">Payment Authorized!</h2>
            <p className="text-lg text-gray-600 mb-6">Your charging session will start soon</p>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
            <p className="text-blue-800 font-semibold mb-2">
              ⚡ Please keep the connector connected to your EV Vehicle
            </p>
            <p className="text-sm text-blue-700">
              The charging session will begin automatically once the payment is processed.
            </p>
          </div>

          <div className="text-left space-y-2 mb-6 p-4 bg-gray-50 rounded">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Charge Point:</span>
              <span className="font-semibold text-gray-900">{chargePointId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Connector:</span>
              <span className="font-semibold text-gray-900">{connectorId}</span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>You will receive a notification when charging begins.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f9fc]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#5469d4] border-r-transparent mb-4"></div>
          <p className="text-[#32325d]">Loading payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f9fc]">
        <div className="max-w-md bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#5469d4] text-white py-2 px-4 rounded hover:bg-[#4056c7] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret || !stripePromise || connectorId === null) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] py-5 px-5">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: "stripe",
          },
        }}
      >
        <PaymentForm
          chargePointId={chargePointId}
          connectorId={connectorId}
          tenantId={tenantId}
          clientSecret={clientSecret}
        />
      </Elements>
    </div>
  );
}
