"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface License {
  id: string;
  state: string;
  licenseType: string;
  licenseNumber: string | null;
  renewalDate: Date | null;
  isActive: boolean;
}

interface Subscription {
  tier: "FREE" | "ESSENTIAL" | "PRO";
  status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "UNPAID";
  stripeCustomerId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export default function SettingsClient({
  user,
  licenses,
  subscription,
}: {
  user: User;
  licenses: License[];
  subscription: Subscription | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [checkoutTier, setCheckoutTier] = useState<"ESSENTIAL" | "PRO" | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");

  // Notification preferences (stub — no backend yet)
  const [renewalReminders, setRenewalReminders] = useState(true);
  const [gapAlerts, setGapAlerts] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isPaidPlan = subscription?.tier === "ESSENTIAL" || subscription?.tier === "PRO";
  const planLabel = subscription ? `${subscription.tier} · ${subscription.status}` : "FREE";

  const startCheckout = async (tier: "ESSENTIAL" | "PRO") => {
    setCheckoutTier(tier);
    setBillingError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "Unable to start checkout");
      window.location.href = data.url;
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Unable to start checkout");
      setCheckoutTier(null);
    }
  };

  const openBillingPortal = async () => {
    setBillingLoading(true);
    setBillingError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "Unable to open billing portal");
      window.location.href = data.url;
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Unable to open billing portal");
      setBillingLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaveSuccess(true);
      router.refresh();
    } catch {
      setSaveError("Failed to save changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLicense = async (id: string) => {
    if (!confirm("Remove this license? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/licenses?id=${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your account and preferences</p>
      </div>

      {/* Profile section */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-900 text-sm">Profile</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Jane Smith"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user.email ?? ""}
              readOnly
              disabled
              className="w-full px-3 py-2 border border-slate-100 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">
              Email is managed by Google Sign-In and cannot be changed here.
            </p>
          </div>

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              ✓ Changes saved
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>

      {/* Billing section */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-900 text-sm">Billing</h2>
          <p className="text-xs text-slate-400 mt-0.5">Upgrade, manage, or verify your ClearCME plan</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current plan</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{planLabel}</p>
            {subscription?.currentPeriodEnd && (
              <p className="mt-1 text-xs text-slate-500">
                Current period ends {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                {subscription.cancelAtPeriodEnd ? " · cancels at period end" : ""}
              </p>
            )}
          </div>

          {isPaidPlan ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openBillingPortal}
                disabled={billingLoading || !subscription?.stripeCustomerId}
                className="inline-flex items-center justify-center rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0D9488] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {billingLoading ? "Opening billing…" : "Manage billing"}
              </button>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Compare plans
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Upgrade when you are ready to track multiple states, unlock AI extraction, and export board-ready reports.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => startCheckout("ESSENTIAL")}
                  disabled={checkoutTier !== null}
                  className="inline-flex items-center justify-center rounded-xl border border-[#0F766E] px-5 py-2.5 text-sm font-semibold text-[#0F766E] transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkoutTier === "ESSENTIAL" ? "Opening checkout…" : "Upgrade to Essential"}
                </button>
                <button
                  type="button"
                  onClick={() => startCheckout("PRO")}
                  disabled={checkoutTier !== null}
                  className="inline-flex items-center justify-center rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0D9488] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkoutTier === "PRO" ? "Opening checkout…" : "Upgrade to Pro"}
                </button>
              </div>
              {subscription?.stripeCustomerId && (
                <button
                  type="button"
                  onClick={openBillingPortal}
                  disabled={billingLoading}
                  className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline disabled:opacity-60"
                >
                  {billingLoading ? "Opening billing…" : "Open billing portal"}
                </button>
              )}
            </div>
          )}

          {billingError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{billingError}</p>
          )}
        </div>
      </section>

      {/* Notification preferences */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-900 text-sm">Notifications</h2>
          <p className="text-xs text-slate-400 mt-0.5">Email reminders — coming soon</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <ToggleRow
            label="Renewal reminders"
            description="Get notified 90, 60, and 30 days before license renewal"
            value={renewalReminders}
            onChange={setRenewalReminders}
            disabled
          />
          <ToggleRow
            label="Compliance gap alerts"
            description="Alerts when mandatory topic hours fall behind"
            value={gapAlerts}
            onChange={setGapAlerts}
            disabled
          />
          <p className="text-xs text-slate-400 pt-1">
            Email notifications are in development. Preferences saved for future use.
          </p>
        </div>
      </section>

      {/* License management */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Medical Licenses</h2>
            <p className="text-xs text-slate-400 mt-0.5">{licenses.length} active license{licenses.length !== 1 ? "s" : ""}</p>
          </div>
          <Link
            href="/dashboard/profile"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add license
          </Link>
        </div>

        {licenses.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-slate-500 mb-4">No licenses added yet.</p>
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Add your first license →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {licenses.map((license) => (
              <div key={license.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900 text-sm">
                    {license.state} — {license.licenseType}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {license.licenseNumber ? `License #${license.licenseNumber}` : "No number on file"}
                    {license.renewalDate && (
                      <>
                        {" · "}Renewal:{" "}
                        {new Date(license.renewalDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteLicense(license.id)}
                  disabled={deletingId === license.id}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {deletingId === license.id ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5 ${
          disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
        } ${value ? "bg-blue-600" : "bg-slate-200"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
