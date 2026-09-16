# Run A fact questions

No compliance facts were populated. Source line numbers refer to lib/state-requirements.ts on the Run A branch.

## Migration identity collisions

Resolved locally September 16, 2026: Michael explicitly approved the eight-row mapping in `requirement-key-resolution-a.json`. The migration assigned description-based discriminators while preserving every ID, completion link and compliance fact. These four groups have no remaining key collisions. Unapproved groups or a changed approved row still fail before backfill. Production was not queried. See `MIGRATION-REPAIR-A.md` and `local-migration-verification-a.json`.

- MI:MD:OTHER_MANDATORY: 2 existing rows.
- NV:MD:OTHER_MANDATORY: 2 existing rows.
- LA:MD:OTHER_MANDATORY: 2 existing rows.
- FL:MD:OTHER_MANDATORY: 2 existing rows.

## Cadence fields missing

Current value: no typed cadence/intervalYears. Proposed value: UNKNOWN pending Vera/Roz verification; the sync stores CONDITIONAL plus UNVERIFIED-CADENCE, preserving existing attestationAllowed. This is a review marker, not an inferred regulatory cadence.

- AK MD — Pain management and opioid use/addiction (source line 292); explicit cadence absent.
- AK MD — DEA MATE Act / SUD training (source line 293); explicit cadence absent.
- AK DO — Pain management and opioid use/addiction (source line 863); explicit cadence absent.
- AK DO — DEA MATE Act / SUD training (source line 864); explicit cadence absent.
- AL MD — Professional boundaries (source line 302); explicit cadence absent.
- AL MD — Collaborative/supervisory practice CME (source line 303); explicit cadence absent.
- AL MD — Controlled Substance Certificate CME (source line 304); explicit cadence absent.
- AL DO — Professional boundaries (source line 302); explicit cadence absent.
- AL DO — Collaborative/supervisory practice CME (source line 303); explicit cadence absent.
- AL DO — Controlled Substance Certificate CME (source line 304); explicit cadence absent.
- AR MD — Opioid/benzodiazepine prescribing (source line 313); explicit cadence absent.
- AR DO — Opioid/benzodiazepine prescribing (source line 313); explicit cadence absent.
- AZ MD — Opioid / controlled substance prescribing (source line 322); explicit cadence absent.
- AZ MD — DEA MATE Act / SUD training (source line 323); explicit cadence absent.
- AZ DO — Opioid / controlled substance prescribing (source line 873); explicit cadence absent.
- AZ DO — DEA MATE Act / SUD training (source line 874); explicit cadence absent.
- CA MD — Pain management and end-of-life care (source line 332); explicit cadence absent.
- CA MD — Geriatric medicine (source line 333); explicit cadence absent.
- CA MD — DEA MATE Act / SUD training (source line 334); explicit cadence absent.
- CA DO — Schedule II drugs / opioid addiction-risk course (source line 883); explicit cadence absent.
- CA DO — Pain management and end-of-life care (source line 884); explicit cadence absent.
- CA DO — DEA MATE Act / SUD training (source line 885); explicit cadence absent.
- CO MD — DEA MATE Act / SUD training (source line 343); explicit cadence absent.
- CO DO — DEA MATE Act / SUD training (source line 343); explicit cadence absent.
- CT MD — Infectious diseases / HIV (source line 352); explicit cadence absent.
- CT MD — Risk management (source line 353); explicit cadence absent.
- CT MD — Sexual assault (source line 354); explicit cadence absent.
- CT MD — Domestic violence (source line 355); explicit cadence absent.
- CT MD — Cultural competency (source line 356); explicit cadence absent.
- CT MD — Behavioral health (source line 357); explicit cadence absent.
- CT MD — DEA MATE Act / SUD training (source line 358); explicit cadence absent.
- CT DO — Infectious diseases / HIV (source line 352); explicit cadence absent.
- CT DO — Risk management (source line 353); explicit cadence absent.
- CT DO — Sexual assault (source line 354); explicit cadence absent.
- CT DO — Domestic violence (source line 355); explicit cadence absent.
- CT DO — Cultural competency (source line 356); explicit cadence absent.
- CT DO — Behavioral health (source line 357); explicit cadence absent.
- CT DO — DEA MATE Act / SUD training (source line 358); explicit cadence absent.
- DC MD — LGBTQ cultural competency (source line 367); explicit cadence absent.
- DC MD — Pharmacology (source line 368); explicit cadence absent.
- DC MD — Public health priority topics (source line 369); explicit cadence absent.
- DC MD — DEA MATE Act / SUD training (source line 370); explicit cadence absent.
- DC DO — LGBTQ cultural competency (source line 367); explicit cadence absent.
- DC DO — Pharmacology (source line 368); explicit cadence absent.
- DC DO — Public health priority topics (source line 369); explicit cadence absent.
- DC DO — DEA MATE Act / SUD training (source line 370); explicit cadence absent.
- DE MD — Child abuse / domestic violence recognition and reporting (source line 379); explicit cadence absent.
- DE MD — Alzheimer's disease / dementias (source line 380); explicit cadence absent.
- DE MD — Delaware CSR applicant course (source line 381); explicit cadence absent.
- DE MD — Controlled substance prescribing (source line 382); explicit cadence absent.
- DE MD — DEA MATE Act / SUD training (source line 383); explicit cadence absent.
- DE DO — Child abuse / domestic violence recognition and reporting (source line 379); explicit cadence absent.
- DE DO — Alzheimer's disease / dementias (source line 380); explicit cadence absent.
- DE DO — Delaware CSR applicant course (source line 381); explicit cadence absent.
- DE DO — Controlled substance prescribing (source line 382); explicit cadence absent.
- DE DO — DEA MATE Act / SUD training (source line 383); explicit cadence absent.
- FL MD — Prevention of medical errors (source line 392); explicit cadence absent.
- FL MD — Domestic violence (source line 393); explicit cadence absent.
- FL MD — HIV/AIDS (source line 394); explicit cadence absent.
- FL MD — Human trafficking (source line 395); explicit cadence absent.
- FL MD — Controlled substances (source line 396); explicit cadence absent.
- FL MD — DEA MATE Act / SUD training (source line 397); explicit cadence absent.
- FL DO — Florida laws / rules and ethics (source line 894); explicit cadence absent.
- FL DO — Prevention of medical errors (source line 895); explicit cadence absent.
- FL DO — Controlled substances (source line 896); explicit cadence absent.
- FL DO — HIV/AIDS (source line 897); explicit cadence absent.
- FL DO — Domestic violence (source line 898); explicit cadence absent.
- FL DO — Human trafficking (source line 899); explicit cadence absent.
- FL DO — DEA MATE Act / SUD training (source line 900); explicit cadence absent.
- GA MD — Controlled substance prescribing (source line 406); explicit cadence absent.
- GA MD — Professional boundaries / sexual misconduct (source line 407); explicit cadence absent.
- GA MD — Pain management / palliative medicine (source line 408); explicit cadence absent.
- GA MD — DEA MATE Act / SUD training (source line 409); explicit cadence absent.
- GA DO — Controlled substance prescribing (source line 406); explicit cadence absent.
- GA DO — Professional boundaries / sexual misconduct (source line 407); explicit cadence absent.
- GA DO — Pain management / palliative medicine (source line 408); explicit cadence absent.
- GA DO — DEA MATE Act / SUD training (source line 409); explicit cadence absent.
- HI MD — DEA MATE Act / SUD training (source line 417); explicit cadence absent.
- HI DO — DEA MATE Act / SUD training (source line 417); explicit cadence absent.
- IA MD — Child abuse identification and reporting (source line 425); explicit cadence absent.
- IA MD — Dependent adult abuse identification and reporting (source line 426); explicit cadence absent.
- IA MD — End-of-life care (source line 427); explicit cadence absent.
- IA MD — CDC opioid prescribing guidelines (source line 428); explicit cadence absent.
- IA MD — DEA MATE Act / SUD training (source line 429); explicit cadence absent.
- IA DO — Child abuse identification and reporting (source line 425); explicit cadence absent.
- IA DO — Dependent adult abuse identification and reporting (source line 426); explicit cadence absent.
- IA DO — End-of-life care (source line 427); explicit cadence absent.
- IA DO — CDC opioid prescribing guidelines (source line 428); explicit cadence absent.
- IA DO — DEA MATE Act / SUD training (source line 429); explicit cadence absent.
- ID MD — DEA MATE Act / SUD training (source line 437); explicit cadence absent.
- ID DO — DEA MATE Act / SUD training (source line 437); explicit cadence absent.
- IL MD — Opioid prescribing (source line 445); explicit cadence absent.
- IL MD — Sexual harassment prevention (source line 446); explicit cadence absent.
- IL MD — Implicit bias in health care (source line 447); explicit cadence absent.
- IL MD — Alzheimer's disease and dementia (source line 448); explicit cadence absent.
- IL MD — Cultural competency (source line 449); explicit cadence absent.
- IL MD — Child abuse / mandated reporter training (source line 450); explicit cadence absent.
- IL DO — Opioid prescribing (source line 445); explicit cadence absent.
- IL DO — Sexual harassment prevention (source line 446); explicit cadence absent.
- IL DO — Implicit bias in health care (source line 447); explicit cadence absent.
- IL DO — Alzheimer's disease and dementia (source line 448); explicit cadence absent.
- IL DO — Cultural competency (source line 449); explicit cadence absent.
- IL DO — Child abuse / mandated reporter training (source line 450); explicit cadence absent.
- IN MD — DEA MATE Act / SUD training (source line 458); explicit cadence absent.
- IN DO — DEA MATE Act / SUD training (source line 458); explicit cadence absent.
- KS MD — Category III credits (source line 466); explicit cadence absent.
- KS MD — DEA MATE Act / SUD training (source line 467); explicit cadence absent.
- KS DO — Category III credits (source line 466); explicit cadence absent.
- KS DO — DEA MATE Act / SUD training (source line 467); explicit cadence absent.
- KY MD — KASPER / pain management / addiction (source line 476); explicit cadence absent.
- KY MD — Addiction medicine (source line 477); explicit cadence absent.
- KY MD — Domestic violence (source line 478); explicit cadence absent.
- KY MD — Pediatric abusive head trauma (source line 479); explicit cadence absent.
- KY MD — DEA MATE Act / SUD training (source line 480); explicit cadence absent.
- KY DO — KASPER / pain management / addiction (source line 476); explicit cadence absent.
- KY DO — Addiction medicine (source line 477); explicit cadence absent.
- KY DO — Domestic violence (source line 478); explicit cadence absent.
- KY DO — Pediatric abusive head trauma (source line 479); explicit cadence absent.
- KY DO — DEA MATE Act / SUD training (source line 480); explicit cadence absent.
- LA MD — Louisiana laws and rules (source line 489); explicit cadence absent.
- LA MD — CDS prescribing (source line 490); explicit cadence absent.
- LA MD — DEA MATE Act / SUD training (source line 491); explicit cadence absent.
- LA DO — Louisiana laws and rules (source line 489); explicit cadence absent.
- LA DO — CDS prescribing (source line 490); explicit cadence absent.
- LA DO — DEA MATE Act / SUD training (source line 491); explicit cadence absent.
- MA MD — Risk management (source line 500); explicit cadence absent.
- MA MD — Board regulations review (source line 501); explicit cadence absent.
- MA MD — Opioid education and pain management (source line 502); explicit cadence absent.
- MA MD — Implicit bias in health care (source line 503); explicit cadence absent.
- MA MD — End-of-life care (source line 504); explicit cadence absent.
- MA MD — Child abuse recognition and reporting (source line 505); explicit cadence absent.
- MA MD — Domestic and sexual violence (source line 506); explicit cadence absent.
- MA MD — Alzheimer's disease / dementias (source line 507); explicit cadence absent.
- MA MD — EHR proficiency (source line 508); explicit cadence absent.
- MA MD — DEA MATE Act / SUD training (source line 509); explicit cadence absent.
- MA DO — Risk management (source line 500); explicit cadence absent.
- MA DO — Board regulations review (source line 501); explicit cadence absent.
- MA DO — Opioid education and pain management (source line 502); explicit cadence absent.
- MA DO — Implicit bias in health care (source line 503); explicit cadence absent.
- MA DO — End-of-life care (source line 504); explicit cadence absent.
- MA DO — Child abuse recognition and reporting (source line 505); explicit cadence absent.
- MA DO — Domestic and sexual violence (source line 506); explicit cadence absent.
- MA DO — Alzheimer's disease / dementias (source line 507); explicit cadence absent.
- MA DO — EHR proficiency (source line 508); explicit cadence absent.
- MA DO — DEA MATE Act / SUD training (source line 509); explicit cadence absent.
- MD MD — New Physician Orientation (source line 518); explicit cadence absent.
- MD MD — Implicit bias + structural racism training (source line 519); explicit cadence absent.
- MD MD — Controlled dangerous substances CME (source line 520); explicit cadence absent.
- MD MD — DEA MATE Act / SUD training (source line 521); explicit cadence absent.
- MD DO — New Physician Orientation (source line 518); explicit cadence absent.
- MD DO — Implicit bias + structural racism training (source line 519); explicit cadence absent.
- MD DO — Controlled dangerous substances CME (source line 520); explicit cadence absent.
- MD DO — DEA MATE Act / SUD training (source line 521); explicit cadence absent.
- ME MD — Controlled substance / opioid prescribing (source line 530); explicit cadence absent.
- ME MD — Maine jurisprudence exam (source line 531); explicit cadence absent.
- ME MD — DEA MATE Act / SUD training (source line 532); explicit cadence absent.
- ME DO — Controlled substance / opioid prescribing (source line 909); explicit cadence absent.
- ME DO — DEA MATE Act / SUD training (source line 910); explicit cadence absent.
- MI MD — Medical ethics (source line 541); explicit cadence absent.
- MI MD — Pain and symptom management (source line 542); explicit cadence absent.
- MI MD — Implicit bias (source line 543); explicit cadence absent.
- MI MD — Human trafficking identification (source line 544); explicit cadence absent.
- MI MD — Opioids / controlled-substance awareness (source line 545); explicit cadence absent.
- MI MD — DEA MATE Act / SUD training (source line 546); explicit cadence absent.
- MI DO — Medical ethics (source line 919); explicit cadence absent.
- MI DO — Pain and symptom management (source line 920); explicit cadence absent.
- MI DO — Implicit bias (source line 921); explicit cadence absent.
- MI DO — Human trafficking identification (source line 922); explicit cadence absent.
- MI DO — Opioids / controlled-substance awareness (source line 923); explicit cadence absent.
- MI DO — DEA MATE Act / SUD training (source line 924); explicit cadence absent.
- MN MD — DEA MATE Act / SUD training (source line 555); explicit cadence absent.
- MN DO — DEA MATE Act / SUD training (source line 555); explicit cadence absent.
- MO MD — Health benefits of nutrition (source line 564); explicit cadence absent.
- MO MD — DEA MATE Act / SUD training (source line 565); explicit cadence absent.
- MO DO — Health benefits of nutrition (source line 564); explicit cadence absent.
- MO DO — DEA MATE Act / SUD training (source line 565); explicit cadence absent.
- MS MD — DEA MATE Act / SUD training (source line 574); explicit cadence absent.
- MS DO — DEA MATE Act / SUD training (source line 574); explicit cadence absent.
- MT MD — DEA MATE Act / SUD training (source line 582); explicit cadence absent.
- MT DO — DEA MATE Act / SUD training (source line 582); explicit cadence absent.
- NC MD — Controlled substance prescribing (source line 590); explicit cadence absent.
- NC MD — DEA MATE Act / SUD training (source line 591); explicit cadence absent.
- NC DO — Controlled substance prescribing (source line 590); explicit cadence absent.
- NC DO — DEA MATE Act / SUD training (source line 591); explicit cadence absent.
- ND MD — Nutrition and metabolic health (source line 600); explicit cadence absent.
- ND MD — Abortion instructional course (source line 601); explicit cadence absent.
- ND MD — DEA MATE Act / SUD training (source line 602); explicit cadence absent.
- ND DO — Nutrition and metabolic health (source line 600); explicit cadence absent.
- ND DO — Abortion instructional course (source line 601); explicit cadence absent.
- ND DO — DEA MATE Act / SUD training (source line 602); explicit cadence absent.
- NE MD — Opioid prescribing (source line 611); explicit cadence absent.
- NE MD — DEA MATE Act / SUD training (source line 612); explicit cadence absent.
- NE DO — Opioid prescribing (source line 611); explicit cadence absent.
- NE DO — DEA MATE Act / SUD training (source line 612); explicit cadence absent.
- NH MD — Opioid prescribing / OUD treatment (source line 621); explicit cadence absent.
- NH MD — DEA MATE Act / SUD training (source line 622); explicit cadence absent.
- NH DO — Opioid prescribing / OUD treatment (source line 621); explicit cadence absent.
- NH DO — DEA MATE Act / SUD training (source line 622); explicit cadence absent.
- NJ MD — Cultural competency (source line 631); explicit cadence absent.
- NJ MD — End-of-life care (source line 632); explicit cadence absent.
- NJ MD — Opioid prescribing (source line 633); explicit cadence absent.
- NJ MD — Sexual misconduct prevention (source line 634); explicit cadence absent.
- NJ MD — Implicit bias in perinatal care (source line 635); explicit cadence absent.
- NJ MD — DEA MATE Act / SUD training (source line 636); explicit cadence absent.
- NJ DO — Cultural competency (source line 631); explicit cadence absent.
- NJ DO — End-of-life care (source line 632); explicit cadence absent.
- NJ DO — Opioid prescribing (source line 633); explicit cadence absent.
- NJ DO — Sexual misconduct prevention (source line 634); explicit cadence absent.
- NJ DO — Implicit bias in perinatal care (source line 635); explicit cadence absent.
- NJ DO — DEA MATE Act / SUD training (source line 636); explicit cadence absent.
- NM MD — New Mexico Medical Practice Act review (source line 645); explicit cadence absent.
- NM MD — Pain management and controlled substances (source line 646); explicit cadence absent.
- NM MD — DEA MATE Act / SUD training (source line 647); explicit cadence absent.
- NM DO — New Mexico Osteopathic Medical Practice Act and Board rules review (source line 948); explicit cadence absent.
- NM DO — Pain management (source line 949); explicit cadence absent.
- NM DO — DEA MATE Act / SUD training (source line 950); explicit cadence absent.
- NV MD — Ethics, pain management, or addiction care (source line 656); explicit cadence absent.
- NV MD — Suicide prevention and awareness (source line 657); explicit cadence absent.
- NV MD — SBIRT (source line 658); explicit cadence absent.
- NV MD — HIV stigma / bias training (source line 659); explicit cadence absent.
- NV MD — Controlled substances / opioid CE (source line 660); explicit cadence absent.
- NV MD — Cultural competency / DEI (source line 661); explicit cadence absent.
- NV MD — DEA MATE Act / SUD training (source line 662); explicit cadence absent.
- NV DO — Opioid / controlled substance education (source line 933); explicit cadence absent.
- NV DO — Ethics, pain management, addiction care, or SBIRT (source line 934); explicit cadence absent.
- NV DO — SBIRT (source line 935); explicit cadence absent.
- NV DO — Suicide prevention and awareness (source line 936); explicit cadence absent.
- NV DO — HIV stigma / bias training (source line 937); explicit cadence absent.
- NV DO — Cultural competency / DEI (source line 938); explicit cadence absent.
- NV DO — DEA MATE Act / SUD training (source line 939); explicit cadence absent.
- NY MD — Child abuse identification and reporting (source line 671); explicit cadence absent.
- NY MD — Infection control and barrier precautions (source line 672); explicit cadence absent.
- NY MD — Pain management, palliative care, and addiction (source line 673); explicit cadence absent.
- NY MD — DEA MATE Act / SUD training (source line 674); explicit cadence absent.
- NY DO — Child abuse identification and reporting (source line 671); explicit cadence absent.
- NY DO — Infection control and barrier precautions (source line 672); explicit cadence absent.
- NY DO — Pain management, palliative care, and addiction (source line 673); explicit cadence absent.
- NY DO — DEA MATE Act / SUD training (source line 674); explicit cadence absent.
- OH MD — Duty to report misconduct (source line 683); explicit cadence absent.
- OH MD — Pain medicine (pain management clinics) (source line 684); explicit cadence absent.
- OH MD — DEA MATE Act / SUD training (source line 685); explicit cadence absent.
- OH DO — Duty to report misconduct (source line 683); explicit cadence absent.
- OH DO — Pain medicine (pain management clinics) (source line 684); explicit cadence absent.
- OH DO — DEA MATE Act / SUD training (source line 685); explicit cadence absent.
- OK MD — Opioid prescribing / pain management (source line 694); explicit cadence absent.
- OK MD — Medical treatment laws (inpatient rights) presentation (source line 695); explicit cadence absent.
- OK MD — DEA MATE Act / SUD training (source line 696); explicit cadence absent.
- OK DO — Proper prescribing (source line 959); explicit cadence absent.
- OK DO — Medical treatment laws (inpatient rights) presentation (source line 960); explicit cadence absent.
- OK DO — DEA MATE Act / SUD training (source line 961); explicit cadence absent.
- OR MD — Pain management (source line 705); explicit cadence absent.
- OR MD — Cultural competency (source line 706); explicit cadence absent.
- OR MD — DEA MATE Act / SUD training (source line 707); explicit cadence absent.
- OR DO — Pain management (source line 705); explicit cadence absent.
- OR DO — Cultural competency (source line 706); explicit cadence absent.
- OR DO — DEA MATE Act / SUD training (source line 707); explicit cadence absent.
- PA MD — Patient safety / risk management (source line 716); explicit cadence absent.
- PA MD — Child abuse recognition and reporting (source line 717); explicit cadence absent.
- PA MD — Pain management / opioid prescribing (source line 718); explicit cadence absent.
- PA MD — Initial opioid education (source line 719); explicit cadence absent.
- PA MD — Organ and tissue donation / recovery (source line 720); explicit cadence absent.
- PA MD — DEA MATE Act / SUD training (source line 721); explicit cadence absent.
- PA DO — Patient safety / risk management (source line 970); explicit cadence absent.
- PA DO — Child abuse recognition and reporting (source line 971); explicit cadence absent.
- PA DO — Pain management / opioid prescribing (source line 972); explicit cadence absent.
- PA DO — Initial opioid education (source line 973); explicit cadence absent.
- PA DO — Organ and tissue donation / recovery (source line 974); explicit cadence absent.
- PA DO — DEA MATE Act / SUD training (source line 975); explicit cadence absent.
- RI MD — Alzheimer's disease / cognitive impairment (source line 730); explicit cadence absent.
- RI MD — Opioid prescribing best practices (source line 731); explicit cadence absent.
- RI MD — DEA MATE Act / SUD training (source line 732); explicit cadence absent.
- RI DO — Alzheimer's disease / cognitive impairment (source line 730); explicit cadence absent.
- RI DO — Opioid prescribing best practices (source line 731); explicit cadence absent.
- RI DO — DEA MATE Act / SUD training (source line 732); explicit cadence absent.
- SC MD — Prescribing and monitoring controlled substances (source line 741); explicit cadence absent.
- SC MD — Human trafficking awareness and prevention (source line 742); explicit cadence absent.
- SC MD — DEA MATE Act / SUD training (source line 743); explicit cadence absent.
- SC DO — Prescribing and monitoring controlled substances (source line 741); explicit cadence absent.
- SC DO — Human trafficking awareness and prevention (source line 742); explicit cadence absent.
- SC DO — DEA MATE Act / SUD training (source line 743); explicit cadence absent.
- SD MD — DEA MATE Act / SUD training (source line 751); explicit cadence absent.
- SD DO — DEA MATE Act / SUD training (source line 751); explicit cadence absent.
- TN MD — Controlled substance prescribing (source line 759); explicit cadence absent.
- TN MD — Nutrition (source line 760); explicit cadence absent.
- TN MD — DEA MATE Act / SUD training (source line 761); explicit cadence absent.
- TN DO — Controlled substance prescribing (source line 984); explicit cadence absent.
- TN DO — Nutrition (source line 985); explicit cadence absent.
- TN DO — DEA MATE Act / SUD training (source line 986); explicit cadence absent.
- TX MD — Medical ethics / professional responsibility (source line 770); explicit cadence absent.
- TX MD — Safe prescribing / pain management (source line 771); explicit cadence absent.
- TX MD — Human trafficking prevention (source line 772); explicit cadence absent.
- TX MD — Forensic evidence collection / sexual assault survivor care (source line 773); explicit cadence absent.
- TX MD — Nutrition and metabolic health (source line 774); explicit cadence absent.
- TX MD — Life of the Mother Act emergency care CE (source line 775); explicit cadence absent.
- TX MD — DEA MATE Act / SUD training (source line 776); explicit cadence absent.
- TX DO — Medical ethics / professional responsibility (source line 770); explicit cadence absent.
- TX DO — Safe prescribing / pain management (source line 771); explicit cadence absent.
- TX DO — Human trafficking prevention (source line 772); explicit cadence absent.
- TX DO — Forensic evidence collection / sexual assault survivor care (source line 773); explicit cadence absent.
- TX DO — Nutrition and metabolic health (source line 774); explicit cadence absent.
- TX DO — Life of the Mother Act emergency care CE (source line 775); explicit cadence absent.
- TX DO — DEA MATE Act / SUD training (source line 776); explicit cadence absent.
- UT MD — Controlled substance prescribing (source line 785); explicit cadence absent.
- UT MD — SBIRT (source line 786); explicit cadence absent.
- UT MD — DEA MATE Act / SUD training (source line 787); explicit cadence absent.
- UT DO — Controlled substance prescribing (source line 995); explicit cadence absent.
- UT DO — SBIRT (source line 996); explicit cadence absent.
- UT DO — DEA MATE Act / SUD training (source line 997); explicit cadence absent.
- VA MD — Office-based anesthesia (source line 796); explicit cadence absent.
- VA MD — DEA MATE Act / SUD training (source line 797); explicit cadence absent.
- VA DO — Office-based anesthesia (source line 796); explicit cadence absent.
- VA DO — DEA MATE Act / SUD training (source line 797); explicit cadence absent.
- VT MD — Hospice / palliative care / pain management (source line 806); explicit cadence absent.
- VT MD — Safe and effective prescribing of controlled substances (source line 807); explicit cadence absent.
- VT MD — DEA MATE Act / SUD training (source line 808); explicit cadence absent.
- VT DO — Safe and effective prescribing of controlled substances (source line 1006); explicit cadence absent.
- VT DO — DEA MATE Act / SUD training (source line 1007); explicit cadence absent.
- WA MD — Suicide assessment, treatment, and management (source line 817); explicit cadence absent.
- WA MD — Health equity (source line 818); explicit cadence absent.
- WA MD — Opioid prescribing best practices (source line 819); explicit cadence absent.
- WA MD — DEA MATE Act / SUD training (source line 820); explicit cadence absent.
- WA DO — Suicide assessment, treatment, and management (source line 1016); explicit cadence absent.
- WA DO — Health equity (source line 1017); explicit cadence absent.
- WA DO — Opioid prescribing best practices (source line 1018); explicit cadence absent.
- WA DO — DEA MATE Act / SUD training (source line 1019); explicit cadence absent.
- WI MD — Opioid and controlled substance prescribing (source line 829); explicit cadence absent.
- WI MD — DEA MATE Act / SUD training (source line 830); explicit cadence absent.
- WI DO — Opioid and controlled substance prescribing (source line 829); explicit cadence absent.
- WI DO — DEA MATE Act / SUD training (source line 830); explicit cadence absent.
- WV MD — Risk assessment and responsible prescribing / controlled substances (source line 839); explicit cadence absent.
- WV MD — Nutrition education (source line 840); explicit cadence absent.
- WV MD — DEA MATE Act / SUD training (source line 841); explicit cadence absent.
- WV DO — Drug diversion / best-practice prescribing (source line 1028); explicit cadence absent.
- WV DO — Nutrition education (source line 1029); explicit cadence absent.
- WV DO — DEA MATE Act / SUD training (source line 1030); explicit cadence absent.
- WY MD — Responsible controlled-substance prescribing / substance-abuse-disorder treatment (source line 850); explicit cadence absent.
- WY MD — DEA MATE Act / SUD training (source line 851); explicit cadence absent.
- WY DO — Responsible controlled-substance prescribing / substance-abuse-disorder treatment (source line 850); explicit cadence absent.
- WY DO — DEA MATE Act / SUD training (source line 851); explicit cadence absent.

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

Current acceptedCreditTypes: new column defaults to empty. Proposed values: unknown until verified; no enum lists were populated. The following source strings mention categories, including topic-specific conditions. A topic-specific acceptance/minimum must not be generalized to the full cycle. Source line is the first textual occurrence in lib/state-requirements.ts; mandatory-topic cadence rows above use syntax-tree locations (including shared topic definitions).

- AK MD (source line 288): 50 hours per 2-year cycle, averaging 25 hours/year (AMA Category I or board-recognized equivalent); first renewal is prorated — an average of 25 hrs per year of your initial license period (12 AAC 40.200(a)), and physicians licensed in the cycle's final year owe only the 2-hr pain management/opioid topic
- AK DO (source line 859): 50 hours per 2-year cycle, averaging 25 hours/year (AOA Category I/II or board-recognized equivalent); first renewal is prorated — an average of 25 hrs per year of your initial license period (12 AAC 40.200(a)), and physicians licensed in the cycle's final year owe only the 2-hr pain management/opioid topic
- AL MD (source line 298): 25 AMA PRA Category 1 / AOA Category 1-A equivalent credits; no Category 2
- AL MD (source line 304): If Alabama ACSC holder
- AL DO (source line 298): 25 AMA PRA Category 1 / AOA Category 1-A equivalent credits; no Category 2
- AL DO (source line 304): If Alabama ACSC holder
- AR MD (source line 309): 20 hours annually; at least 10 Category 1 hours in your primary area of practice
- AR DO (source line 309): 20 hours annually; at least 10 Category 1 hours in your primary area of practice
- AZ MD (source line 318): 40 hours (accepted activities include ACCME Category 1 and other board-recognized CME; no carryover)
- AZ DO (source line 869): 40 hours (at least 24 AOA Category 1A; no more than 16 AMA Category 1)
- AZ DO (source line 873): If authorized to prescribe Schedule II drugs or dispense controlled substances; must be AOA 1A or AMA Category 1
- CA DO (source line 879): 50 hours (20 AOA Category 1A/1B; remaining 30 may be AOA or AMA-accredited)
- DC MD (source line 363): 50 AMA PRA Category 1 hours
- DC DO (source line 363): 50 AMA PRA Category 1 hours
- FL DO (source line 890): 40 hours (at least 20 AOA Category 1-A)
- HI MD (source line 414): 40 hours Category 1 or 1A (20 if this is your first renewal; 40 for everyone beginning with the 2028 renewal) — the Board's enforced standard per its 2026 renewal/audit notices and HRS §453-6, which recognizes only Category 1/1A CME; the unamended codified rule (HAR §16-85-33) still recites 100 hours with a Category 2 pathway
- HI DO (source line 414): 40 hours Category 1 or 1A (20 if this is your first renewal; 40 for everyone beginning with the 2028 renewal) — the Board's enforced standard per its 2026 renewal/audit notices and HRS §453-6, which recognizes only Category 1/1A CME; the unamended codified rule (HAR §16-85-33) still recites 100 hours with a Category 2 pathway
- LA MD (source line 485): 20 board-approved CME hours annually (Category 1 pathways include ACCME, AAFP, ACOG, AOA, LSMS, ABMS/AOA specialty-board, or other board-recognized providers); new licensees are exempt from the 20 annual hours at their first renewal (per LSBME)
- LA DO (source line 485): 20 board-approved CME hours annually (Category 1 pathways include ACCME, AAFP, ACOG, AOA, LSMS, ABMS/AOA specialty-board, or other board-recognized providers); new licensees are exempt from the 20 annual hours at their first renewal (per LSBME)
- MD MD (source line 514): 50 hours (at least 25 Category 1; remaining 25 may be Category 2)
- MD DO (source line 514): 50 hours (at least 25 Category 1; remaining 25 may be Category 2)
- ME MD (source line 526): 40 Category 1 hours (first renewal prorated by month of licensure)
- MI MD (source line 537): 150 hours (at least 75 Category 1)
- MI DO (source line 915): 150 hours (at least 60 Category 1; at least 40 hours through AOA/MOA-approved Category 1A-style programs)
- NE MD (source line 607): 50 hours (up to 25 general Category 1 hours may carry over; first renewal after initial licensure typically exempt)
- NE DO (source line 607): 50 hours (up to 25 general Category 1 hours may carry over; first renewal after initial licensure typically exempt)
- NH MD (source line 617): 100 hours (at least 40 Category I; no more than 60 Category II)
- NH DO (source line 617): 100 hours (at least 40 Category I; no more than 60 Category II)
- NJ MD (source line 627): 100 credits (at least 40 Category I; Category I/II recognized by AMA, AOA, ACCME, or comparable board-recognized bodies)
- NJ DO (source line 627): 100 credits (at least 40 Category I; Category I/II recognized by AMA, AOA, ACCME, or comparable board-recognized bodies)
- NM DO (source line 944): 75 credits (at least 30 AOA Category 1-A or 1-B)
- NV MD (source line 652): 40 Category 1 hours (20 hours must be in specialty or scope of practice); first cycle prorated by when in the biennium you were licensed — 40 hrs (first 6 months), 30 (second), 20 (third), 10 (fourth) (NAC 630.157, except as provided in NAC 630.153)
- NV DO (source line 929): 40 hours per 2-year cycle (NRS 633.471 as amended by AB 56 (2025), effective Jan. 1, 2026; NSBOM's Category 1A minimum under NAC 633.250 is pending conformance to the new statute)
- OH MD (source line 684): 20 hrs Category I per 2 years
- OH MD (source line 684): If a physician owner of, or providing care at, a licensed Ohio pain management clinic; must include one or more courses addressing the potential for addiction; hours count toward the Category I renewal total (OAC 4731-29-01, eff. Jan. 31, 2026)
- OH DO (source line 684): 20 hrs Category I per 2 years
- OH DO (source line 684): If a physician owner of, or providing care at, a licensed Ohio pain management clinic; must include one or more courses addressing the potential for addiction; hours count toward the Category I renewal total (OAC 4731-29-01, eff. Jan. 31, 2026)
- PA MD (source line 712): 100 hours (at least 20 AMA PRA Category 1; retain CME records 2 years after renewal; MD registration expires Dec. 31 of even-numbered years)
- PA DO (source line 966): 100 hours (at least 20 AOA Category 1-A)
- PA DO (source line 970): Category 1 or 2
- RI MD (source line 731): 8 hrs one-time (Category 1)
- RI DO (source line 731): 8 hrs one-time (Category 1)
- TN MD (source line 759): Applies to all licensees unless exempt under T.C.A. 63-1-402(c): board certified (ABMS/AOA/ABPS) in pain management, anesthesiology, physical medicine and rehabilitation, neurology, or rheumatology, or practicing at a registered pain management clinic
- TN DO (source line 980): 40 hours (DO accepted credits: AOA 1A/2A/1B with max 20 hrs 1B; ACCME AMA PRA Category 1; AAFP Prescribed)
- TN DO (source line 759): Applies to all licensees unless exempt under T.C.A. 63-1-402(c): board certified (ABMS/AOA/ABPS) in pain management, anesthesiology, physical medicine and rehabilitation, neurology, or rheumatology, or practicing at a registered pain management clinic
- TX MD (source line 766): 48 hours (at least 24 formal Category 1/1A credits; ACCME/AMA PRA, AAFP Prescribed, AOA Category 1-A, or TMA-approved)
- TX DO (source line 766): 48 hours (at least 24 formal Category 1/1A credits; ACCME/AMA PRA, AAFP Prescribed, AOA Category 1-A, or TMA-approved)
- UT MD (source line 781): 40 hours (34 Category 1 minimum)
- UT DO (source line 991): 40 hours (34 AOA or ACCME Category 1 minimum)
- VT DO (source line 1002): 30 hours (AOA-approved CE accepted; the former 40% osteopathic sub-requirement was repealed — 26 V.S.A. 1836(d) '[Repealed]')
- WA MD (source line 813): 200 hours (Category I allowed for all hours; Category II-V limits apply)
- WA DO (source line 1012): 150 hours (at least 60 Category 1A per WA DOH; WAC 246-853-070 uses broader Category 1 wording)
- WI MD (source line 825): 30 hours of AMA PRA Category 1 / AOA Category 1 (or ACCME-recognized equivalent) credit; no Category 2 (Med 13.03(1)(b))
- WI DO (source line 825): 30 hours of AMA PRA Category 1 / AOA Category 1 (or ACCME-recognized equivalent) credit; no Category 2 (Med 13.03(1)(b))
- WV DO (source line 1024): 32 hours (at least 16 AOA Category 1A/1B)
- WY MD (source line 846): 60 hours over the 3-year CME lookback (AMA Category I/II, AOA, or Board-recognized equivalents)
- WY DO (source line 846): 60 hours over the 3-year CME lookback (AMA Category I/II, AOA, or Board-recognized equivalents)

## Transcribed cadences — re-confirm

A2-1: Michael authorized transcription from `scripts/sync-verified-md-rules.js @c367a36`, pending Vera/Roz re-confirmation. Only MD `cadence` / non-null `intervalYears` fields are added. Cadences include the exact outputs of the deleted script’s `req()` defaults (`oneTime: true` → `ONE_TIME`; default → `EVERY_RENEWAL`). Existing hours, topic text, notes and all DO data remain unchanged. Historical notes below are copied verbatim for review, not installed over current source notes.

| State | Matching MD source topic | Cadence | intervalYears | Deleted-script notes (verbatim) |
| --- | --- | --- | --- | --- |
| CT | Infectious diseases / HIV | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | Risk management | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | Sexual assault | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | Domestic violence | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | Cultural competency | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | Behavioral health | EVERY_N_YEARS | 6 | Required at first renewal and every 6 years thereafter. |
| CT | DEA MATE Act / SUD training | ONE_TIME | null (omitted) | One-time federal requirement if DEA-registered. |
| MA | Risk management | EVERY_RENEWAL | null (omitted) | Required each renewal cycle. |
| MA | Board regulations review | EVERY_RENEWAL | null (omitted) | Required each renewal cycle. |
| MA | Opioid education and pain management | EVERY_RENEWAL | null (omitted) | Required each renewal cycle if prescribing controlled substances. |
| MA | Implicit bias in health care | ONE_TIME | null (omitted) | One-time if not completed previously. |
| MA | End-of-life care | ONE_TIME | null (omitted) | null |
| MA | Child abuse recognition and reporting | ONE_TIME | null (omitted) | One-time training; no fixed CME hour value in ClearCME rule data. |
| MA | Domestic and sexual violence | ONE_TIME | null (omitted) | One-time training; no fixed CME hour value in ClearCME rule data. |
| MA | Alzheimer's disease / dementias | ONE_TIME | null (omitted) | If serving adult populations and not previously completed. |
| MA | EHR proficiency | ONE_TIME | null (omitted) | Course or demonstration-of-proficiency pathway may satisfy. |
| MA | DEA MATE Act / SUD training | ONE_TIME | null (omitted) | One-time federal requirement if DEA-registered. |
| UT | Controlled substance prescribing | EVERY_RENEWAL | null (omitted) | Required every renewal if prescribing controlled substances. |
| UT | SBIRT | ONE_TIME | null (omitted) | One-time beginning after Jan. 1, 2024; satisfies controlled-substance CE for the cycle taken. |
| UT | DEA MATE Act / SUD training | ONE_TIME | null (omitted) | One-time federal requirement if DEA-registered. |
| WV | Risk assessment and responsible prescribing / controlled substances | EVERY_RENEWAL | null (omitted) | For 2026 renewal if prescribing, administering, or dispensing controlled substances in WV; post-2026 becomes initial-license/one-time logic for new prescribers/dispensers. |
| WV | Nutrition education | CONDITIONAL | null (omitted) | HB 4951 effective June 12, 2026; board implementation/hour details pending. |
| WV | DEA MATE Act / SUD training | ONE_TIME | null (omitted) | One-time federal requirement if DEA-registered. |
| KY | KASPER / pain management / addiction | EVERY_N_YEARS | 3 | Every 3-year CME cycle if authorized to prescribe or dispense controlled substances. |
| KY | Addiction medicine | EVERY_N_YEARS | 3 | Every 3-year CME cycle if DEA-licensed to prescribe buprenorphine. |
| KY | Domestic violence | EVERY_N_YEARS | 3 | Within 3 years if primary care physician. |
| KY | Pediatric abusive head trauma | EVERY_N_YEARS | 5 | Within 5 years for EM, FM, pediatrics, radiology, urgent care. |
| KY | DEA MATE Act / SUD training | ONE_TIME | null (omitted) | One-time federal requirement if DEA-registered. |

### Unmatched

- UT MD — Suicide prevention training: cadence `EVERY_RENEWAL`, intervalYears `null`, notes: "Required every renewal." No matching current MD mandatory topic; nothing added.

### Conflicts requiring re-confirmation

- `lib/state-requirements.ts:478` — KY MD Domestic violence: transcribed `EVERY_N_YEARS` / `3` as expressly instructed, but the current hours/note say one-time and not recurring. No text or database value changed. Fleet must reconcile this before applying sync.
- `lib/state-requirements.ts:839` — WV MD prescribing: the deleted notes predict a post-2026 sunset; current verified text explicitly says recurring. Only the old `EVERY_RENEWAL` cadence was copied; current notes retained.
- `lib/state-requirements.ts:784` — UT MD suicide training is absent from current source; left unmatched. No requirement recreated.
