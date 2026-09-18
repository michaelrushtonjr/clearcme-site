"use client";
import { useState } from "react";
import Link from "next/link";

export function StateDirectory({ states }: { states: { code: string; name: string; slug: string | null; boardLabel: string }[] }) {
  const [query, setQuery] = useState("");
  const filtered = states.filter((state) => `${state.name} ${state.code}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section><label htmlFor="state-search" className="mb-2 block font-semibold">Find a state or DC</label><input id="state-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="State name or abbreviation" className="product-input mb-3 max-w-lg" /><p aria-live="polite" className="mb-6 text-sm text-[#596650]">{filtered.length} jurisdictions · Full guides are linked below.</p><ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((state) => <li key={state.code} className="public-card p-5"><div className="mb-2 text-xs font-semibold tracking-widest text-[#596650]">{state.code}</div>{state.slug ? <Link href={`/cme-requirements/${state.slug}`} className="text-lg font-bold underline underline-offset-4 text-[#3f5f33]">{state.name} →</Link> : <h3 className="text-lg font-semibold">{state.name}</h3>}<p className="mt-2 text-sm text-[#596650]">{state.boardLabel}</p><p className="mt-2 text-xs text-[#596650]">{state.slug ? "Verified physician guide" : "Detailed guide not yet published"}</p></li>)}</ul>{!filtered.length && <p>No matching state. Try its full name or two-letter abbreviation.</p>}</section>;
}
