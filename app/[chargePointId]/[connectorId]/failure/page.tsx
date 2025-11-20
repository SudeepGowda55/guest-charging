"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    chargePointId: string;
    connectorId: string;
  }>;
}

export default function FailurePage({ params }: PageProps) {
  const [chargePointId, setChargePointId] = useState<string>("");
  const [connectorId, setConnectorId] = useState<string>("");

  useEffect(() => {
    params.then((resolvedParams) => {
      setChargePointId(resolvedParams.chargePointId);
      setConnectorId(resolvedParams.connectorId);
    });
  }, [params]);

  return (
    <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-orange-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-green-500 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">Elocity</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-16 h-16 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            Payment Unsuccessful
          </h1>

          {/* Message */}
          <p className="text-lg text-gray-600 text-center mb-8">
            We couldn't process your payment. Don't worry, no charges have been made to your
            account.
          </p>

          {/* Session Info */}
          {chargePointId && connectorId && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h2 className="text-sm font-semibold text-gray-600 mb-3 text-center">
                Session Details
              </h2>
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Charge Point</p>
                  <p className="text-xl font-bold text-gray-900">{chargePointId}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Connector</p>
                  <p className="text-xl font-bold text-gray-900">#{connectorId}</p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg mb-8">
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                <svg
                  className="w-6 h-6 text-blue-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">What to do next?</h3>
                <p className="text-sm text-blue-800">
                  Please rescan the QR code at the charging station and complete the payment again
                  to start your charging session.
                </p>
              </div>
            </div>
          </div>

          {/* Common Reasons */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">
              Common Reasons for Payment Failure
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <p className="text-sm text-gray-700">Insufficient funds in your account</p>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <p className="text-sm text-gray-700">Card details entered incorrectly</p>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <p className="text-sm text-gray-700">Card expired or blocked</p>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <p className="text-sm text-gray-700">Payment cancelled during authorization</p>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <p className="text-sm text-gray-700">Network connectivity issues</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={
                chargePointId && connectorId ? `/${chargePointId}?connectorId=${connectorId}` : "/"
              }
              className="flex-1 bg-linear-to-r from-blue-600 to-green-500 text-white text-center py-4 px-6 rounded-lg hover:from-blue-700 hover:to-green-600 transition-all shadow-lg font-semibold"
            >
              Try Payment Again
            </Link>
            <Link
              href="/"
              className="flex-1 bg-gray-100 text-gray-700 text-center py-4 px-6 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
            >
              Return Home
            </Link>
          </div>

          {/* Help Section */}
          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-2">Need help?</p>
            <p className="text-xs text-gray-500">
              If you continue to experience issues, please contact support or try using a different
              payment method.
            </p>
          </div>
        </div>

        {/* QR Code Reminder */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
              <svg
                className="w-7 h-7 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Rescan the QR Code</h3>
              <p className="text-sm text-gray-600">
                To initiate a new charging session, please scan the QR code displayed on the
                charging station. This will direct you to the payment page where you can complete
                your transaction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
