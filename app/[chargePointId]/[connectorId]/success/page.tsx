"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    chargePointId: string;
    connectorId: string;
  }>;
}

interface ChargingPeriodDimension {
  type: string;
  volume: number;
}

interface ChargingPeriod {
  start_date_time: string;
  dimensions: ChargingPeriodDimension[];
}

interface Price {
  incl_vat: number;
  excl_vat: number;
}

interface SessionData {
  id: string;
  status: string;
  start_date_time: string;
  end_date_time: string;
  last_updated: string;
  charging_transaction_id: number;

  // Energy & Time
  total_energy: number;
  total_time: number;
  meter_start?: number;
  meter_stop?: number;

  // Costs
  currency: string;
  total_cost?: Price;
  total_energy_cost?: Price;
  total_time_cost?: Price;
  total_fixed_cost?: Price;
  total_parking_cost?: Price;

  // Location info
  location_name: string;
  location_address: string;

  // SOC if available
  soc_start?: number;
  soc_stop?: number;

  charging_periods: ChargingPeriod[];
  invoice_reference_id?: string;
  remark?: string;
}

export default function SuccessPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string>("");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [chargePointId, setChargePointId] = useState<string>("");
  const [connectorId, setConnectorId] = useState<string>("");
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState<boolean>(false);
  const [stoppingCharging, setStoppingCharging] = useState<boolean>(false);
  const [showStopModal, setShowStopModal] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setChargePointId(resolvedParams.chargePointId);
      setConnectorId(resolvedParams.connectorId);
    });

    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("No token provided");
      setLoading(false);
      return;
    }
    setToken(tokenParam);
  }, [params, searchParams]);

  useEffect(() => {
    if (!token) return;

    const fetchSessionStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://cpms-stg.evnet.xyz";

        const response = await fetch(`${apiUrl}/guest-charging/chargeSessionStatus`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch charging session status");
        }

        const data = await response.json();
        setSessionData(data);

        // Stop polling if session is completed
        if (data.status === "COMPLETED") {
          setIsPolling(false);
        }
      } catch (err) {
        console.error("Error fetching session status:", err);
        setError(err instanceof Error ? err.message : "Failed to load session status");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionStatus();

    // Poll every 13 seconds if session is active
    let pollInterval: NodeJS.Timeout | null = null;
    if (isPolling) {
      pollInterval = setInterval(fetchSessionStatus, 13000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [token, isPolling]);
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) +
      " | " +
      date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  const formatDuration = (hours: number) => {
    const totalSeconds = Math.floor(hours * 3600);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  };

  const calculateProgress = () => {
    if (!sessionData?.soc_start || !sessionData?.soc_stop) return 0;
    return sessionData.soc_stop;
  };

  const handleStopClick = () => {
    setShowStopModal(true);
  };

  const confirmStopCharging = async () => {
    if (!token || stoppingCharging) return;

    setShowStopModal(false);
    setStoppingCharging(true);
    setShowCompletionModal(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://cpms-stg.evnet.xyz";

      const response = await fetch(`${apiUrl}/guest-charging/stop-charging`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to stop charging session");
      }

      const result = await response.json();

      // Stop polling and refresh session data immediately
      setIsPolling(false);

      // Trigger a final fetch to update the session status
      const statusResponse = await fetch(`${apiUrl}/guest-charging/chargeSessionStatus`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (statusResponse.ok) {
        const data = await statusResponse.json();
        setSessionData(data);
      }

      // Keep completion modal open for 2 seconds then show summary
      setTimeout(() => {
        setShowCompletionModal(false);
        setShowSummary(true);
      }, 2000);
    } catch (err) {
      console.error("Error stopping charging session:", err);
      setShowCompletionModal(false);
      alert(
        err instanceof Error ? err.message : "Failed to stop charging session. Please try again."
      );
    } finally {
      setStoppingCharging(false);
    }
  };

  const downloadInvoice = async () => {
    if (!token || downloadingInvoice) return;

    setDownloadingInvoice(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://cpms-stg.evnet.xyz";

      const response = await fetch(`${apiUrl}/guest-charging/invoice`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download invoice");
      }

      // Get the HTML content
      const htmlContent = await response.text();

      // Create a blob from the HTML content
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice_${sessionData?.invoice_reference_id || "session"}.html`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading invoice:", err);
      alert("Failed to download invoice. Please try again.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-700 text-lg">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 text-red-600"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <p className="text-gray-600">No session data available</p>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="p-2">
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Charging Session</h1>
          <button className="p-2">
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
              <span className="text-sm font-medium text-blue-600">Online</span>
            </div>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700 uppercase">
              {sessionData.status}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div>
                <p className="font-semibold text-gray-900">{sessionData.location_name}</p>
                <p className="text-sm text-gray-600">Station: {chargePointId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Circle */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            {/* Circular Progress */}
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-700"
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
            </div>

            {/* Progress Info */}
            <div className="flex-1 ml-6">
              <div className="text-4xl font-bold text-gray-900">{progress}%</div>
              <div className="text-sm text-gray-600 mt-1">Completed</div>
              {sessionData.invoice_reference_id && (
                <div className="text-xs text-gray-500 mt-2">{sessionData.invoice_reference_id}</div>
              )}
            </div>
          </div>
        </div>

        {/* Time and Duration Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-gray-600">Start Time</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(sessionData.start_date_time)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-gray-600">Duration (hh:mm:ss)</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatDuration(sessionData.total_time)}
            </div>
          </div>
        </div>

        {/* Energy and Cost Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-blue-600"
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
              <span className="text-sm text-gray-600">Energy Consumed</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {sessionData.total_energy.toFixed(2)} <span className="text-lg font-normal">kWh</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-gray-600">Cost</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {sessionData.currency}
              {sessionData.total_cost?.incl_vat.toFixed(2) || "0.00"}
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="flex items-center gap-2 text-sm text-gray-600 px-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>
            Last updated at {formatDate(sessionData.last_updated || sessionData.start_date_time)}
          </span>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {sessionData.status === "COMPLETED" ? (
            // Show Download Invoice button when session is completed
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-sm text-green-800 text-center font-medium">
                  ✓ Charging session completed successfully
                </p>
              </div>
              <button
                onClick={downloadInvoice}
                disabled={downloadingInvoice}
                className="w-full bg-blue-600 text-white rounded-xl py-4 flex items-center justify-center gap-2 font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingInvoice ? (
                  <>
                    <svg
                      className="w-6 h-6 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download Invoice
                  </>
                )}
              </button>
            </>
          ) : (
            // Show Stop Charging button when session is active
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-800 text-center">
                  Do not unplug connector before stopping
                </p>
              </div>
              <button
                onClick={handleStopClick}
                disabled={stoppingCharging}
                className="w-full bg-red-600 text-white rounded-xl py-4 flex items-center justify-center gap-2 font-semibold text-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stoppingCharging ? (
                  <>
                    <svg
                      className="w-6 h-6 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Stopping...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                    Stop Charging
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stop Charging Confirmation Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
              Are you sure want to stop your Charging session?
            </h3>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStopModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStopCharging}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Stop Charging
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charging Session Completed Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-12 h-12 text-blue-600"
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">Charging Session Completed</h3>
              <p className="text-gray-600 mb-4">Calculating final charges...</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Connecting to server...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Summary Screen */}
      {showSummary && sessionData && (
        <div className="fixed inset-0 bg-gray-50 z-50 overflow-auto">
          <div className="min-h-screen pb-24">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
              <div className="max-w-2xl mx-auto flex items-center justify-between">
                <button onClick={() => setShowSummary(false)} className="p-2">
                  <svg
                    className="w-6 h-6 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h1 className="text-lg font-semibold text-gray-900">Session</h1>
                <div className="w-10"></div>
              </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
              {/* Location Card */}
              <div className="bg-gray-100 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{sessionData.location_name}</h3>
                <p className="text-sm text-gray-600">
                  01-08-2025 | {formatTime(sessionData.start_date_time)}
                </p>
                <p className="text-sm text-gray-600">{chargePointId}</p>
              </div>

              {/* Total Cost Card */}
              <div className="bg-linear-to-r from-blue-500 to-teal-500 rounded-xl p-6 text-white">
                <p className="text-sm mb-2">Total Cost</p>
                <p className="text-4xl font-bold">
                  {sessionData.currency}
                  {sessionData.total_cost?.incl_vat.toFixed(2) || "0.00"}
                </p>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Current Charging Cost</span>
                  <div className="flex items-center gap-2">
                    {stoppingCharging && (
                      <svg
                        className="w-4 h-4 animate-spin text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    )}
                    <span className="font-semibold text-gray-900">
                      {sessionData.currency}
                      {sessionData.total_energy_cost?.incl_vat.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-700">Energy Charges</span>
                  <span className="font-semibold text-gray-900">{sessionData.currency}0.00</span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-700">Time Charges</span>
                  <span className="font-semibold text-gray-900">{sessionData.currency}0.00</span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-700">Parking Charges</span>
                  <span className="font-semibold text-gray-900">{sessionData.currency}0.00</span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-700">Fixed Charges</span>
                  <span className="font-semibold text-gray-900">
                    {sessionData.currency}
                    {sessionData.total_fixed_cost?.incl_vat.toFixed(2) || "0.00"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-700">Charging Duration</span>
                  <span className="font-semibold text-gray-900">
                    {formatDuration(sessionData.total_time)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-700">Idle Duration</span>
                  <span className="font-semibold text-gray-900">00:00:00</span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-700">Tax, Excl Battery levy</span>
                  <span className="font-semibold text-gray-900">{sessionData.currency}0.00</span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-700">Energy Added</span>
                  <span className="font-semibold text-gray-900">
                    {sessionData.total_energy.toFixed(2)} kWh
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-700">Roam Costs</span>
                  <span className="font-semibold text-gray-900">{sessionData.currency}0</span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-700">Roam Discount</span>
                  <span className="font-semibold text-gray-900">{sessionData.currency}0</span>
                </div>
              </div>

              {/* Invoice Preview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-sm text-gray-600 text-center mb-3">
                  Session has been stopped successfully
                </p>
                <div className="bg-gray-100 rounded-lg p-4 h-40 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Invoice Preview</p>
                </div>
              </div>
            </div>

            {/* Bottom Continue Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
              <div className="max-w-2xl mx-auto">
                <button
                  onClick={() => {
                    setShowSummary(false);
                    // Optionally navigate to home or reset
                  }}
                  className="w-full bg-blue-600 text-white rounded-xl py-4 font-semibold text-lg hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
