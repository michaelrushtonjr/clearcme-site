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

interface RequirementSummary {
  id: string;
  topic: string;
  hoursRequired: number;
  description: string | null;
  firstRenewalOnly: boolean;
  cadence: string;
  intervalYears: number | null;
  lookbackYears: number | null;
  notes: string | null;
}

interface LicenseRequirementGroup {
  licenseId: string;
  state: string;
  licenseType: string;
  requirements: RequirementSummary[];
}

interface RequirementCompletion {
  id: string;
  physicianLicenseId: string | null;
  mandatoryRequirementId: string;
  completedYear: number | null;
  completedAt: Date | null;
  notes: string | null;
}

export default function SettingsClient({
  user,
  licenses,
  subscription,
  licenseRequirements,
  requirementCompletions,
}: {
  user: User;
  licenses: License[];
  subscription: Subscription | null;
  licenseRequirements: LicenseRequirementGroup[];
  requirementCompletions: RequirementCompletion[];
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [checkoutTier, setCheckoutTier] = useState<"ESSENTIAL" | "PRO" | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [savingRequirement, setSavingRequirement] = useState<string | null>(null);
  const [requirementYears, setRequirementYears] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const completion of requirementCompletions) {
      if (!completion.physicianLicenseId) continue;
      initial[`${completion.mandatoryRequirementId}:${completion.physicianLicenseId}`] = completion.completedYear?.toString() ?? "";
    }
    return initial;
  });
  const [requirementError, setRequirementError] = useState("");

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

  const formatTopic = (topic: string) =>
    topic
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());

  const formatCadence = (req: RequirementSummary) => {
    if (req.cadence === "ONE_TIME" || req.firstRenewalOnly) return "One-time";
    if (req.cadence === "FIRST_RENEWAL_ONLY") return "First renewal only";
    if (req.cadence === "INITIAL_LICENSE_ONLY") return "Initial licensure only";
    if (req.cadence === "EVERY_N_YEARS") {
      const years = req.intervalYears ?? req.lookbackYears;
      return years ? `Every ${years} years` : "Recurring long-cycle";
    }
    if (req.cadence === "CONDITIONAL") return "Conditional";
    return "Every renewal";
  };

  const saveRequirementCompletion = async (req: RequirementSummary, licenseId: string, action: "complete" | "clear") => {
    const key = `${req.id}:${licenseId}`;
    setSavingRequirement(key);
    setRequirementError("");
    try {
      const yearRaw = requirementYears[key]?.trim();
      const completedYear = yearRaw ? Number(yearRaw) : null;
      if (yearRaw && (completedYear === null || !Number.isInteger(completedYear) || completedYear < 1950)) {
        throw new Error("Enter a valid completion year, or leave it blank if you only know it was completed.");
      }
      const res = await fetch("/api/requirement-completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mandatoryRequirementId: req.id,
          physicianLicenseId: licenseId,
          completedYear,
          action,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Unable to save requirement history");
      router.refresh();
    } catch (err) {
      setRequirementError(err instanceof Error ? err.message : "Unable to save requirement history");
    } finally {
      setSavingRequirement(null);
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
      <div className="product-page-head">
        <p className="product-page-eye">Account controls</p>
        <h1 className="product-page-title">Settings</h1>
        <p className="product-page-sub">Manage your account and preferences</p>
      </div>

      {/* Profile section */}
      <section className="product-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--line-soft)] bg-[var(--bg-2)]">
          <h2 className="font-display text-xl font-semibold text-[var(--ink)]">Profile</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="px-6 py-5 space-y-4">
          <div>
            <label className="product-label">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Jane Smith"
              className="product-input"
            />
          </div>

          <div>
            <label className="product-label">
              Email
            </label>
            <input
              type="email"
              value={user.email ?? ""}
              readOnly
              disabled
              className="product-input cursor-not-allowed opacity-70"
            />
            <p className="text-xs text-[var(--ink-3)] mt-1">
              Email is managed by Google Sign-In and cannot be changed here.
            </p>
          </div>

          {saveError && (
            <p className="text-sm text-[var(--status-miss)] bg-[var(--status-miss-bg)] px-3 py-2 rounded-[var(--radius-sm)]">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-sm text-[var(--status-met)] bg-[var(--status-met-bg)] px-3 py-2 rounded-[var(--radius-sm)]">
              ✓ Changes saved
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="product-btn product-btn-primary disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>

      {/* Billing section */}
      <section className="product-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--line-soft)] bg-[var(--bg-2)]">
          <h2 className="font-display text-xl font-semibold text-[var(--ink)]">Billing</h2>
          <p className="text-xs text-[var(--ink-3)] mt-0.5">Upgrade, manage, or verify your ClearCME plan</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3">
            <p className="font-mono text-xs font-medium uppercase tracking-wide text-[var(--ink-3)]">Current plan</p>
            <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{planLabel}</p>
            {subscription?.currentPeriodEnd && (
              <p className="mt-1 text-xs text-[var(--ink-3)]">
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
                className="product-btn product-btn-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                {billingLoading ? "Opening billing…" : "Manage billing"}
              </button>
              <Link
                href="/pricing"
                className="product-btn product-btn-secondary"
              >
                Compare plans
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[var(--ink-2)]">
                Upgrade when you are ready to track multiple states, unlock AI extraction, and export board-ready reports.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => startCheckout("ESSENTIAL")}
                  disabled={checkoutTier !== null}
                  className="product-btn product-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkoutTier === "ESSENTIAL" ? "Opening checkout…" : "Upgrade to Essential"}
                </button>
                <button
                  type="button"
                  onClick={() => startCheckout("PRO")}
                  disabled={checkoutTier !== null}
                  className="product-btn product-btn-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkoutTier === "PRO" ? "Opening checkout…" : "Upgrade to Pro"}
                </button>
              </div>
              {subscription?.stripeCustomerId && (
                <button
                  type="button"
                  onClick={openBillingPortal}
                  disabled={billingLoading}
                  className="text-sm font-medium text-[var(--ink-3)] underline-offset-4 hover:text-[var(--ink)] hover:underline disabled:opacity-60"
                >
                  {billingLoading ? "Opening billing…" : "Open billing portal"}
                </button>
              )}
            </div>
          )}

          {billingError && (
            <p className="rounded-[var(--radius-sm)] bg-[var(--status-miss-bg)] px-3 py-2 text-sm text-[var(--status-miss)]">{billingError}</p>
          )}
        </div>
      </section>

      {/* Requirement history */}
      <section id="requirement-history" className="product-card overflow-hidden">
        <div className="product-callout-brand rounded-none border-x-0 border-t-0 px-6 py-4">
          <p className="product-callout-eye">Required setup step</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-[var(--ink)]">Confirm your special requirement history</h2>
          <p className="text-xs text-[var(--ink-2)] mt-1">
            Some CME topics are one-time or every few years. Confirm what you already completed so ClearCME can calculate your actual remaining hours.
          </p>
        </div>
        <div className="px-6 py-5 space-y-5">
          <p className="product-callout-brand px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
            This is a user attestation, not an error state. It helps ClearCME avoid recommending courses for requirements you may already have satisfied. Keep your original CME documentation for your board&apos;s retention period.
          </p>
          {licenseRequirements.every((group) => group.requirements.length === 0) ? (
            <p className="text-sm text-[var(--ink-3)]">No one-time or long-cycle requirements found for your active licenses.</p>
          ) : (
            licenseRequirements.map((group) => (
              group.requirements.length > 0 && (
                <div key={group.licenseId} className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--ink)]">
                    {group.state} {group.licenseType}
                  </h3>
                  <div className="space-y-3">
                    {group.requirements.map((req) => {
                      const key = `${req.id}:${group.licenseId}`;
                      const saved = requirementCompletions.find(
                        (completion) => completion.mandatoryRequirementId === req.id && completion.physicianLicenseId === group.licenseId
                      );
                      const saving = savingRequirement === key;
                      return (
                        <div key={key} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-[var(--ink)]">{formatTopic(req.topic)}</p>
                                <span className="product-pill product-pill-track">
                                  {formatCadence(req)}
                                </span>
                                {saved && (
                                  <span className="product-pill product-pill-met">
                                    Recorded{saved.completedYear ? ` · ${saved.completedYear}` : ""}
                                  </span>
                                )}
                              </div>
                              {req.description && (
                                <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">{req.description}</p>
                              )}
                              {req.notes && (
                                <p className="mt-1 text-xs leading-relaxed text-[var(--ink-3)]">{req.notes}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 sm:w-56">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1950}
                                max={new Date().getFullYear() + 1}
                                placeholder="Year completed"
                                value={requirementYears[key] ?? ""}
                                onChange={(e) => setRequirementYears((prev) => ({ ...prev, [key]: e.target.value }))}
                                className="product-input"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveRequirementCompletion(req, group.licenseId, "complete")}
                                  disabled={saving}
                                  className="flex-1 rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-2)] disabled:opacity-60"
                                >
                                  {saving ? "Saving…" : "I completed this"}
                                </button>
                                {saved && (
                                  <button
                                    type="button"
                                    onClick={() => saveRequirementCompletion(req, group.licenseId, "clear")}
                                    disabled={saving}
                                    className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--paper)] disabled:opacity-60"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ))
          )}
          {requirementError && (
            <p className="rounded-[var(--radius-sm)] bg-[var(--status-miss-bg)] px-3 py-2 text-sm text-[var(--status-miss)]">{requirementError}</p>
          )}
        </div>
      </section>

      {/* Notification preferences */}
      <section className="product-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--line-soft)] bg-[var(--bg-2)]">
          <h2 className="font-display text-xl font-semibold text-[var(--ink)]">Notifications</h2>
          <p className="text-xs text-[var(--ink-3)] mt-0.5">Email reminders — coming soon</p>
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
          <p className="text-xs text-[var(--ink-3)] pt-1">
            Email notifications are in development. Preferences saved for future use.
          </p>
        </div>
      </section>

      {/* License management */}
      <section className="product-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--line-soft)] bg-[var(--bg-2)] flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[var(--ink)]">Medical Licenses</h2>
            <p className="text-xs text-[var(--ink-3)] mt-0.5">{licenses.length} active license{licenses.length !== 1 ? "s" : ""}</p>
          </div>
          <Link
            href="/dashboard/profile"
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-2)] font-medium"
          >
            + Add license
          </Link>
        </div>

        {licenses.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-[var(--ink-3)] mb-4">No licenses added yet.</p>
            <Link
              href="/dashboard/profile"
              className="product-btn product-btn-primary"
            >
              Add your first license →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line-soft)]">
            {licenses.map((license) => (
              <div key={license.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--ink)] text-sm">
                    {license.state} — {license.licenseType}
                  </p>
                  <p className="text-xs text-[var(--ink-3)] mt-0.5">
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
                  className="text-xs text-[var(--status-miss)] hover:text-[var(--pop-2)] font-medium px-3 py-1.5 rounded-full hover:bg-[var(--status-miss-bg)] transition-colors disabled:opacity-50 flex-shrink-0"
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
        <p className="text-sm font-medium text-[var(--ink)]">{label}</p>
        <p className="text-xs text-[var(--ink-3)] mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5 ${
          disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
        } ${value ? "bg-[var(--primary)]" : "bg-[var(--bg-2)]"}`}
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
