# Run D factual questions — no facts changed

## FQ-D-1 — Texas MD renewal schedule differs from the requested baseline

- Page: `/dashboard/setup`, step 3, fresh TX MD user, observed at both viewports.
- Shown: “TMB-assigned expiration date (Feb. 28, May 31, Aug. 31, or Nov. 30), every 2 years; even-numbered licenses expire in even years, odd in odd”. The UI calls this variable, provides no birth-month selector and disables estimates.
- Why flagged: the Run D brief and supplied AGENTS guidance explicitly describe TX as birth-month based. This may reflect a subsequently verified source update. It needs the human compliance pipeline, not an ad hoc correction.
- Evidence: `walkthrough-D/desktop/108-TX-MD-step3-landing.jpg` and matching `.json`; later TX repeat captures supplement it.
- No external fact lookup was attempted because this run prohibits non-loopback network access. No assertion about which rule is correct is made.

## FQ-D-2 — NV DO specialty filtering cannot be verified against this local dataset

- Page: `/dashboard/compliance`, new NV DO account, specialty unset and Psychiatry.
- Shown: “RULES PENDING”, “Compliance rules for NV DO not yet loaded.” and 0.0 still to log / 0 of 0 topics, while the federal MATE row remains visible.
- Why flagged: the requested walkthrough expects NV DO requirements and a psychiatry-only cultural-competency filter. A read-only database inventory found MD rules for all jurisdictions and **no DO rule rows** in the sandbox. This is a test-data coverage limit, not evidence that production lacks these rules. No compliance data was inserted or changed to make the test pass.
- Evidence: `walkthrough-D/desktop/131-NV-DO-unset-compliance.jpg`, `walkthrough-D/desktop/144-NV-DO-Psychiatry-compliance.jpg`, corresponding phone captures. Read-only counts and rule update timestamps: [local inventory](walkthrough-D/local-rule-inventory.json).
- Request to the human compliance owners: provide the approved local fixture/import process before rerunning the NV DO filtering scenario. Do not use the legacy seed.

## FQ-D-3 — local NV MD rules contain legacy/federal-looking state rows

- Pages: `/dashboard/compliance` and `/dashboard/settings`, NV MD fixture account.
- Shown: state-attestation rows named “Bioterrorism/WMD — one-time requirement” (4 hours) and “DEA MATE Act — 8 hr one-time (if DEA registered)” beneath Nevada MD. The separate federal MATE record is also visible.
- Why flagged: AGENTS explicitly says the legacy seed contains repealed Nevada bioterrorism data and MATE must remain federal-only. These local rows therefore cannot support a production factual sign-off. Their provenance needs human review; this run did not reseed or edit them.
- Evidence: `walkthrough-D/desktop/255-settings-persisted.jpg`, `walkthrough-D/phone/239-settings-persisted.jpg`, and corresponding DOM captures. The test account's certificates/attestations are fictional; the underlying requirement rows are untouched.
