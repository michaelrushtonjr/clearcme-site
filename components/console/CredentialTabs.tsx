"use client";

import { Children, useState } from "react";

/**
 * Credential tabs (1b compliance). Children are the server-rendered credential
 * sections, one per tab, in the same order as `tabs`. All sections stay
 * mounted (attestation state survives tab switches); inactive ones are hidden.
 */
export default function CredentialTabs({
  tabs,
  children,
}: {
  tabs: string[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const sections = Children.toArray(children);

  if (tabs.length <= 1) return <>{children}</>;

  return (
    <div>
      <div className="cred-tabs" role="tablist" aria-label="Credentials">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            role="tab"
            aria-selected={i === active}
            className={i === active ? "active" : undefined}
            onClick={() => setActive(i)}
          >
            {tab}
          </button>
        ))}
      </div>
      {sections.map((section, i) => (
        <div key={i} hidden={i !== active} style={{ marginTop: 18 }}>
          {section}
        </div>
      ))}
    </div>
  );
}
