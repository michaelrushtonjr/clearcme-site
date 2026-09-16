# Run C — data provenance question

No state/course fact change was required or made. Michael supplied and approved the MATE rule and exact copy; `docs/run-c-decisions.md` records them.

| File / line | Current value or meaning | Needed verified value | Why / current behavior |
| --- | --- | --- | --- |
| `prisma/schema.prisma:122`, `PhysicianLicense.deaRegisteredAt`; previous DEA extraction route and profile date input | Comment calls it the original registration date, but the previous upload route wrote the certificate's registration/issue date and the old input accepted initial **or most recent** registration/renewal. No populated database was read in this session; individual values are unknown. | The physician-confirmed first DEA registration or renewal on/after 2023-06-27. No historical date is proposed or inferred. | A recent renewal certificate cannot establish the first qualifying event. Legacy values remain unchanged/readable. The engine uses the new, explicit `User.deaFirstQualifyingAt`, which starts NULL; missing history returns UNKNOWN. Physicians can supply that date in the profile. Any bulk reconstruction requires original evidence and human review. |

The statutory rule is not an open question in this run. The unresolved issue is the provenance of existing user dates. No regulatory correction was made to `lib/state-requirements.ts`, `lib/courses.ts`, or any hours/cadence/topic database value.
