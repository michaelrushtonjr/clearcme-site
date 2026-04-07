"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    state: "NV",
    licenseType: "DO",
    specialty: "Emergency Medicine",
    licenseNumber: "",
    renewalDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
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
