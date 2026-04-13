"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import NpiVerifier from "@/components/NpiVerifier";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

const SPECIALTIES = [
  "Emergency Medicine","Family Medicine","Internal Medicine","Pediatrics",
  "Surgery","Obstetrics & Gynecology","Psychiatry","Anesthesiology",
  "Radiology","Cardiology","Neurology","Orthopedics","Dermatology","Other"
];

const MATE_ACT_CUTOFF = new Date("2023-06-27");

interface DeaExtracted {
  deaNumber: string | null;
  registrantName: string | null;
  registrationDate: string | null;
  expirationDate: string | null;
  schedules: string[];
}

interface PhysicianMatch {
  npi: string;
  name: string;
  credential: string;
  state: string;
  specialty: string;
  city: string;
}

function computeMateActRequired(registrationDateStr: string | null): boolean | null {
  if (!registrationDateStr) return null;
  const d = new Date(registrationDateStr);
  if (isNaN(d.getTime())) return null;
  return d < MATE_ACT_CUTOFF;
}

interface ProfileClientProps {
  userName: string | null;
}

export default function ProfileClient({ userName }: ProfileClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    state: "",
    licenseType: "",
    specialty: "",
    licenseNumber: "",
    renewalDate: "",
    hasDeaRegistration: "" as "" | "yes" | "no",
    deaRegistrationDate: "",
    mateActCompleted: false,
  });

  // NPI verification state
  const [verifiedNpi, setVerifiedNpi] = useState<string | null>(null);
  const [verifiedMatch, setVerifiedMatch] = useState<PhysicianMatch | null>(null);

  // DEA cert upload state
  const [deaUploadMode, setDeaUploadMode] = useState<"upload" | "manual" | null>(null);
  const [deaDragging, setDeaDragging] = useState(false);
  const [deaUploading, setDeaUploading] = useState(false);
  const [deaUploadError, setDeaUploadError] = useState("");
  const [deaExtracted, setDeaExtracted] = useState<DeaExtracted | null>(null);
  const [deaUploadedFileName, setDeaUploadedFileName] = useState("");
  const deaFileInputRef = useRef<HTMLInputElement>(null);

  // Derived MATE Act state
  const mateActDate =
    deaExtracted?.registrationDate ?? (deaUploadMode === "manual" ? form.deaRegistrationDate : null);
  const mateActRequired = computeMateActRequired(mateActDate);

  // Parse first/last name from Google session name
  const nameParts = (userName ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  const handleDeaFile = useCallback(async (file: File) => {
    setDeaUploadError("");
    setDeaUploading(true);
    setDeaExtracted(null);
    setDeaUploadedFileName(file.name);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/dea-certificate", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to extract DEA certificate data");
      }
      setDeaExtracted(data.extracted);
      if (data.extracted?.registrationDate) {
        setForm((f) => ({ ...f, deaRegistrationDate: data.extracted.registrationDate }));
      }
    } catch (err: unknown) {
      setDeaUploadError(err instanceof Error ? err.message : "Upload failed");
      setDeaUploadedFileName("");
    } finally {
      setDeaUploading(false);
    }
  }, []);

  const handleDeaDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDeaDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleDeaFile(file);
    },
    [handleDeaFile]
  );

  const handleDeaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleDeaFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.state) { setError("Please select a state."); return; }
    if (!form.licenseType) { setError("Please select MD or DO."); return; }
    if (!form.renewalDate) { setError("Please enter your renewal date."); return; }
    setLoading(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        state: form.state,
        licenseType: form.licenseType,
        specialty: form.specialty,
        licenseNumber: form.licenseNumber,
        renewalDate: form.renewalDate,
        hasDeaRegistration: form.hasDeaRegistration,
        deaRegistrationDate: form.deaRegistrationDate || null,
        npiNumber: verifiedNpi || null,
      };

      if (form.hasDeaRegistration === "yes") {
        if (deaExtracted) {
          payload.deaNumber = deaExtracted.deaNumber;
          payload.deaExpiresAt = deaExtracted.expirationDate;
          payload.deaRegisteredAt = deaExtracted.registrationDate ?? form.deaRegistrationDate;
        } else {
          payload.deaRegisteredAt = form.deaRegistrationDate || null;
        }
        if (mateActRequired !== null) {
          payload.mateActRequired = mateActRequired;
        }
        payload.mateActCompleted = form.mateActCompleted;
      }

      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save license");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Add Medical License</h1>
        <p className="text-slate-500 mt-1">
          Add your state medical license to see personalized CME compliance requirements.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* State */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            State
          </label>
          <select
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Select your state</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* License Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            License Type
          </label>
          <div className="flex gap-3">
            {["MD", "DO"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm({ ...form, licenseType: type })}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  form.licenseType === type
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-slate-200 text-slate-700 hover:border-blue-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* NPI Verification — shown after state + licenseType selected */}
        {form.state && form.licenseType && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              NPPES Verification{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <NpiVerifier
              firstName={firstName}
              lastName={lastName}
              state={form.state}
              licenseType={form.licenseType}
              verifiedNpi={verifiedNpi}
              verifiedMatch={verifiedMatch}
              onVerified={(npi, match) => {
                setVerifiedNpi(npi);
                setVerifiedMatch(match);
              }}
              onCleared={() => {
                setVerifiedNpi(null);
                setVerifiedMatch(null);
              }}
            />
          </div>
        )}

        {/* Specialty */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Specialty
          </label>
          <select
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Select your specialty</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* License Number (optional) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            License Number <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={form.licenseNumber}
            onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
            placeholder="e.g. MD12345"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* DEA Registration */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            DEA Registration
          </label>
          <div className="flex gap-3">
            {[
              { val: "yes", label: "Yes, I have an active DEA registration" },
              { val: "no", label: "No DEA registration" },
            ].map(({ val, label }) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setForm({ ...form, hasDeaRegistration: val as "yes" | "no" });
                  if (val === "no") {
                    setDeaUploadMode(null);
                    setDeaExtracted(null);
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors text-left ${
                  form.hasDeaRegistration === val
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-slate-200 text-slate-700 hover:border-blue-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* DEA cert section — only shown when "yes" */}
          {form.hasDeaRegistration === "yes" && (
            <div className="mt-4 space-y-4">

              {/* Upload section header */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Upload your DEA Registration Certificate
                  <span className="ml-1 text-xs font-normal text-blue-600">(optional but recommended)</span>
                </p>
                <p className="text-xs text-blue-700 mb-3">
                  We&apos;ll extract your DEA number, registration date, and expiration automatically. The file is not stored.
                </p>

                {/* Drop zone */}
                {!deaExtracted && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDeaDragging(true); }}
                    onDragLeave={() => setDeaDragging(false)}
                    onDrop={handleDeaDrop}
                    onClick={() => deaFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      deaDragging
                        ? "border-blue-400 bg-blue-100"
                        : "border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    <input
                      ref={deaFileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleDeaInputChange}
                    />
                    {deaUploading ? (
                      <div className="flex items-center justify-center gap-2 text-blue-600">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm">Extracting DEA data…</span>
                      </div>
                    ) : (
                      <>
                        <svg className="mx-auto h-8 w-8 text-blue-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-slate-600">
                          <span className="font-medium text-blue-600">Click to upload</span> or drag & drop
                        </p>
                        <p className="text-xs text-slate-400 mt-1">PDF, JPG, or PNG — max 10MB</p>
                      </>
                    )}
                  </div>
                )}

                {/* Upload error */}
                {deaUploadError && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {deaUploadError}
                    <button
                      type="button"
                      onClick={() => { setDeaUploadError(""); setDeaUploadedFileName(""); }}
                      className="ml-2 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {/* Extracted data card */}
                {deaExtracted && (
                  <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-green-600">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs font-semibold">DEA Certificate Extracted</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDeaExtracted(null);
                          setDeaUploadedFileName("");
                          setDeaUploadMode(null);
                          setForm((f) => ({ ...f, deaRegistrationDate: "" }));
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 underline"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">{deaUploadedFileName}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {deaExtracted.deaNumber && (
                        <>
                          <span className="text-slate-500">DEA Number</span>
                          <span className="font-mono font-medium text-slate-800">{deaExtracted.deaNumber}</span>
                        </>
                      )}
                      {deaExtracted.registrantName && (
                        <>
                          <span className="text-slate-500">Registrant</span>
                          <span className="text-slate-800">{deaExtracted.registrantName}</span>
                        </>
                      )}
                      {deaExtracted.registrationDate && (
                        <>
                          <span className="text-slate-500">Registered</span>
                          <span className="text-slate-800">{deaExtracted.registrationDate}</span>
                        </>
                      )}
                      {deaExtracted.expirationDate && (
                        <>
                          <span className="text-slate-500">Expires</span>
                          <span className="text-slate-800">{deaExtracted.expirationDate}</span>
                        </>
                      )}
                      {deaExtracted.schedules && deaExtracted.schedules.length > 0 && (
                        <>
                          <span className="text-slate-500">Schedules</span>
                          <span className="text-slate-800">{deaExtracted.schedules.join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Skip / use manual date link */}
                {!deaExtracted && !deaUploading && (
                  <button
                    type="button"
                    onClick={() => setDeaUploadMode(deaUploadMode === "manual" ? null : "manual")}
                    className="mt-2 text-xs text-blue-500 underline hover:text-blue-700"
                  >
                    {deaUploadMode === "manual" ? "Hide date picker" : "Skip upload — enter date manually instead"}
                  </button>
                )}
              </div>

              {/* Option C fallback — manual date picker */}
              {(deaUploadMode === "manual" || deaExtracted) && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    When did you first register or most recently renew with DEA?
                    <span className="text-slate-400 font-normal"> (approximate)</span>
                  </label>
                  <input
                    type="date"
                    value={form.deaRegistrationDate}
                    onChange={(e) => setForm({ ...form, deaRegistrationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Used to determine if the DEA MATE Act 8-hour requirement applies to you.
                  </p>
                </div>
              )}

              {/* MATE Act notice */}
              {mateActRequired !== null && (
                <div className={`rounded-xl p-4 border ${mateActRequired ? "bg-amber-50 border-amber-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className="flex items-start gap-2">
                    <svg className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">DEA MATE Act Training Required</p>
                      {mateActRequired ? (
                        <p className="text-xs text-amber-700 mt-0.5">
                          Because your DEA registration predates June 27, 2023, you must complete the 8-hour MATE Act training
                          {deaExtracted?.expirationDate
                            ? ` before your next DEA renewal (${deaExtracted.expirationDate}).`
                            : " at your next DEA renewal."}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-700 mt-0.5">
                          Your DEA was registered on or after June 27, 2023. The 8-hour MATE Act training is required — complete before your next renewal.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* MATE Act completion checkbox */}
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.mateActCompleted}
                      onChange={(e) => setForm({ ...form, mateActCompleted: e.target.checked })}
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs text-amber-800 font-medium">
                      I have completed the 8-hour DEA MATE Act training
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Renewal Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            License Renewal Date
          </label>
          <input
            type="date"
            value={form.renewalDate}
            onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            The date your current license expires / needs renewal.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? "Saving..." : "Add License"}
          </button>
        </div>
      </form>
    </div>
  );
}
