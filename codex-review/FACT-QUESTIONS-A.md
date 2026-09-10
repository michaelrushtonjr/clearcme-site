# Run A fact questions

No compliance facts were populated. Source line numbers refer to lib/state-requirements.ts on the Run A branch.

## Migration identity collisions

The local sandbox has the following duplicate natural keys. Production was not queried. The migration rejects all duplicates before any backfill; Vera/Roz must assign explicit identities in a reviewed follow-up.

- MI:MD:OTHER_MANDATORY: 2 existing rows.
- NV:MD:OTHER_MANDATORY: 2 existing rows.
- LA:MD:OTHER_MANDATORY: 2 existing rows.
- FL:MD:OTHER_MANDATORY: 2 existing rows.

## Cadence fields missing

Current value: no typed cadence/intervalYears. Proposed value: UNKNOWN pending Vera/Roz verification; the sync stores CONDITIONAL plus UNVERIFIED-CADENCE, preserving existing attestationAllowed. This is a review marker, not an inferred regulatory cadence.

- AK MD — Pain management and opioid use/addiction (source line 292); explicit cadence absent.
- AK MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- AK DO — Pain management and opioid use/addiction (source line 292); explicit cadence absent.
- AK DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- AL MD — Professional boundaries (source line 302); explicit cadence absent.
- AL MD — Collaborative/supervisory practice CME (source line 303); explicit cadence absent.
- AL MD — Controlled Substance Certificate CME (source line 304); explicit cadence absent.
- AL DO — Professional boundaries (source line 302); explicit cadence absent.
- AL DO — Collaborative/supervisory practice CME (source line 303); explicit cadence absent.
- AL DO — Controlled Substance Certificate CME (source line 304); explicit cadence absent.
- AR MD — Opioid/benzodiazepine prescribing (source line 313); explicit cadence absent.
- AR DO — Opioid/benzodiazepine prescribing (source line 313); explicit cadence absent.
- AZ MD — Opioid / controlled substance prescribing (source line 322); explicit cadence absent.
- AZ MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- AZ DO — Opioid / controlled substance prescribing (source line 322); explicit cadence absent.
- AZ DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- CA MD — Pain management and end-of-life care (source line 332); explicit cadence absent.
- CA MD — Geriatric medicine (source line 333); explicit cadence absent.
- CA MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- CA DO — Schedule II drugs / opioid addiction-risk course (source line 883); explicit cadence absent.
- CA DO — Pain management and end-of-life care (source line 332); explicit cadence absent.
- CA DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- CO MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- CO DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- CT MD — Infectious diseases / HIV (source line 352); explicit cadence absent.
- CT MD — Risk management (source line 353); explicit cadence absent.
- CT MD — Sexual assault (source line 354); explicit cadence absent.
- CT MD — Domestic violence (source line 355); explicit cadence absent.
- CT MD — Cultural competency (source line 356); explicit cadence absent.
- CT MD — Behavioral health (source line 357); explicit cadence absent.
- CT MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- CT DO — Infectious diseases / HIV (source line 352); explicit cadence absent.
- CT DO — Risk management (source line 353); explicit cadence absent.
- CT DO — Sexual assault (source line 354); explicit cadence absent.
- CT DO — Domestic violence (source line 355); explicit cadence absent.
- CT DO — Cultural competency (source line 356); explicit cadence absent.
- CT DO — Behavioral health (source line 357); explicit cadence absent.
- CT DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- DC MD — LGBTQ cultural competency (source line 367); explicit cadence absent.
- DC MD — Pharmacology (source line 368); explicit cadence absent.
- DC MD — Public health priority topics (source line 369); explicit cadence absent.
- DC MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- DC DO — LGBTQ cultural competency (source line 367); explicit cadence absent.
- DC DO — Pharmacology (source line 368); explicit cadence absent.
- DC DO — Public health priority topics (source line 369); explicit cadence absent.
- DC DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- DE MD — Child abuse / domestic violence recognition and reporting (source line 379); explicit cadence absent.
- DE MD — Alzheimer's disease / dementias (source line 380); explicit cadence absent.
- DE MD — Delaware CSR applicant course (source line 381); explicit cadence absent.
- DE MD — Controlled substance prescribing (source line 382); explicit cadence absent.
- DE MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- DE DO — Child abuse / domestic violence recognition and reporting (source line 379); explicit cadence absent.
- DE DO — Alzheimer's disease / dementias (source line 380); explicit cadence absent.
- DE DO — Delaware CSR applicant course (source line 381); explicit cadence absent.
- DE DO — Controlled substance prescribing (source line 382); explicit cadence absent.
- DE DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- FL MD — Prevention of medical errors (source line 392); explicit cadence absent.
- FL MD — Domestic violence (source line 355); explicit cadence absent.
- FL MD — HIV/AIDS (source line 394); explicit cadence absent.
- FL MD — Human trafficking (source line 395); explicit cadence absent.
- FL MD — Controlled substances (source line 396); explicit cadence absent.
- FL MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- FL DO — Florida laws / rules and ethics (source line 894); explicit cadence absent.
- FL DO — Prevention of medical errors (source line 392); explicit cadence absent.
- FL DO — Controlled substances (source line 396); explicit cadence absent.
- FL DO — HIV/AIDS (source line 394); explicit cadence absent.
- FL DO — Domestic violence (source line 355); explicit cadence absent.
- FL DO — Human trafficking (source line 395); explicit cadence absent.
- FL DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- GA MD — Controlled substance prescribing (source line 382); explicit cadence absent.
- GA MD — Professional boundaries / sexual misconduct (source line 407); explicit cadence absent.
- GA MD — Pain management / palliative medicine (source line 408); explicit cadence absent.
- GA MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- GA DO — Controlled substance prescribing (source line 382); explicit cadence absent.
- GA DO — Professional boundaries / sexual misconduct (source line 407); explicit cadence absent.
- GA DO — Pain management / palliative medicine (source line 408); explicit cadence absent.
- GA DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- HI MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- HI DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- IA MD — Child abuse identification and reporting (source line 425); explicit cadence absent.
- IA MD — Dependent adult abuse identification and reporting (source line 426); explicit cadence absent.
- IA MD — End-of-life care (source line 427); explicit cadence absent.
- IA MD — CDC opioid prescribing guidelines (source line 428); explicit cadence absent.
- IA MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- IA DO — Child abuse identification and reporting (source line 425); explicit cadence absent.
- IA DO — Dependent adult abuse identification and reporting (source line 426); explicit cadence absent.
- IA DO — End-of-life care (source line 427); explicit cadence absent.
- IA DO — CDC opioid prescribing guidelines (source line 428); explicit cadence absent.
- IA DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- ID MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- ID DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- IL MD — Opioid prescribing (source line 445); explicit cadence absent.
- IL MD — Sexual harassment prevention (source line 446); explicit cadence absent.
- IL MD — Implicit bias in health care (source line 447); explicit cadence absent.
- IL MD — Alzheimer's disease and dementia (source line 448); explicit cadence absent.
- IL MD — Cultural competency (source line 356); explicit cadence absent.
- IL MD — Child abuse / mandated reporter training (source line 450); explicit cadence absent.
- IL DO — Opioid prescribing (source line 445); explicit cadence absent.
- IL DO — Sexual harassment prevention (source line 446); explicit cadence absent.
- IL DO — Implicit bias in health care (source line 447); explicit cadence absent.
- IL DO — Alzheimer's disease and dementia (source line 448); explicit cadence absent.
- IL DO — Cultural competency (source line 356); explicit cadence absent.
- IL DO — Child abuse / mandated reporter training (source line 450); explicit cadence absent.
- IN MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- IN DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- KS MD — Category III credits (source line 466); explicit cadence absent.
- KS MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- KS DO — Category III credits (source line 466); explicit cadence absent.
- KS DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- KY MD — KASPER / pain management / addiction (source line 476); explicit cadence absent.
- KY MD — Addiction medicine (source line 477); explicit cadence absent.
- KY MD — Domestic violence (source line 355); explicit cadence absent.
- KY MD — Pediatric abusive head trauma (source line 479); explicit cadence absent.
- KY MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- KY DO — KASPER / pain management / addiction (source line 476); explicit cadence absent.
- KY DO — Addiction medicine (source line 477); explicit cadence absent.
- KY DO — Domestic violence (source line 355); explicit cadence absent.
- KY DO — Pediatric abusive head trauma (source line 479); explicit cadence absent.
- KY DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- LA MD — Louisiana laws and rules (source line 489); explicit cadence absent.
- LA MD — CDS prescribing (source line 490); explicit cadence absent.
- LA MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- LA DO — Louisiana laws and rules (source line 489); explicit cadence absent.
- LA DO — CDS prescribing (source line 490); explicit cadence absent.
- LA DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MA MD — Risk management (source line 353); explicit cadence absent.
- MA MD — Board regulations review (source line 501); explicit cadence absent.
- MA MD — Opioid education and pain management (source line 502); explicit cadence absent.
- MA MD — Implicit bias in health care (source line 447); explicit cadence absent.
- MA MD — End-of-life care (source line 427); explicit cadence absent.
- MA MD — Child abuse recognition and reporting (source line 505); explicit cadence absent.
- MA MD — Domestic and sexual violence (source line 506); explicit cadence absent.
- MA MD — Alzheimer's disease / dementias (source line 380); explicit cadence absent.
- MA MD — EHR proficiency (source line 508); explicit cadence absent.
- MA MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MA DO — Risk management (source line 353); explicit cadence absent.
- MA DO — Board regulations review (source line 501); explicit cadence absent.
- MA DO — Opioid education and pain management (source line 502); explicit cadence absent.
- MA DO — Implicit bias in health care (source line 447); explicit cadence absent.
- MA DO — End-of-life care (source line 427); explicit cadence absent.
- MA DO — Child abuse recognition and reporting (source line 505); explicit cadence absent.
- MA DO — Domestic and sexual violence (source line 506); explicit cadence absent.
- MA DO — Alzheimer's disease / dementias (source line 380); explicit cadence absent.
- MA DO — EHR proficiency (source line 508); explicit cadence absent.
- MA DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MD MD — New Physician Orientation (source line 518); explicit cadence absent.
- MD MD — Implicit bias + structural racism training (source line 519); explicit cadence absent.
- MD MD — Controlled dangerous substances CME (source line 520); explicit cadence absent.
- MD MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MD DO — New Physician Orientation (source line 518); explicit cadence absent.
- MD DO — Implicit bias + structural racism training (source line 519); explicit cadence absent.
- MD DO — Controlled dangerous substances CME (source line 520); explicit cadence absent.
- MD DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- ME MD — Controlled substance / opioid prescribing (source line 530); explicit cadence absent.
- ME MD — Maine jurisprudence exam (source line 531); explicit cadence absent.
- ME MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- ME DO — Controlled substance / opioid prescribing (source line 530); explicit cadence absent.
- ME DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MI MD — Medical ethics (source line 541); explicit cadence absent.
- MI MD — Pain and symptom management (source line 542); explicit cadence absent.
- MI MD — Implicit bias (source line 447); explicit cadence absent.
- MI MD — Human trafficking identification (source line 544); explicit cadence absent.
- MI MD — Opioids / controlled-substance awareness (source line 545); explicit cadence absent.
- MI MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MI DO — Medical ethics (source line 541); explicit cadence absent.
- MI DO — Pain and symptom management (source line 542); explicit cadence absent.
- MI DO — Implicit bias (source line 447); explicit cadence absent.
- MI DO — Human trafficking identification (source line 544); explicit cadence absent.
- MI DO — Opioids / controlled-substance awareness (source line 545); explicit cadence absent.
- MI DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MN MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MN DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MO MD — Health benefits of nutrition (source line 564); explicit cadence absent.
- MO MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MO DO — Health benefits of nutrition (source line 564); explicit cadence absent.
- MO DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MS MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MS DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MT MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- MT DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NC MD — Controlled substance prescribing (source line 382); explicit cadence absent.
- NC MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NC DO — Controlled substance prescribing (source line 382); explicit cadence absent.
- NC DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- ND MD — Nutrition and metabolic health (source line 600); explicit cadence absent.
- ND MD — Abortion instructional course (source line 601); explicit cadence absent.
- ND MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- ND DO — Nutrition and metabolic health (source line 600); explicit cadence absent.
- ND DO — Abortion instructional course (source line 601); explicit cadence absent.
- ND DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NE MD — Opioid prescribing (source line 445); explicit cadence absent.
- NE MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NE DO — Opioid prescribing (source line 445); explicit cadence absent.
- NE DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NH MD — Opioid prescribing / OUD treatment (source line 621); explicit cadence absent.
- NH MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NH DO — Opioid prescribing / OUD treatment (source line 621); explicit cadence absent.
- NH DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NJ MD — Cultural competency (source line 356); explicit cadence absent.
- NJ MD — End-of-life care (source line 427); explicit cadence absent.
- NJ MD — Opioid prescribing (source line 445); explicit cadence absent.
- NJ MD — Sexual misconduct prevention (source line 634); explicit cadence absent.
- NJ MD — Implicit bias in perinatal care (source line 635); explicit cadence absent.
- NJ MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NJ DO — Cultural competency (source line 356); explicit cadence absent.
- NJ DO — End-of-life care (source line 427); explicit cadence absent.
- NJ DO — Opioid prescribing (source line 445); explicit cadence absent.
- NJ DO — Sexual misconduct prevention (source line 634); explicit cadence absent.
- NJ DO — Implicit bias in perinatal care (source line 635); explicit cadence absent.
- NJ DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NM MD — New Mexico Medical Practice Act review (source line 645); explicit cadence absent.
- NM MD — Pain management and controlled substances (source line 646); explicit cadence absent.
- NM MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NM DO — New Mexico Osteopathic Medical Practice Act and Board rules review (source line 948); explicit cadence absent.
- NM DO — Pain management (source line 292); explicit cadence absent.
- NM DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NV MD — Ethics, pain management, or addiction care (source line 656); explicit cadence absent.
- NV MD — Suicide prevention and awareness (source line 657); explicit cadence absent.
- NV MD — SBIRT (source line 656); explicit cadence absent.
- NV MD — HIV stigma / bias training (source line 659); explicit cadence absent.
- NV MD — Controlled substances / opioid CE (source line 660); explicit cadence absent.
- NV MD — Cultural competency / DEI (source line 661); explicit cadence absent.
- NV MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NV DO — Opioid / controlled substance education (source line 933); explicit cadence absent.
- NV DO — Ethics, pain management, addiction care, or SBIRT (source line 934); explicit cadence absent.
- NV DO — SBIRT (source line 656); explicit cadence absent.
- NV DO — Suicide prevention and awareness (source line 657); explicit cadence absent.
- NV DO — HIV stigma / bias training (source line 659); explicit cadence absent.
- NV DO — Cultural competency / DEI (source line 661); explicit cadence absent.
- NV DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NY MD — Child abuse identification and reporting (source line 425); explicit cadence absent.
- NY MD — Infection control and barrier precautions (source line 672); explicit cadence absent.
- NY MD — Pain management, palliative care, and addiction (source line 673); explicit cadence absent.
- NY MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- NY DO — Child abuse identification and reporting (source line 425); explicit cadence absent.
- NY DO — Infection control and barrier precautions (source line 672); explicit cadence absent.
- NY DO — Pain management, palliative care, and addiction (source line 673); explicit cadence absent.
- NY DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- OH MD — Duty to report misconduct (source line 683); explicit cadence absent.
- OH MD — Pain medicine (pain management clinics) (source line 684); explicit cadence absent.
- OH MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- OH DO — Duty to report misconduct (source line 683); explicit cadence absent.
- OH DO — Pain medicine (pain management clinics) (source line 684); explicit cadence absent.
- OH DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- OK MD — Opioid prescribing / pain management (source line 694); explicit cadence absent.
- OK MD — Medical treatment laws (inpatient rights) presentation (source line 695); explicit cadence absent.
- OK MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- OK DO — Proper prescribing (source line 959); explicit cadence absent.
- OK DO — Medical treatment laws (inpatient rights) presentation (source line 695); explicit cadence absent.
- OK DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- OR MD — Pain management (source line 292); explicit cadence absent.
- OR MD — Cultural competency (source line 356); explicit cadence absent.
- OR MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- OR DO — Pain management (source line 292); explicit cadence absent.
- OR DO — Cultural competency (source line 356); explicit cadence absent.
- OR DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- PA MD — Patient safety / risk management (source line 716); explicit cadence absent.
- PA MD — Child abuse recognition and reporting (source line 505); explicit cadence absent.
- PA MD — Pain management / opioid prescribing (source line 718); explicit cadence absent.
- PA MD — Initial opioid education (source line 719); explicit cadence absent.
- PA MD — Organ and tissue donation / recovery (source line 720); explicit cadence absent.
- PA MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- PA DO — Patient safety / risk management (source line 716); explicit cadence absent.
- PA DO — Child abuse recognition and reporting (source line 505); explicit cadence absent.
- PA DO — Pain management / opioid prescribing (source line 718); explicit cadence absent.
- PA DO — Initial opioid education (source line 719); explicit cadence absent.
- PA DO — Organ and tissue donation / recovery (source line 720); explicit cadence absent.
- PA DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- RI MD — Alzheimer's disease / cognitive impairment (source line 730); explicit cadence absent.
- RI MD — Opioid prescribing best practices (source line 731); explicit cadence absent.
- RI MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- RI DO — Alzheimer's disease / cognitive impairment (source line 730); explicit cadence absent.
- RI DO — Opioid prescribing best practices (source line 731); explicit cadence absent.
- RI DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- SC MD — Prescribing and monitoring controlled substances (source line 741); explicit cadence absent.
- SC MD — Human trafficking awareness and prevention (source line 742); explicit cadence absent.
- SC MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- SC DO — Prescribing and monitoring controlled substances (source line 741); explicit cadence absent.
- SC DO — Human trafficking awareness and prevention (source line 742); explicit cadence absent.
- SC DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- SD MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- SD DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- TN MD — Controlled substance prescribing (source line 382); explicit cadence absent.
- TN MD — Nutrition (source line 600); explicit cadence absent.
- TN MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- TN DO — Controlled substance prescribing (source line 382); explicit cadence absent.
- TN DO — Nutrition (source line 600); explicit cadence absent.
- TN DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- TX MD — Medical ethics / professional responsibility (source line 770); explicit cadence absent.
- TX MD — Safe prescribing / pain management (source line 771); explicit cadence absent.
- TX MD — Human trafficking prevention (source line 772); explicit cadence absent.
- TX MD — Forensic evidence collection / sexual assault survivor care (source line 773); explicit cadence absent.
- TX MD — Nutrition and metabolic health (source line 600); explicit cadence absent.
- TX MD — Life of the Mother Act emergency care CE (source line 775); explicit cadence absent.
- TX MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- TX DO — Medical ethics / professional responsibility (source line 770); explicit cadence absent.
- TX DO — Safe prescribing / pain management (source line 771); explicit cadence absent.
- TX DO — Human trafficking prevention (source line 772); explicit cadence absent.
- TX DO — Forensic evidence collection / sexual assault survivor care (source line 773); explicit cadence absent.
- TX DO — Nutrition and metabolic health (source line 600); explicit cadence absent.
- TX DO — Life of the Mother Act emergency care CE (source line 775); explicit cadence absent.
- TX DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- UT MD — Controlled substance prescribing (source line 382); explicit cadence absent.
- UT MD — SBIRT (source line 656); explicit cadence absent.
- UT MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- UT DO — Controlled substance prescribing (source line 382); explicit cadence absent.
- UT DO — SBIRT (source line 656); explicit cadence absent.
- UT DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- VA MD — Office-based anesthesia (source line 796); explicit cadence absent.
- VA MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- VA DO — Office-based anesthesia (source line 796); explicit cadence absent.
- VA DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- VT MD — Hospice / palliative care / pain management (source line 806); explicit cadence absent.
- VT MD — Safe and effective prescribing of controlled substances (source line 807); explicit cadence absent.
- VT MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- VT DO — Safe and effective prescribing of controlled substances (source line 807); explicit cadence absent.
- VT DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- WA MD — Suicide assessment, treatment, and management (source line 817); explicit cadence absent.
- WA MD — Health equity (source line 818); explicit cadence absent.
- WA MD — Opioid prescribing best practices (source line 731); explicit cadence absent.
- WA MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- WA DO — Suicide assessment, treatment, and management (source line 817); explicit cadence absent.
- WA DO — Health equity (source line 818); explicit cadence absent.
- WA DO — Opioid prescribing best practices (source line 731); explicit cadence absent.
- WA DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- WI MD — Opioid and controlled substance prescribing (source line 829); explicit cadence absent.
- WI MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- WI DO — Opioid and controlled substance prescribing (source line 829); explicit cadence absent.
- WI DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- WV MD — Risk assessment and responsible prescribing / controlled substances (source line 839); explicit cadence absent.
- WV MD — Nutrition education (source line 840); explicit cadence absent.
- WV MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- WV DO — Drug diversion / best-practice prescribing (source line 1028); explicit cadence absent.
- WV DO — Nutrition education (source line 840); explicit cadence absent.
- WV DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- WY MD — Responsible controlled-substance prescribing / substance-abuse-disorder treatment (source line 850); explicit cadence absent.
- WY MD — DEA MATE Act / SUD training (source line 283); explicit cadence absent.
- WY DO — Responsible controlled-substance prescribing / substance-abuse-disorder treatment (source line 850); explicit cadence absent.
- WY DO — DEA MATE Act / SUD training (source line 283); explicit cadence absent.

## Historical regex results other than EVERY_RENEWAL

These are the removed algorithm’s outputs, not proposed facts. Verify all of them, including PA child abuse, TX human trafficking, and NV suicide prevention.

| State | License | Requirement | Previous regex output |
| --- | --- | --- | --- |
| AK | MD | Pain management and opioid use/addiction | CONDITIONAL |
| AK | MD | DEA MATE Act / SUD training | ONE_TIME |
| AK | DO | Pain management and opioid use/addiction | CONDITIONAL |
| AK | DO | DEA MATE Act / SUD training | ONE_TIME |
| AL | MD | Professional boundaries | ONE_TIME |
| AL | MD | Collaborative/supervisory practice CME | ONE_TIME |
| AL | MD | Controlled Substance Certificate CME | EVERY_N_YEARS |
| AL | DO | Professional boundaries | ONE_TIME |
| AL | DO | Collaborative/supervisory practice CME | ONE_TIME |
| AL | DO | Controlled Substance Certificate CME | EVERY_N_YEARS |
| AZ | MD | Opioid / controlled substance prescribing | CONDITIONAL |
| AZ | MD | DEA MATE Act / SUD training | ONE_TIME |
| AZ | DO | Opioid / controlled substance prescribing | CONDITIONAL |
| AZ | DO | DEA MATE Act / SUD training | ONE_TIME |
| CA | MD | Pain management and end-of-life care | ONE_TIME |
| CA | MD | Geriatric medicine | CONDITIONAL |
| CA | MD | DEA MATE Act / SUD training | ONE_TIME |
| CA | DO | Pain management and end-of-life care | ONE_TIME |
| CA | DO | DEA MATE Act / SUD training | ONE_TIME |
| CO | MD | DEA MATE Act / SUD training | ONE_TIME |
| CO | DO | DEA MATE Act / SUD training | ONE_TIME |
| CT | MD | Infectious diseases / HIV | EVERY_N_YEARS |
| CT | MD | Risk management | EVERY_N_YEARS |
| CT | MD | Sexual assault | EVERY_N_YEARS |
| CT | MD | Domestic violence | EVERY_N_YEARS |
| CT | MD | Cultural competency | EVERY_N_YEARS |
| CT | MD | Behavioral health | EVERY_N_YEARS |
| CT | MD | DEA MATE Act / SUD training | ONE_TIME |
| CT | DO | Infectious diseases / HIV | EVERY_N_YEARS |
| CT | DO | Risk management | EVERY_N_YEARS |
| CT | DO | Sexual assault | EVERY_N_YEARS |
| CT | DO | Domestic violence | EVERY_N_YEARS |
| CT | DO | Cultural competency | EVERY_N_YEARS |
| CT | DO | Behavioral health | EVERY_N_YEARS |
| CT | DO | DEA MATE Act / SUD training | ONE_TIME |
| DC | MD | DEA MATE Act / SUD training | ONE_TIME |
| DC | DO | DEA MATE Act / SUD training | ONE_TIME |
| DE | MD | Alzheimer's disease / dementias | CONDITIONAL |
| DE | MD | Delaware CSR applicant course | INITIAL_LICENSE_ONLY |
| DE | MD | Controlled substance prescribing | CONDITIONAL |
| DE | MD | DEA MATE Act / SUD training | ONE_TIME |
| DE | DO | Alzheimer's disease / dementias | CONDITIONAL |
| DE | DO | Delaware CSR applicant course | INITIAL_LICENSE_ONLY |
| DE | DO | Controlled substance prescribing | CONDITIONAL |
| DE | DO | DEA MATE Act / SUD training | ONE_TIME |
| FL | MD | Domestic violence | EVERY_N_YEARS |
| FL | MD | HIV/AIDS | FIRST_RENEWAL_ONLY |
| FL | MD | Human trafficking | ONE_TIME |
| FL | MD | Controlled substances | CONDITIONAL |
| FL | MD | DEA MATE Act / SUD training | ONE_TIME |
| FL | DO | Controlled substances | CONDITIONAL |
| FL | DO | HIV/AIDS | FIRST_RENEWAL_ONLY |
| FL | DO | Domestic violence | EVERY_N_YEARS |
| FL | DO | Human trafficking | ONE_TIME |
| FL | DO | DEA MATE Act / SUD training | ONE_TIME |
| GA | MD | Controlled substance prescribing | ONE_TIME |
| GA | MD | Professional boundaries / sexual misconduct | ONE_TIME |
| GA | MD | Pain management / palliative medicine | CONDITIONAL |
| GA | MD | DEA MATE Act / SUD training | ONE_TIME |
| GA | DO | Controlled substance prescribing | ONE_TIME |
| GA | DO | Professional boundaries / sexual misconduct | ONE_TIME |
| GA | DO | Pain management / palliative medicine | CONDITIONAL |
| GA | DO | DEA MATE Act / SUD training | ONE_TIME |
| HI | MD | DEA MATE Act / SUD training | ONE_TIME |
| HI | DO | DEA MATE Act / SUD training | ONE_TIME |
| IA | MD | Child abuse identification and reporting | EVERY_N_YEARS |
| IA | MD | Dependent adult abuse identification and reporting | EVERY_N_YEARS |
| IA | MD | End-of-life care | EVERY_N_YEARS |
| IA | MD | CDC opioid prescribing guidelines | EVERY_N_YEARS |
| IA | MD | DEA MATE Act / SUD training | ONE_TIME |
| IA | DO | Child abuse identification and reporting | EVERY_N_YEARS |
| IA | DO | Dependent adult abuse identification and reporting | EVERY_N_YEARS |
| IA | DO | End-of-life care | EVERY_N_YEARS |
| IA | DO | CDC opioid prescribing guidelines | EVERY_N_YEARS |
| IA | DO | DEA MATE Act / SUD training | ONE_TIME |
| ID | MD | DEA MATE Act / SUD training | ONE_TIME |
| ID | DO | DEA MATE Act / SUD training | ONE_TIME |
| IL | MD | Opioid prescribing | EVERY_N_YEARS |
| IL | MD | Implicit bias in health care | CONDITIONAL |
| IL | MD | Alzheimer's disease and dementia | EVERY_N_YEARS |
| IL | MD | Cultural competency | EVERY_N_YEARS |
| IL | MD | Child abuse / mandated reporter training | EVERY_N_YEARS |
| IL | DO | Opioid prescribing | EVERY_N_YEARS |
| IL | DO | Implicit bias in health care | CONDITIONAL |
| IL | DO | Alzheimer's disease and dementia | EVERY_N_YEARS |
| IL | DO | Cultural competency | EVERY_N_YEARS |
| IL | DO | Child abuse / mandated reporter training | EVERY_N_YEARS |
| IN | MD | DEA MATE Act / SUD training | ONE_TIME |
| IN | DO | DEA MATE Act / SUD training | ONE_TIME |
| KS | MD | DEA MATE Act / SUD training | ONE_TIME |
| KS | DO | DEA MATE Act / SUD training | ONE_TIME |
| KY | MD | KASPER / pain management / addiction | EVERY_N_YEARS |
| KY | MD | Addiction medicine | EVERY_N_YEARS |
| KY | MD | Domestic violence | INITIAL_LICENSE_ONLY |
| KY | MD | Pediatric abusive head trauma | ONE_TIME |
| KY | MD | DEA MATE Act / SUD training | ONE_TIME |
| KY | DO | KASPER / pain management / addiction | EVERY_N_YEARS |
| KY | DO | Addiction medicine | EVERY_N_YEARS |
| KY | DO | Domestic violence | INITIAL_LICENSE_ONLY |
| KY | DO | Pediatric abusive head trauma | ONE_TIME |
| KY | DO | DEA MATE Act / SUD training | ONE_TIME |
| LA | MD | Louisiana laws and rules | FIRST_RENEWAL_ONLY |
| LA | MD | CDS prescribing | ONE_TIME |
| LA | MD | DEA MATE Act / SUD training | ONE_TIME |
| LA | DO | Louisiana laws and rules | FIRST_RENEWAL_ONLY |
| LA | DO | CDS prescribing | ONE_TIME |
| LA | DO | DEA MATE Act / SUD training | ONE_TIME |
| MA | MD | Opioid education and pain management | CONDITIONAL |
| MA | MD | Implicit bias in health care | ONE_TIME |
| MA | MD | End-of-life care | ONE_TIME |
| MA | MD | Child abuse recognition and reporting | ONE_TIME |
| MA | MD | Domestic and sexual violence | ONE_TIME |
| MA | MD | Alzheimer's disease / dementias | ONE_TIME |
| MA | MD | EHR proficiency | ONE_TIME |
| MA | MD | DEA MATE Act / SUD training | ONE_TIME |
| MA | DO | Opioid education and pain management | CONDITIONAL |
| MA | DO | Implicit bias in health care | ONE_TIME |
| MA | DO | End-of-life care | ONE_TIME |
| MA | DO | Child abuse recognition and reporting | ONE_TIME |
| MA | DO | Domestic and sexual violence | ONE_TIME |
| MA | DO | Alzheimer's disease / dementias | ONE_TIME |
| MA | DO | EHR proficiency | ONE_TIME |
| MA | DO | DEA MATE Act / SUD training | ONE_TIME |
| MD | MD | New Physician Orientation | FIRST_RENEWAL_ONLY |
| MD | MD | Implicit bias + structural racism training | FIRST_RENEWAL_ONLY |
| MD | MD | Controlled dangerous substances CME | ONE_TIME |
| MD | MD | DEA MATE Act / SUD training | ONE_TIME |
| MD | DO | New Physician Orientation | FIRST_RENEWAL_ONLY |
| MD | DO | Implicit bias + structural racism training | FIRST_RENEWAL_ONLY |
| MD | DO | Controlled dangerous substances CME | ONE_TIME |
| MD | DO | DEA MATE Act / SUD training | ONE_TIME |
| ME | MD | DEA MATE Act / SUD training | ONE_TIME |
| ME | DO | Controlled substance / opioid prescribing | CONDITIONAL |
| ME | DO | DEA MATE Act / SUD training | ONE_TIME |
| MI | MD | Human trafficking identification | ONE_TIME |
| MI | MD | Opioids / controlled-substance awareness | CONDITIONAL |
| MI | MD | DEA MATE Act / SUD training | ONE_TIME |
| MI | DO | Human trafficking identification | ONE_TIME |
| MI | DO | Opioids / controlled-substance awareness | CONDITIONAL |
| MI | DO | DEA MATE Act / SUD training | ONE_TIME |
| MN | MD | DEA MATE Act / SUD training | ONE_TIME |
| MN | DO | DEA MATE Act / SUD training | ONE_TIME |
| MO | MD | DEA MATE Act / SUD training | ONE_TIME |
| MO | DO | DEA MATE Act / SUD training | ONE_TIME |
| MS | MD | DEA MATE Act / SUD training | ONE_TIME |
| MS | DO | DEA MATE Act / SUD training | ONE_TIME |
| MT | MD | DEA MATE Act / SUD training | ONE_TIME |
| MT | DO | DEA MATE Act / SUD training | ONE_TIME |
| NC | MD | Controlled substance prescribing | EVERY_N_YEARS |
| NC | MD | DEA MATE Act / SUD training | ONE_TIME |
| NC | DO | Controlled substance prescribing | EVERY_N_YEARS |
| NC | DO | DEA MATE Act / SUD training | ONE_TIME |
| ND | MD | DEA MATE Act / SUD training | ONE_TIME |
| ND | DO | DEA MATE Act / SUD training | ONE_TIME |
| NE | MD | Opioid prescribing | EVERY_N_YEARS |
| NE | MD | DEA MATE Act / SUD training | ONE_TIME |
| NE | DO | Opioid prescribing | EVERY_N_YEARS |
| NE | DO | DEA MATE Act / SUD training | ONE_TIME |
| NH | MD | Opioid prescribing / OUD treatment | EVERY_N_YEARS |
| NH | MD | DEA MATE Act / SUD training | ONE_TIME |
| NH | DO | Opioid prescribing / OUD treatment | EVERY_N_YEARS |
| NH | DO | DEA MATE Act / SUD training | ONE_TIME |
| NJ | MD | Cultural competency | ONE_TIME |
| NJ | MD | Implicit bias in perinatal care | CONDITIONAL |
| NJ | MD | DEA MATE Act / SUD training | ONE_TIME |
| NJ | DO | Cultural competency | ONE_TIME |
| NJ | DO | Implicit bias in perinatal care | CONDITIONAL |
| NJ | DO | DEA MATE Act / SUD training | ONE_TIME |
| NM | MD | Pain management and controlled substances | CONDITIONAL |
| NM | MD | DEA MATE Act / SUD training | ONE_TIME |
| NM | DO | Pain management | CONDITIONAL |
| NM | DO | DEA MATE Act / SUD training | ONE_TIME |
| NV | MD | Suicide prevention and awareness | INITIAL_LICENSE_ONLY |
| NV | MD | SBIRT | INITIAL_LICENSE_ONLY |
| NV | MD | HIV stigma / bias training | ONE_TIME |
| NV | MD | Controlled substances / opioid CE | CONDITIONAL |
| NV | MD | Cultural competency / DEI | EVERY_N_YEARS |
| NV | MD | DEA MATE Act / SUD training | ONE_TIME |
| NV | DO | Opioid / controlled substance education | CONDITIONAL |
| NV | DO | SBIRT | INITIAL_LICENSE_ONLY |
| NV | DO | Suicide prevention and awareness | EVERY_N_YEARS |
| NV | DO | HIV stigma / bias training | ONE_TIME |
| NV | DO | Cultural competency / DEI | EVERY_N_YEARS |
| NV | DO | DEA MATE Act / SUD training | ONE_TIME |
| NY | MD | Child abuse identification and reporting | ONE_TIME |
| NY | MD | Infection control and barrier precautions | INITIAL_LICENSE_ONLY |
| NY | MD | Pain management, palliative care, and addiction | EVERY_N_YEARS |
| NY | MD | DEA MATE Act / SUD training | ONE_TIME |
| NY | DO | Child abuse identification and reporting | ONE_TIME |
| NY | DO | Infection control and barrier precautions | INITIAL_LICENSE_ONLY |
| NY | DO | Pain management, palliative care, and addiction | EVERY_N_YEARS |
| NY | DO | DEA MATE Act / SUD training | ONE_TIME |
| OH | MD | Pain medicine (pain management clinics) | CONDITIONAL |
| OH | MD | DEA MATE Act / SUD training | ONE_TIME |
| OH | DO | Pain medicine (pain management clinics) | CONDITIONAL |
| OH | DO | DEA MATE Act / SUD training | ONE_TIME |
| OK | MD | Opioid prescribing / pain management | CONDITIONAL |
| OK | MD | Medical treatment laws (inpatient rights) presentation | CONDITIONAL |
| OK | MD | DEA MATE Act / SUD training | ONE_TIME |
| OK | DO | Proper prescribing | CONDITIONAL |
| OK | DO | Medical treatment laws (inpatient rights) presentation | CONDITIONAL |
| OK | DO | DEA MATE Act / SUD training | ONE_TIME |
| OR | MD | Pain management | INITIAL_LICENSE_ONLY |
| OR | MD | DEA MATE Act / SUD training | ONE_TIME |
| OR | DO | Pain management | INITIAL_LICENSE_ONLY |
| OR | DO | DEA MATE Act / SUD training | ONE_TIME |
| PA | MD | Child abuse recognition and reporting | INITIAL_LICENSE_ONLY |
| PA | MD | Initial opioid education | INITIAL_LICENSE_ONLY |
| PA | MD | Organ and tissue donation / recovery | INITIAL_LICENSE_ONLY |
| PA | MD | DEA MATE Act / SUD training | ONE_TIME |
| PA | DO | Child abuse recognition and reporting | INITIAL_LICENSE_ONLY |
| PA | DO | Initial opioid education | INITIAL_LICENSE_ONLY |
| PA | DO | Organ and tissue donation / recovery | INITIAL_LICENSE_ONLY |
| PA | DO | DEA MATE Act / SUD training | ONE_TIME |
| RI | MD | Alzheimer's disease / cognitive impairment | ONE_TIME |
| RI | MD | Opioid prescribing best practices | ONE_TIME |
| RI | MD | DEA MATE Act / SUD training | ONE_TIME |
| RI | DO | Alzheimer's disease / cognitive impairment | ONE_TIME |
| RI | DO | Opioid prescribing best practices | ONE_TIME |
| RI | DO | DEA MATE Act / SUD training | ONE_TIME |
| SC | MD | Human trafficking awareness and prevention | EVERY_N_YEARS |
| SC | MD | DEA MATE Act / SUD training | ONE_TIME |
| SC | DO | Human trafficking awareness and prevention | EVERY_N_YEARS |
| SC | DO | DEA MATE Act / SUD training | ONE_TIME |
| SD | MD | DEA MATE Act / SUD training | ONE_TIME |
| SD | DO | DEA MATE Act / SUD training | ONE_TIME |
| TN | MD | Controlled substance prescribing | CONDITIONAL |
| TN | MD | Nutrition | ONE_TIME |
| TN | MD | DEA MATE Act / SUD training | ONE_TIME |
| TN | DO | Controlled substance prescribing | CONDITIONAL |
| TN | DO | Nutrition | ONE_TIME |
| TN | DO | DEA MATE Act / SUD training | ONE_TIME |
| TX | MD | Safe prescribing / pain management | INITIAL_LICENSE_ONLY |
| TX | MD | Human trafficking prevention | FIRST_RENEWAL_ONLY |
| TX | MD | Forensic evidence collection / sexual assault survivor care | CONDITIONAL |
| TX | MD | Life of the Mother Act emergency care CE | INITIAL_LICENSE_ONLY |
| TX | MD | DEA MATE Act / SUD training | ONE_TIME |
| TX | DO | Safe prescribing / pain management | INITIAL_LICENSE_ONLY |
| TX | DO | Human trafficking prevention | FIRST_RENEWAL_ONLY |
| TX | DO | Forensic evidence collection / sexual assault survivor care | CONDITIONAL |
| TX | DO | Life of the Mother Act emergency care CE | INITIAL_LICENSE_ONLY |
| TX | DO | DEA MATE Act / SUD training | ONE_TIME |
| UT | MD | Controlled substance prescribing | CONDITIONAL |
| UT | MD | SBIRT | ONE_TIME |
| UT | MD | DEA MATE Act / SUD training | ONE_TIME |
| UT | DO | Controlled substance prescribing | CONDITIONAL |
| UT | DO | SBIRT | ONE_TIME |
| UT | DO | DEA MATE Act / SUD training | ONE_TIME |
| VA | MD | Office-based anesthesia | CONDITIONAL |
| VA | MD | DEA MATE Act / SUD training | ONE_TIME |
| VA | DO | Office-based anesthesia | CONDITIONAL |
| VA | DO | DEA MATE Act / SUD training | ONE_TIME |
| VT | MD | Safe and effective prescribing of controlled substances | CONDITIONAL |
| VT | MD | DEA MATE Act / SUD training | ONE_TIME |
| VT | DO | Safe and effective prescribing of controlled substances | CONDITIONAL |
| VT | DO | DEA MATE Act / SUD training | ONE_TIME |
| WA | MD | Suicide assessment, treatment, and management | ONE_TIME |
| WA | MD | Health equity | EVERY_N_YEARS |
| WA | MD | Opioid prescribing best practices | INITIAL_LICENSE_ONLY |
| WA | MD | DEA MATE Act / SUD training | ONE_TIME |
| WA | DO | Suicide assessment, treatment, and management | INITIAL_LICENSE_ONLY |
| WA | DO | Health equity | EVERY_N_YEARS |
| WA | DO | Opioid prescribing best practices | INITIAL_LICENSE_ONLY |
| WA | DO | DEA MATE Act / SUD training | ONE_TIME |
| WI | MD | Opioid and controlled substance prescribing | CONDITIONAL |
| WI | MD | DEA MATE Act / SUD training | ONE_TIME |
| WI | DO | Opioid and controlled substance prescribing | CONDITIONAL |
| WI | DO | DEA MATE Act / SUD training | ONE_TIME |
| WV | MD | Risk assessment and responsible prescribing / controlled substances | INITIAL_LICENSE_ONLY |
| WV | MD | Nutrition education | CONDITIONAL |
| WV | MD | DEA MATE Act / SUD training | ONE_TIME |
| WV | DO | Drug diversion / best-practice prescribing | INITIAL_LICENSE_ONLY |
| WV | DO | Nutrition education | CONDITIONAL |
| WV | DO | DEA MATE Act / SUD training | ONE_TIME |
| WY | MD | Responsible controlled-substance prescribing / substance-abuse-disorder treatment | EVERY_N_YEARS |
| WY | MD | DEA MATE Act / SUD training | ONE_TIME |
| WY | DO | Responsible controlled-substance prescribing / substance-abuse-disorder treatment | EVERY_N_YEARS |
| WY | DO | DEA MATE Act / SUD training | ONE_TIME |

## Accepted credit categories

acceptedCreditTypes will remain empty. The following source labels specify categories; the exact accepted enum list and any minimum/maximum mix need independent verification.

- AK MD: 50 hours per 2-year cycle, averaging 25 hours/year (AMA Category I or board-recognized equivalent); first renewal is prorated — an average of 25 hrs per year of your initial license period (12 AAC 40.200(a)), and physicians licensed in the cycle's final year owe only the 2-hr pain management/opioid topic; 2-year renewal cycle
- AK DO: 50 hours per 2-year cycle, averaging 25 hours/year (AOA Category I/II or board-recognized equivalent); first renewal is prorated — an average of 25 hrs per year of your initial license period (12 AAC 40.200(a)), and physicians licensed in the cycle's final year owe only the 2-hr pain management/opioid topic; 2-year renewal cycle
- AL MD: 25 AMA PRA Category 1 / AOA Category 1-A equivalent credits; no Category 2; Annual renewal cycle
- AL DO: 25 AMA PRA Category 1 / AOA Category 1-A equivalent credits; no Category 2; Annual renewal cycle
- AR MD: 20 hours annually; at least 10 Category 1 hours in your primary area of practice; Annual renewal cycle
- AR DO: 20 hours annually; at least 10 Category 1 hours in your primary area of practice; Annual renewal cycle
- AZ MD: 40 hours (accepted activities include ACCME Category 1 and other board-recognized CME; no carryover); 2-year renewal cycle
- AZ DO: 40 hours (at least 24 AOA Category 1A; no more than 16 AMA Category 1); 2-year renewal cycle
- CA DO: 50 hours (20 AOA Category 1A/1B; remaining 30 may be AOA or AMA-accredited); 2-year renewal cycle tied to the osteopathic license renewal period
- DC MD: 50 AMA PRA Category 1 hours; 2-year renewal cycle ending the last day of your birth month
- DC DO: 50 AMA PRA Category 1 hours; 2-year renewal cycle ending the last day of your birth month
- FL DO: 40 hours (at least 20 AOA Category 1-A); 2-year renewal cycle
- HI MD: 40 hours Category 1 or 1A (20 if this is your first renewal; 40 for everyone beginning with the 2028 renewal) — the Board's enforced standard per its 2026 renewal/audit notices and HRS §453-6, which recognizes only Category 1/1A CME; the unamended codified rule (HAR §16-85-33) still recites 100 hours with a Category 2 pathway; 2-year renewal cycle
- HI DO: 40 hours Category 1 or 1A (20 if this is your first renewal; 40 for everyone beginning with the 2028 renewal) — the Board's enforced standard per its 2026 renewal/audit notices and HRS §453-6, which recognizes only Category 1/1A CME; the unamended codified rule (HAR §16-85-33) still recites 100 hours with a Category 2 pathway; 2-year renewal cycle
- LA MD: 20 board-approved CME hours annually (Category 1 pathways include ACCME, AAFP, ACOG, AOA, LSMS, ABMS/AOA specialty-board, or other board-recognized providers); new licensees are exempt from the 20 annual hours at their first renewal (per LSBME); Annual renewal cycle
- LA DO: 20 board-approved CME hours annually (Category 1 pathways include ACCME, AAFP, ACOG, AOA, LSMS, ABMS/AOA specialty-board, or other board-recognized providers); new licensees are exempt from the 20 annual hours at their first renewal (per LSBME); Annual renewal cycle
- MD MD: 50 hours (at least 25 Category 1; remaining 25 may be Category 2); 2-year renewal cycle; first renewal is CME-exempt but NPO is still required
- MD DO: 50 hours (at least 25 Category 1; remaining 25 may be Category 2); 2-year renewal cycle; first renewal is CME-exempt but NPO is still required
- ME MD: 40 Category 1 hours (first renewal prorated by month of licensure); 2-year renewal cycle
- MI MD: 150 hours (at least 75 Category 1); 3-year renewal cycle; renewal date varies by physician/license record
- MI DO: 150 hours (at least 60 Category 1; at least 40 hours through AOA/MOA-approved Category 1A-style programs); 3-year renewal cycle; renewal date varies by physician/license record
- NE MD: 50 hours (up to 25 general Category 1 hours may carry over; first renewal after initial licensure typically exempt); 2-year renewal cycle
- NE DO: 50 hours (up to 25 general Category 1 hours may carry over; first renewal after initial licensure typically exempt); 2-year renewal cycle
- NH MD: 100 hours (at least 40 Category I; no more than 60 Category II); 2-year renewal cycle
- NH DO: 100 hours (at least 40 Category I; no more than 60 Category II); 2-year renewal cycle
- NJ MD: 100 credits (at least 40 Category I; Category I/II recognized by AMA, AOA, ACCME, or comparable board-recognized bodies); 2-year renewal cycle; initial accredited-GME exemption may apply with board orientation due within 24 months
- NJ DO: 100 credits (at least 40 Category I; Category I/II recognized by AMA, AOA, ACCME, or comparable board-recognized bodies); 2-year renewal cycle; initial accredited-GME exemption may apply with board orientation due within 24 months
- NM DO: 75 credits (at least 30 AOA Category 1-A or 1-B); 3-year renewal cycle; DO audit may include credits earned up to 6 months before the current triennial cycle
- NV MD: 40 Category 1 hours (20 hours must be in specialty or scope of practice); first cycle prorated by when in the biennium you were licensed — 40 hrs (first 6 months), 30 (second), 20 (third), 10 (fourth) (NAC 630.157, except as provided in NAC 630.153); 2-year renewal cycle
- NV DO: 40 hours per 2-year cycle (NRS 633.471 as amended by AB 56 (2025), effective Jan. 1, 2026; NSBOM's Category 1A minimum under NAC 633.250 is pending conformance to the new statute); Biennial renewal cycle; DO licenses renew on or before December 31 of even-numbered years (AB 56, effective Jan. 1, 2026)
- PA MD: 100 hours (at least 20 AMA PRA Category 1; retain CME records 2 years after renewal; MD registration expires Dec. 31 of even-numbered years); 2-year renewal cycle; first-time PA licensure is CME-exempt for the following biennial renewal period
- PA DO: 100 hours (at least 20 AOA Category 1-A); 2-year renewal cycle; first-time PA licensure is CME-exempt for the following biennial renewal period
- TN DO: 40 hours (DO accepted credits: AOA 1A/2A/1B with max 20 hrs 1B; ACCME AMA PRA Category 1; AAFP Prescribed); 2-year renewal cycle; for 2025+ use 24 months preceding renewal, not two calendar years
- TX MD: 48 hours (at least 24 formal Category 1/1A credits; ACCME/AMA PRA, AAFP Prescribed, AOA Category 1-A, or TMA-approved); 2-year renewal cycle; newly licensed physicians are exempt at first registration/renewal. CE Broker reporting mandatory for renewals on/after Sept. 1, 2026
- TX DO: 48 hours (at least 24 formal Category 1/1A credits; ACCME/AMA PRA, AAFP Prescribed, AOA Category 1-A, or TMA-approved); 2-year renewal cycle; newly licensed physicians are exempt at first registration/renewal. CE Broker reporting mandatory for renewals on/after Sept. 1, 2026
- UT MD: 40 hours (34 Category 1 minimum); 2-year renewal cycle; MD licenses expire January 31 of even-numbered years
- UT DO: 40 hours (34 AOA or ACCME Category 1 minimum); 2-year renewal cycle; DO licenses expire May 31 of even-numbered years
- VT DO: 30 hours (AOA-approved CE accepted; the former 40% osteopathic sub-requirement was repealed — 26 V.S.A. 1836(d) '[Repealed]'); 2-year renewal cycle; DO licenses expire September 30 of even-numbered years
- WA MD: 200 hours (Category I allowed for all hours; Category II-V limits apply); 4-year CME reporting cycle; license renews every 2 years on your birthday
- WA DO: 150 hours (at least 60 Category 1A per WA DOH; WAC 246-853-070 uses broader Category 1 wording); 3-year CE reporting cycle; license renews every year on your birthday
- WI MD: 30 hours of AMA PRA Category 1 / AOA Category 1 (or ACCME-recognized equivalent) credit; no Category 2 (Med 13.03(1)(b)); 2-year renewal cycle
- WI DO: 30 hours of AMA PRA Category 1 / AOA Category 1 (or ACCME-recognized equivalent) credit; no Category 2 (Med 13.03(1)(b)); 2-year renewal cycle
- WV DO: 32 hours (at least 16 AOA Category 1A/1B); 2-year renewal cycle; DO renewal due on or before July 1
- WY MD: 60 hours over the 3-year CME lookback (AMA Category I/II, AOA, or Board-recognized equivalents); 3-year CME reporting lookback; license renewal is annual by June 30
- WY DO: 60 hours over the 3-year CME lookback (AMA Category I/II, AOA, or Board-recognized equivalents); 3-year CME reporting lookback; license renewal is annual by June 30
