# Feedback Loops & Individualization: Evidence Base for the Personalization Engine

Scope: trained recreational adults; home resistance training (RT) + running + cycling; data = Apple Watch / COROS via Apple Health (HR, resting HR, HRV SDNN, sleep, workouts) + in-app questionnaires.

Evidence-strength legend used below: **A** = multiple RCTs / meta-analysis with consistent results; **B** = some RCTs or consistent observational data; **C** = expert consensus, mechanistic reasoning, single small studies; **D** = extrapolation / practitioner heuristic.

Verification note: items marked [verified] were checked against an abstract/index page this session. Items marked [prior knowledge] are well-known citations given from memory; authors/year/journal are believed correct but the DOI should be re-checked before publication.

---

## 1. HRV-guided training: meta-analyses, algorithms, Apple Watch limitations

### Takeaway
HRV-guided endurance training is roughly equal to, and sometimes slightly better than, predefined training for VO2max and performance. It produces a moderate advantage for vagal HRV indices and helps avoid non-response, but the effect on fitness itself is small and the CIs include zero (evidence B). The published algorithms all use **morning, supine/seated, short-term ln RMSSD** with a chest strap or app, smoothed over 7 days. Apple Watch provides **SDNN from irregular, mostly nocturnal PPG snapshots**, so those algorithms cannot be copied 1:1. Use the watch value only as a smoothed, individually normalized trend signal with wide bands and low weight.

### Cited Findings
**Meta-analyses / systematic reviews**
- Granero-Gallegos, González-Quílez, Plews & Carrasco-Poyatos (2020), "HRV-Based Training for Improving VO2max in Endurance Athletes. A Systematic Review with Meta-Analysis", *Int J Environ Res Public Health* 17(21):7999, doi:10.3390/ijerph17217999. HRV-guided training gave a small, non-significant to small-significant advantage in VO2max over predefined training. The review covered a small number of mostly small RCTs. [verified: PMC7663087 exists; effect-size details from prior knowledge] — [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7663087/)
- Düking, Zinner, Reed, Holmberg & Sperlich (2021), "Predefined vs data-guided training prescription based on autonomic nervous system variation: A systematic review", *Scand J Med Sci Sports* (doi:10.1111/sms.13802; journal inferred from repository filename "SMS_SMS13802"). It included 5 studies, 6 interventions and 166 participants, all healthy runners. The authors argue that recreational runners may benefit from automated data-based planning. [verified via Würzburg repository] — [OPUS Würzburg](https://nbn-resolving.org/urn:nbn:de:bvb:20-opus-217893)
- Manresa-Rocamora, Sarabia, Javaloyes, Flatt & Moya-Ramón (2021), "Heart Rate Variability-Guided Training for Enhancing Cardiac-Vagal Modulation, Aerobic Fitness, and Endurance Performance: A Methodological Systematic Review with Meta-Analysis", *IJERPH* 18(19):10299, doi:10.3390/ijerph181910299. HRV-guided training was favoured for vagal HRV (SMD+ = 0.50) but not resting HR (SMD+ = 0.04). From prior knowledge: aerobic fitness and endurance performance gains were small and not significantly different from predefined training, and the authors stressed methodological heterogeneity. [verified for HRV/RHR numbers] — [PMC8507742](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8507742/)
- A separate 2021 meta-analysis on HRV-guided training and endurance performance exists in *J Sci Med Sport* (doi:10.1016/j.jsams.2021.04.012). Authors were not confirmed this session; it is probably Medellín Ruiz et al. — [PubMed 34489178](https://pubmed.ncbi.nlm.nih.gov/34489178/)

**Key primary RCTs and algorithms**
- Kiviniemi, Hautala, Kinnunen & Tulppo (2007), *Eur J Appl Physiol* 101:743–751, doi:10.1007/s00421-007-0552-2. This is the first HRV-guided running RCT and used morning HF power. Rule: if HRV decreased versus the reference value, do a low-intensity day or rest; otherwise do high intensity. [prior knowledge]
- Vesterinen et al. (2016), "Individual Endurance Training Prescription with Heart Rate Variability", *Med Sci Sports Exerc* 48(7):1347–1354. Recreational runners, 8 weeks. Rule: a rolling 7-day mean of morning ln RMSSD **inside the individual "smallest worthwhile change" (SWC) band = mean ± 0.5 SD** of the 4-week baseline means do moderate/high intensity. Outside the band means low intensity. This gave a 10 km benefit similar or superior to predefined training, with fewer high-intensity sessions. [verified: PubMed 26909534 exists; algorithm details prior knowledge] — [PubMed](https://pubmed.ncbi.nlm.nih.gov/26909534/)
- Javaloyes, Sarabia, Lamberts & Moya-Ramón (2019), "Training Prescription Guided by Heart-Rate Variability in Cycling", *IJSPP* 14(1):23–32. Seventeen well-trained cyclists trained for 8 weeks. The HRV-guided group improved peak power (+5.1%), WVT2 (+13.9%) and the 40-min time trial (+7.3%), with **no significant between-group differences**. The method was a 7-day rolling ln RMSSD versus an SWC band; a TrainingPeaks summary reports the 0.5 SD band, but the original methods text was not confirmed — [PubMed 29809080](https://pubmed.ncbi.nlm.nih.gov/29809080/); [TrainingPeaks summary](https://www.trainingpeaks.com/blog/new-study-widens-hrv-evidence-for-more-athletes/)
- Javaloyes et al. (2020), *JSCR*. HRV-guided training versus block periodization in 20 well-trained cyclists gave similar outcomes — [PubMed 31490431](https://pubmed.ncbi.nlm.nih.gov/31490431/)
- Plews, Laursen, Stanley, Kilding & Buchheit (2013), "Training adaptation and heart rate variability in elite endurance athletes: opening the door to effective monitoring", *Sports Med* 43:773–781, doi:10.1007/s40279-013-0071-8. Recommendations: use ln RMSSD; use a **7-day rolling average** instead of single days; also track the **coefficient of variation (CV) of ln RMSSD**, where a rising CV or a downward trend signals maladaptation; at least 3–5 valid measurements per week are needed. [prior knowledge]
- Buchheit (2014), "Monitoring training status with HR measures: do all roads lead to Rome?", *Front Physiol* 5:73, doi:10.3389/fphys.2014.00073. Reviews interpretation of resting HR, HRV and HR recovery, including the point that a rising HRV is not always "good", for example parasympathetic saturation or overreaching in some athletes. [prior knowledge]

**Apple Watch / wearable HRV validity**
- Apple Health records HRV as **SDNN** from short (~1 min) PPG windows taken opportunistically through the day and night, not as morning RMSSD. Sampling is irregular, so readings are not standardized for posture, time or breathing. [prior knowledge of Apple's implementation; no peer-reviewed source found this session]
- Hernando, Roca, Sancho, Alesanco & Bailón (2018), "Validation of the Apple Watch for Heart Rate Variability Measurements during Relax and Mental Stress in Healthy Subjects", *Sensors* 18(8):2619. Twenty subjects were compared with a Polar H7 for RR intervals, SDNN, RMSSD and pNN50. Agreement was acceptable at rest, but the study was daytime and stationary — [PMC6111985](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6111985/)
- Miller, Sargent & Roach (2022), "A Validation of Six Wearable Devices for Estimating Sleep, Heart Rate and Heart Rate Variability in Healthy Adults", *Sensors* 22(16):6317, doi:10.3390/s22166317. Fifty-three young adults were tested for one night against PSG/ECG with Apple Watch S6, Garmin FR245, Polar Vantage V, Oura Gen2, WHOOP 3.0 and Somfit. Device-specific HRV accuracy figures were not extracted this session — [PubMed 36016077](https://pubmed.ncbi.nlm.nih.gov/36016077/)
- Apple Watch Series 6 versus laboratory ECG (2025, *Sensors*). Seventy-eight adults at rest showed near-perfect RR/BPM agreement (MAPE ~1.15%), and agreement degraded with movement. The sample was small and daytime only — [PMC12031371](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12031371/)
- A 2024 study validated Apple Watch Series 9 / Ultra 2 HRV against a Polar H10 with Kubios; results were not extracted this session — [MDPI Sensors 24(19):6220](https://www.mdpi.com/1424-8220/24/19/6220)
- Oura nocturnal benchmark (2022, *JMIR*): whole-night average SDNN was acceptable versus ECG, but **5-minute-segment SDNN was not**. Averaging over the night matters — [JMIR 2022;24(1):e27487](https://www.jmir.org/2022/1/e27487/)
- No peer-reviewed validation of **Apple Watch nocturnal SDNN as a readiness/training-guidance marker** was found. **Gap.**

### Inferences (implementable rules)
- **R-HRV-1 (D/C):** Do not use a single day's Apple SDNN. Compute a per-user **nightly HRV value**, ideally the median of all SDNN samples timestamped inside the sleep window, then a **7-day rolling mean of ln(SDNN)**. Require at least 4 of 7 valid nights; otherwise mark the HRV component as missing.
- **R-HRV-2 (B for concept, D for the SDNN transfer):** Baseline = a 28–60-day rolling mean and SD of the 7-day values. "Normal" = baseline ± 0.5 SD (SWC band, Vesterinen/Javaloyes logic). Because Apple SDNN is noisier, consider **±1 SD** for flags, and use 0.5 SD only for "slight" nudges.
- **R-HRV-3 (C):** Below the band → reduce intensity, swapping HIIT/threshold for Z1–Z2 or a lower-RPE RT session. Above the band combined with poor subjective scores → treat as possible fatigue rather than "great" (Buchheit 2014). A rising 7-day CV of ln HRV is a secondary warning flag (Plews 2013).
- **R-HRV-4 (D):** Offer an optional **morning RMSSD measurement** (chest strap or 1-min camera/PPG app) for power users, which allows the published algorithm directly. Weight the HRV signal higher when it comes from a standardized morning measurement.
- Expected benefit is modest (similar fitness with fewer hard sessions). The main value is a **personalised safety valve and an engagement mechanism**, not large extra gains.

### Gaps
- No RCT has used Apple Watch SDNN for training guidance. Validity of Apple's opportunistic nocturnal SDNN for day-to-day change detection is unknown.
- HRV-guided **resistance training** has little evidence. A few small studies exist (not verified this session), so HRV guidance for RT is evidence C/D.
- Exact SWC band widths and method details of Javaloyes 2019 were not verified against the full text.

---

## 2. Resting HR and sleep as readiness markers; consumer sleep-tracking accuracy

### Takeaway
Resting HR is reliable but responds weakly to training load. HRV-guided meta-analysis showed no RHR difference (SMD 0.04), and RHR is confounded by heat, alcohol, illness, hydration and stress. A sustained elevation versus baseline is still a useful **illness/strain flag**. Consumer wearables are valid for **sleep timing and duration** but poor for **sleep stages**. Use duration and regularity, not stage minutes.

### Cited Findings
- RHR did not differ between HRV-guided and predefined training (SMD+ = 0.04), which suggests low sensitivity as a training-response marker — [Manresa-Rocamora 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8507742/)
- Buchheit 2014: day-to-day RHR has small changes relative to noise. Trends (weekly averages) are more interpretable than single values. HR-based measures should be combined with subjective data. [prior knowledge] — doi:10.3389/fphys.2014.00073
- Miller et al. 2022: two-state sleep/wake agreement with PSG was 86–89% across devices (Apple Watch 88%, κ = 0.30). Multi-state staging agreement was only 50–65% (Apple 53%, κ = 0.20). The authors judged all six devices valid for sleep **timing and duration** but needing improvement for **stages** — [Sensors 22:6317](https://pubmed.ncbi.nlm.nih.gov/36016077/)
- Caveat: young, healthy sample, one lab night and old device generations (S6, WHOOP 3.0). This may not generalize to newer devices or older users — [Miller 2022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9412437/)
- The search turned up no 2020–2026 meta-analysis that validates sleep-duration thresholds for training readiness in recreational adults. Saw 2016 found that subjective sleep quality is among the sensitive self-report items (see §3).

### Inferences (implementable rules)
- **R-RHR-1 (C):** Use the 7-day mean of overnight/resting HR versus a 28–60-day baseline. A flag requires **RHR ≥ baseline + ~5 bpm, or > +1.5 SD, for at least 2 consecutive days**. Combined with low wellness or illness symptoms, this means no intensity and a prompt for an illness check-in. The thresholds are heuristic (D).
- **R-SLEEP-1 (C):** Use watch sleep **duration** (and optionally bedtime regularity) plus **self-rated sleep quality**. Ignore deep/REM minutes for decisions.
- **R-SLEEP-2 (D):** Sleep < 6 h, or more than 1.5 h below the personal mean, on the previous night means a modest downgrade (for example, cap at moderate intensity, or swap the order of sessions in the week). Do not cancel sessions on sleep alone.
- Give RHR and sleep lower weight than subjective wellness (§3) and treat them as corroborating signals.

### Gaps
- No validated, combined RHR + HRV + sleep readiness algorithm for recreational athletes using Apple Health data was found.
- Accuracy for COROS devices in sleep and HRV was not researched this session.

---

## 3. Subjective wellness questionnaires and combining into a readiness score

### Takeaway
Subjective self-report measures track acute and chronic training load **more sensitively and consistently than common objective markers** (Saw et al. 2016; evidence B). Short multi-item wellness scales (Hooper, McLean) are practical and should be the **primary input** of the readiness score. Wearable data should modulate it.

### Cited Findings
- Saw, Main & Gastin (2016), "Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures: a systematic review", *Br J Sports Med* 50(5):281–291, doi:10.1136/bjsports-2015-094758. Fifty-six studies were included. Subjective measures reflected acute and chronic training loads with **superior sensitivity and consistency** compared with objective measures (including blood markers, HR and HRV). Well-being worsened with acute load increases and chronic training and improved with load reduction. Only validated/reliable instruments were included — [BJSM](https://bjsm.bmj.com/content/50/5/281.short); [Deakin repository](https://dro.deakin.edu.au/articles/journal_contribution/Monitoring_the_athlete_training_response_Subjective_self-reported_measures_trump_commonly_used_objective_measures_A_systematic_review/20899435)
- Caveat: Saw's sample was mostly athletes. Many "objective" comparators were blood markers, not wearables, and the strong title word "trump" overstates certainty. [inference from abstract]
- Hooper & Mackinnon (1995), *Sports Med* 20(5):321–327, Hooper index: 1–7 ratings of sleep, stress, fatigue and muscle soreness, summed. [prior knowledge]
- McLean, Coutts, Kelly, McGuigan & Cormack (2010), *IJSPP* 5(3):367–383: 5-item 1–5 wellness scale covering fatigue, sleep quality, general soreness, stress and mood. [prior knowledge]
- Single-item or short scales are widely used in practice. Many custom questionnaires lack validation, as Saw et al. note. [prior knowledge]

### Inferences (implementable readiness score)
- **R-READY-1 (C):** Daily 30-second check-in with **5 items on a 1–5 scale** (McLean-style): sleep quality, fatigue/energy, muscle soreness (plus location), stress, mood/motivation. Add a separate **pain** item (see §8) and an **illness symptoms yes/no** item.
- **R-READY-2 (C/D):** Normalize each item to a personal **z-score** against a 28-day rolling mean/SD once there are 14 or more entries. Before that, use absolute cut-offs.
- **R-READY-3 (D), suggested combination:** Readiness = 0.5·Wellness_z + 0.2·HRV_z + 0.15·RHR_z (sign inverted) + 0.15·Sleep_z. Each component is clipped to ±2, and the weights are renormalized when a component is missing. Weights follow Saw 2016 (subjective first) and are not empirically fitted, so this is **D**. Learn per-user weights later (§6).
- **R-READY-4 (D):** Decision mapping:
  - Green (≥ −0.5): do the plan.
  - Amber (−0.5 to −1.25): keep volume, cap intensity at RPE 7 or Z2, or swap the day.
  - Red (< −1.25, any illness "yes", or pain over threshold): recovery or mobility session.
- Hard overrides always take priority over the score: illness symptoms, chest pain, or pain > 5/10.
- **Explainability:** always show *why*, for example: "HRV 7-day average below your normal range, and you rated fatigue 2/5."
- Questionnaire fatigue is a risk. Allow skipping, and fall back to wearable-only readiness with lower confidence.

### Gaps
- No study validates a composite wearable + questionnaire readiness score in recreational adults. All weightings are heuristic.

---

## 4. Deload: consensus, RCT, triggers and frequency

### Takeaway
Deloading is **expert-consensus-supported (C)**, not RCT-proven. The only RCT (Coleman 2024) found that a **1-week complete training cessation** at mid-programme slightly **reduced strength gains** and did not change hypertrophy. Deloads should therefore be **reduced-load periods, not full stops**, triggered by fatigue/performance signals or scheduled about every 4–8 weeks.

### Cited Findings
- Bell, Nolan, Immonen, Helms, Dallaway, Haff et al. (2023), "Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach", *Sports Med – Open* 9:87, doi:10.1186/s40798-023-00633-0. Delphi with 34, 29 and 21 expert coaches over three rounds. Consensus definition (as quoted by Coleman 2024): a deload is a *period of reduced training stress designed to mitigate physiological and psychological fatigue, promote recovery, and enhance preparedness for the next training cycle*. From prior knowledge: typical practice was about 1 week (~5–7 days), reducing **volume** (sets/reps) more than intensity, and deloads could be pre-planned or autoregulated. [verified for study existence and design] — [PMC10511399](https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/); [SHU PDF](https://shura.shu.ac.uk/32417/1/s40798-023-00633-0.pdf)
- Coleman, Burke, Augustin, Piñero, Maldonado, Fisher, Israetel, Androulakis-Korakakis, Swinton, Oberlin, Schoenfeld (2024), "Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations", *PeerJ* 12:e16777, doi:10.7717/peerj.16777. Nine-week RT programme in trained individuals; the DELOAD group stopped training for week 5. There was **no difference in muscle size, local endurance or power**. The TRAD group had **greater isometric and dynamic lower-body strength gains**. Limitation: the deload was *cessation*, not reduced load, so it does not test typical coaching practice — [PMC10809978](https://pmc.ncbi.nlm.nih.gov/articles/PMC10809978/)
- Bell et al. (2024) published follow-up practitioner surveys on deloading in *Sports Med – Open* (Rogerson/Bell et al.), reporting that coaches deload about every 4–6 weeks, mainly by reducing volume. [prior knowledge, not verified this session] **Treat as C.**
- Endurance tapering evidence (Bosquet et al. 2007, *MSSE*) supports cutting **volume by 41–60%** while **maintaining intensity and frequency** for performance. This is distinct from a deload but a related principle. [prior knowledge]

### Inferences (implementable rules)
- **R-DELOAD-1 (C):** Default to a **scheduled deload every 5–7 weeks** (4–6 for older users, see §10). Deload = **~40–50% fewer sets**, the same exercises, load ~10% lower or RIR +2. For running and cycling: about 40–50% less volume, keep a few short strides or intervals, no new stimuli. **Not complete rest** (Coleman 2024: cessation can cost strength).
- **R-DELOAD-2 (C/D), autoregulated trigger:** pull a deload forward if **2 or more** of the following occur within 7–10 days:
  - readiness in Amber/Red on at least 4 of 7 days;
  - e1RM / rep performance at the same RIR down more than 5% in 2 consecutive sessions, or pace/power at the same HR down;
  - session RPE consistently 1 point or more above target;
  - 7-day HRV below the band **and** RHR elevated;
  - user reports persistent soreness, motivation drop, or poor sleep.
- **R-DELOAD-3 (D):** If the user is progressing well and readiness is green, the scheduled deload may be **postponed by up to 2 weeks**, with a hard limit of about 10 weeks.
- Inform the user explicitly: "Deloads protect long-term progress; one week off completely may cost a bit of strength, so we do a lighter week instead."

### Gaps
- No RCT compares reduced-load deloads with continuous training or with cessation. No data exist for recreational concurrent (RT + endurance) trainees.

---

## 5. Inter-individual response variability: responders and non-responders

### Takeaway
Much apparent "non-response" is **measurement error and day-to-day variability**. True individual response must be judged against the **typical error** and ideally with repeated tests. Non-response to one protocol often **does not** carry over to another (Bonafiglia 2016), and increasing dose tends to eliminate non-response (Montero & Lundby 2017). Implementation rule: if a user shows no progress beyond noise after ~6–8 weeks of good adherence, **change the stimulus** (modality, intensity distribution or volume).

### Cited Findings
- Bonafiglia et al. (2016), "Inter-Individual Variability in the Adaptive Responses to Endurance and Sprint Interval Training: A Randomized Crossover Study", *PLOS ONE* 11(12):e0167790, doi:10.1371/journal.pone.0167790. Twenty-one recreationally active adults did 3-week endurance and SIT blocks about 3 months apart. Non-responders occurred in both protocols, and individual changes were **not correlated** between END and SIT. No subject was a non-responder to both for VO2peak — [PMC5147982](https://pmc.ncbi.nlm.nih.gov/articles/PMC5147982); [PubMed 27936084](https://pubmed.ncbi.nlm.nih.gov/27936084/)
- Bonafiglia et al. (2021), *Front Physiol* 12:665044, doi:10.3389/fphys.2021.665044. A systematic review arguing that "responder" labels must account for measurement error and random within-subject variability; they should be read as "did or did not experience benefit" — [Frontiers PDF](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2021.665044/pdf)
- Atkinson & Batterham (2015), "True and false interindividual differences in the physiological response to an intervention", *Exp Physiol* 100(6):577–588, doi:10.1113/EP085070. The SD of change scores in the intervention group must be compared with the control group; true response SD = √(SD_int² − SD_con²). Many claimed responder distributions are not supported. [prior knowledge]
- Hecksteden, Pitsch, Rosenberger & Meyer (2018), "Repeated testing for the assessment of individual response to exercise training", *J Appl Physiol* 124(6):1567–1579, doi:10.1152/japplphysiol.00896.2017. **Repeated measurements pre and post** (for example, several tests averaged) are needed to classify individual response reliably. The paper proposes a framework based on typical error. [prior knowledge]
- Montero & Lundby (2017), "Refuting the myth of non-response to exercise training: 'non-responders' do respond to higher dose of training", *J Physiol* 595(11):3377–3387, doi:10.1113/JP273480. With 60 vs 120 vs 180 vs 240 vs 300 min/week of endurance training, non-response in VO2max disappeared at higher doses. [prior knowledge]

### Inferences (implementable rules)
- **R-RESP-1 (B):** Estimate each metric's **typical error (TE)** per user from repeated stable measurements, for example e1RM from top sets or pace at a fixed HR, using the noise in a steady-state window. A change counts as "real" only if it exceeds about **1.5–2 × TE** or the 7-day/28-day smoothed trend.
- **R-RESP-2 (B/C):** Use trend metrics from routine training rather than tests: e1RM from RIR-based sets, rolling **pace or power at a fixed HR** (aerobic efficiency) and HR drift. These are repeated, low-burden measurements, in line with Hecksteden 2018.
- **R-RESP-3 (C):** **Plateau rule:** if adherence ≥ 80% and there has been no meaningful improvement (< SWC) for **6–8 weeks** (RT: 3–4 weeks for a single lift with no rep/load progress), change one variable.
  - RT: change the rep range, exercise variation, or add +2 sets/week per muscle (dose ↑).
  - Endurance: change the intensity distribution (more Z2 volume or add 1×/week intervals) or increase weekly volume by 10–20%.
- First check confounders: sleep, adherence, life stress and nutrition (via questionnaire).
- **R-RESP-4 (C):** Increase dose before concluding "non-response" (Montero & Lundby). Communicate it as "you haven't found your stimulus yet", not "you are a non-responder", which matters for motivation.

### Gaps
- Optimal plateau window lengths for trained recreational adults have not been empirically established. The 6–8 week figure is extrapolated from intervention-study durations (C/D).

---

## 6. Algorithms for individualized progression

### Takeaway
**Rule-based autoregulation (RIR/RPE-based load and set adjustment) is the best-supported, most explainable approach for RT (B).** The Banister fitness-fatigue model fits past data but has **poor identifiability and weak predictive validity**, so use it only as a load monitor (ATL/CTL-type), not as a performance predictor. Bayesian/state-space approaches are conceptually appropriate for personalisation with uncertainty. ML in training prescription is still at proof-of-concept level. Recommended architecture: an **explainable rule engine + Bayesian per-user updating of a few parameters**.

### Cited Findings
- Greig, Stephens-Hemingway, Smith & Ingham? (2020), "Autoregulation in Resistance Training: Addressing the Inconsistencies", *Sports Med* 50:1873–1887, doi:10.1007/s40279-020-01330-8. Reviews RPE/RIR, velocity-based training (VBT) and flexible periodisation. Autoregulation is at least as effective as fixed loading, but study methods are inconsistent. [prior knowledge; author list uncertain]
- Halperin, Malleron, Horowitz, Ben-Zeev, Hanna? et al. (2022), "Accuracy in Predicting Repetitions to Task Failure in Resistance Exercise: A Scoping Review and Exploratory Meta-analysis", *Sports Med* 52:377–390, doi:10.1007/s40279-021-01559-x. People **underestimate** reps-to-failure by about 1 rep on average. Accuracy is better **closer to failure** (≤ 5 RIR) and with experience. [prior knowledge]
- Marchal et al. (2025), "Statistical flaws of the fitness-fatigue sports performance prediction model", *Scientific Reports* (2024 arXiv preprint). The Banister model is **ill-conditioned**, fitness/fatigue parameters are **poorly identifiable** (Bayesian MCMC), and the fatigue component's biological relevance is questioned — [OUCI record](https://ouci.dntb.gov.ua/works/4EBvEq2l); [arXiv 2505.20859](https://web3.arxiv.org/pdf/2505.20859)
- Stephens Hemingway et al. (RGU review series): FFMs carry linearity, independence and deterministic assumptions, with little empirical evaluation of prediction accuracy, model stability or parameter estimation. They propose **state-space models** that model uncertainty in fitness, fatigue and performance directly — [RGU repository](https://rgu-repository.worktribe.com/OutputFile/1871154); related Sports Med–Open paper [s40798-022-00426-x](https://link.springer.com/article/10.1186/s40798-022-00426-x)
- Fit ≠ prediction: a high in-sample R² does not guarantee accurate prediction (swimmer FFM study) — [PMC7472986](https://pmc.ncbi.nlm.nih.gov/articles/PMC7472986)
- Not verified this session: systematic reviews of ML in training prescription (2021–2024) conclude that studies are small, overfit and rarely prospectively validated. **Gap / C.**

### Inferences (implementable rules)
- **R-PROG-RT-1 (B), double progression with RIR:** each exercise has a rep range (for example 8–12) and a target RIR of 1–3. If all sets reach the top of the range at RIR at or above target, increase load next session (home: add reps, tempo, harder variation, unilateral, or band/dumbbell step). If reps fall below the bottom of the range, reduce load ~5–10%.
- **R-PROG-RT-2 (B/C):** Estimate e1RM from load × reps + RIR (for example the Epley formula with RIR adjustment). Track the trend with Kalman/exponential smoothing. Because users underestimate RIR (Halperin 2022), shift reported RIR +0.5–1 for novices and calibrate occasionally with an AMRAP set.
- **R-PROG-VOL (C):** weekly sets per muscle start at 10 ± 2. Add 1–2 sets/week only if readiness is green and the plateau rule applies; reduce if a deload trigger fires.
- **R-PROG-END-1 (C):** Weekly endurance load = session RPE × duration (Foster sRPE) or TRIMP from HR. Monitor the 7-day vs 28-day ratio **only as a soft guardrail** (for example, warn when the week exceeds about 1.3–1.5 × the 4-week average). The acute:chronic workload ratio as an injury predictor is **contested** (D for prediction; used only as a sanity ramp limit).
- **R-PROG-END-2 (B/C):** about 80/20 intensity distribution for recreational endurance work (not covered in depth here). Progress volume about 5–10% per week, with a recovery week as in §4.
- **R-BAYES-1 (C/D):** For each user, maintain a posterior over a few parameters: e1RM per lift, aerobic efficiency (pace/power at HR), personal readiness weights, and individual recovery time after hard sessions. Update with a conjugate normal (Kalman) after each session. Start from population priors and shrink toward the individual as data accrue, which gives cold-start handling.
- **R-FFM (C):** Show "fitness/fatigue/form" (CTL/ATL/TSB-style) curves as **visualisation and context only**. Do not let them auto-prescribe and do not claim they predict performance (Marchal 2025).
- **R-EXPLAIN (C):** Every adaptation must carry a human-readable reason and a confidence level, and the user can override. Log overrides as feedback for learning weights.

### Gaps
- No RCT compares an app-based algorithmic plan against coach or fixed plans in recreational concurrent training. ML prescription evidence was not reviewed in depth this session.

---

## 7. Behaviour change and adherence in fitness apps

### Takeaway
App-based physical activity interventions produce **small–moderate short-term effects** that decay over time. More pragmatic, real-world trials show smaller effects. Behaviour change techniques (BCTs) such as **self-monitoring, feedback, reminders and coaching**, plus **autonomy-supportive (SDT)** design and habit formation (consistent cues and timing), are the best-supported levers (B). Rigid SMART outcome goals are not clearly superior for beginners or recreational exercisers. **Open/"do your best" or process goals** may work as well or better for enjoyment (C, emerging).

### Cited Findings
- Meta-analysis of smartphone apps for physical activity and weight: apps with **reminders, self-reporting and a health coach** as BCTs were more effective. Older participants and longer duration increased effects — [JMIR/PMC10196895](https://pmc.ncbi.nlm.nih.gov/articles/PMC10196895)
- More pragmatic studies (real-world conditions) were associated with **smaller** PA increases (effect −0.81, 95% CI −1.36 to −0.25) — [PubMed 36379104](https://pubmed.ncbi.nlm.nih.gov/36379104/)
- Children and adolescents (2024 *JMIR mHealth*): app interventions had small-to-large benefits on total PA, sedentary behaviour, BMI and strength — [JMIR mHealth 2024;12:e51478](https://mhealth.jmir.org/2024/1/e51478)
- Bayesian component network meta-analysis of mHealth PA intervention components (*JMIR* 2026). Component-level estimates were not fully extracted — [JMIR 2026 e88460](https://www.jmir.org/2026/1/e88460/PDF)
- Meta-regression of mHealth PA interventions identifies key elements (*JMIR mHealth* 2018) — [PMC6256104](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6256104/)
- [prior knowledge, verify DOIs]
  - Romeo et al. (2019), "Can Smartphone Apps Increase Physical Activity?", *J Med Internet Res* 21(3):e12053, doi:10.2196/12053. Small, non-significant pooled effect on steps; tailored apps did better.
  - Mönninghoff et al. (2021), "Long-term Effectiveness of mHealth Physical Activity Interventions", *J Med Internet Res* 23(4):e26699, doi:10.2196/26699. Effects declined over time but stayed small and positive beyond 6 months.
- [prior knowledge] Teixeira, Carraça, Markland, Silva & Ryan (2012), "Exercise, physical activity, and self-determination theory: a systematic review", *IJBNPA* 9:78, doi:10.1186/1479-5868-9-78. **Autonomous/intrinsic motivation** (enjoyment, identity) predicts long-term adherence; controlled motivation does not.
- [prior knowledge]
  - Lally et al. (2010), *Eur J Soc Psychol* 40:998–1009: habit automaticity took a median of **66 days** (range 18–254).
  - Kaushal & Rhodes (2015), *J Behav Med* 38:652–663: gym exercise habit formed in about **6 weeks** at ≥ 4 sessions/week. Consistent context cues and time of day help.
- [prior knowledge] Swann, Rosenbaum, Lane et al. (2021), "Are there better alternatives to SMART goals?", *Health Psychol Rev* 15(1):1–21? Argues that the evidence for SMART goals in PA is weak and that open goals may suit novices. Swann et al. later experiments (2022–2023) found open goals comparable to specific goals for performance and better for pleasure in some conditions. **Evidence C.**

### Inferences (implementable rules)
- **R-BEH-1 (B):** Core BCTs: self-monitoring (automatic workout import), feedback on progress (trend vs TE, see §5), prompts and reminders at the user's **chosen fixed time** (habit cue), and action planning (weekly schedule with fixed slots).
- **R-BEH-2 (C):** Onboarding offers **goal choice**: process goals ("3 sessions/week"), an optional specific outcome goal, or an open "see how far I get" goal. Default to process plus open goals. Celebrate consistency streaks gently, with forgiving streaks (one miss allowed per week) to avoid all-or-nothing dropout.
- **R-BEH-3 (C, SDT):**
  - Autonomy: give choices (swap exercise, choose session length 20/40/60 min, accept or decline adaptations).
  - Competence: achievable progressions, show PRs and trend improvements.
  - Relatedness: optional coach tone, sharing.
  - Ask about **enjoyment** (1–5 after the session) and down-weight disliked exercises in the selection algorithm.
- **R-BEH-4 (B):** Expect engagement decay after about 4–12 weeks. Plan "re-engagement" content and new training blocks every 4–8 weeks, which aligns with the deload/block structure.
- **R-BEH-5 (C):** Minimum viable session when readiness or time is low ("10-minute version") to protect the habit chain. Habit research supports consistency of cue over intensity.

### Gaps
- No 2024–2026 meta-analysis with **adherence/retention as the primary outcome** for training (as opposed to step-count) apps was found. Most measure PA efficacy.
- Evidence for gamification in trained adults is not reviewed here.

---

## 8. Safety screening (PAR-Q+, physician referral) and pain monitoring

### Takeaway
Use **PAR-Q+ (2023 version)** or the ACSM 2015 pre-participation algorithm at onboarding, with annual re-screening and re-screening whenever health status changes. For training with musculoskeletal pain, the **Silbernagel pain-monitoring model** (pain ≤ 5/10 during activity, back to baseline by the next morning, no worsening week-to-week) is RCT-supported for Achilles tendinopathy (B). It is commonly extrapolated to other tendinopathies and to patellofemoral pain (C).

### Cited Findings
- Silbernagel, Thomeé, Eriksson & Karlsson (2007), "Continued sports activity, using a pain-monitoring model, during rehabilitation in patients with Achilles tendinopathy: a randomized controlled study", *Am J Sports Med* 35(6):897–906, doi:10.1177/0363546506298279. Thirty-eight patients; continuing running and jumping under pain monitoring had **no negative effects** compared with rest from tendon-loading activity. Pain was not to exceed (or reach, per another source) **5/10 on a VAS**. Sources differ on "≤ 5" vs "< 5", so check the full text — [PEDro record](https://search.pedro.org.au/search-results/record-detail/18389); [summary](https://physicaltherapyfirst.com/blog/continued-sports-activity-using-a-pain-monitoring-model-during-rehabilitation-in-patients-with-achilles-tendinopathy/)
- Model components [prior knowledge, Silbernagel 2007 / Thomeé 1997]:
  - pain during activity ≤ 5/10 (0–2 "safe", 2–5 "acceptable", > 5 "high risk");
  - pain after activity allowed but should subside by the next morning;
  - morning pain/stiffness should not increase from week to week.
- PAR-Q+: Warburton, Jamnik, Bredin, Gledhill et al. (2011), "The Physical Activity Readiness Questionnaire for Everyone (PAR-Q+) and electronic Physical Activity Readiness Medical Examination (ePARmed-X+)", *Health & Fitness Journal of Canada* 4(2):3–23. Updated annually (eparmedx.com). Seven general YES/NO questions; any YES leads to follow-up questions and then possibly referral to a qualified exercise professional or physician. [prior knowledge]
- Riebe, Franklin, Thompson et al. (2015), "Updating ACSM's Recommendations for Exercise Preparticipation Health Screening", *Med Sci Sports Exerc* 47(11):2473–2479, doi:10.1249/MSS.0000000000000664. The algorithm uses current exercise habits, **known cardiovascular, metabolic or renal disease**, **signs/symptoms** and desired intensity. Routine medical clearance is not needed for asymptomatic regular exercisers continuing moderate exercise. [prior knowledge]

### Inferences (implementable rules)
- **R-SAFE-1 (B/C):** Onboarding uses the PAR-Q+ general questions. Any YES leads to the follow-up questions. If a YES remains (for example, chest pain, fainting, known cardiac disease, uncontrolled hypertension, pregnancy with complications), block vigorous plans and **recommend medical clearance**. The app must not diagnose.
- **R-SAFE-2 (C):** Red-flag symptoms in any check-in (chest pain/pressure, unexplained breathlessness, palpitations with dizziness, fainting) stop training, with an advice screen to seek medical care. These override all algorithms.
- **R-SAFE-3 (C/D):** Re-screen every 12 months, after illness or injury, and when the user reports a new diagnosis or medication.
- **R-PAIN-1 (B for Achilles, C otherwise):** Pain item 0–10 per region before, during (optional) and next morning.
  - During ≤ 2: green.
  - 3–5: acceptable; keep or slightly reduce load on that region.
  - > 5, or next-morning pain above baseline, or weekly worsening: reduce load on the affected region (fewer jumping/running minutes, lower RT load or range) for the next exposure.
  - Persisting worse for more than 2 weeks, or acute injury signs (swelling, locking, night pain): suggest physiotherapist or physician.
- **R-PAIN-2 (D):** Never auto-progress the load on a region with active pain above 3/10. Substitute exercises for that region (for example, cycling instead of running).

### Gaps
- No validation of the pain-monitoring model inside apps. The exact 5/10 wording should be checked in the original.
- The current PAR-Q+ version (2023/2024/2025 updates) was not checked this session.

---

## 9. Menstrual cycle and sex differences

### Takeaway
The best current evidence does **not** support periodizing training by menstrual cycle phase for performance or adaptation. Performance may be **trivially** reduced in the early follicular phase (McNulty 2020; ES −0.06). Umbrella-level evaluation found no clear phase influence on RT outcomes (Colenso-Semple 2023). Recommendation: **symptom-based individual adjustment** (optional cycle and symptom logging), not phase-based prescription.

### Cited Findings
- McNulty, Elliott-Sale, Dolan, Swinton, Ansdell, Goodall, Thomas & Hicks (2020), "The Effects of Menstrual Cycle Phase on Exercise Performance in Eumenorrheic Women: A Systematic Review and Meta-Analysis", *Sports Med* 50(10):1813–1827, doi:10.1007/s40279-020-01319-3. Seventy-eight studies (51 pairwise, 73 network). Effect was **trivial**, with performance slightly reduced in the early follicular phase (median ES −0.06, 95% CrI −0.16 to 0.04). Study quality was mostly low or moderate. Authors: general phase-based guidance is not warranted; **personalised approach** based on individual response — [PMC7497427](https://pmc.ncbi.nlm.nih.gov/articles/PMC7497427/)
- Colenso-Semple, D'Souza, Elliott-Sale & Phillips (2023), "Current evidence shows no influence of women's menstrual cycle phase on acute strength performance or adaptations to resistance exercise training", *Front Sports Act Living* 5:1054542, doi:10.3389/fspor.2023.1054542. Review of systematic reviews and meta-analyses found highly variable findings and poor, inconsistent cycle verification methods. It is **premature** to conclude that hormone fluctuations meaningfully affect acute performance or RT adaptations — [PMC10076834](https://pmc.ncbi.nlm.nih.gov/articles/PMC10076834); [Frontiers](https://www.frontiersin.org/articles/10.3389/fspor.2023.1054542/pdf)
- Elliott-Sale et al. (2020), *Sports Med*: oral contraceptive users may have slightly lower performance than non-users (trivial effect), with no general recommendation. [verified existence via repository] — [USP repository PDF](https://observatorio.fm.usp.br/bitstream/OPI/37917/1/art_ELLIOTT-SALE_The_Effects_of_Oral_Contraceptives_on_Exercise_Performance_2020.PDF.pdf)
- Sex differences in RT [prior knowledge]:
  - Roberts, Nuckols & Krieger (2020), "Sex Differences in Resistance Training: A Systematic Review and Meta-Analysis", *J Strength Cond Res* 34(5):1448–1460, doi:10.1519/JSC.0000000000003521. **Relative** hypertrophy is similar between sexes. Relative upper-body strength gains are somewhat greater in women.
  - Women show greater **fatigue resistance** at the same relative intensity in many studies (Hunter 2014/2016, *Acta Physiol* / *Exerc Sport Sci Rev*), which may allow more reps at a given %1RM and shorter rests. Evidence C for programming.

### Inferences (implementable rules)
- **R-MC-1 (B):** Do not change the plan by default according to cycle phase.
- **R-MC-2 (C):** Optional cycle/symptom tracking (Apple Health cycle data, if the user consents). If symptoms are reported (cramps, fatigue, low mood), the readiness questionnaire already captures them, so readiness downgrades apply naturally. After 3 or more cycles, the app may **learn individual patterns** (for example, the user's readiness is consistently lower on days 1–2) and pre-emptively offer flexible swaps. This is n-of-1 personalisation, as McNulty suggests.
- **R-SEX-1 (C):** Use the same progression logic for both sexes. Optionally allow slightly higher rep targets at a given RIR for women. Avoid sex-specific stereotyped programmes.
- Screen for warning signs of **low energy availability / RED-S** (amenorrhoea > 3 months, frequent stress fractures). This is a referral flag (C).

### Gaps
- Research on perimenopause/menopause and training adaptation in recreational women was not reviewed. Hormonal contraception subgroups are under-researched.

---

## 10. Age-related considerations (40+, 60+)

### Takeaway
Older adults adapt to RT and endurance training in relative terms. Recovery evidence after RT in people aged 65+ is **too thin for precise rules** (scoping review). The practical approach is conservative progression, more emphasis on **power/velocity** and balance from 60+, a slightly longer recovery between hard sessions, and earlier deloads, all autoregulated by the same feedback loops.

### Cited Findings
- Hayes et al.? (2023), "Recovery from Resistance Exercise in Older Adults: A Systematic Scoping Review", *Sports Med – Open* 9, doi:10.1186/s40798-023-00597-1. About 10,976 records screened, 27 studies included (age ≥ 65). Available data make **clear recommendations challenging**. Women are underrepresented. **Strength loss** is the most practical marker of muscle damage. Soreness duration may affect adherence — [PMC10317890](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10317890/)
- [prior knowledge] Fragala, Cadore, Dorgo, Izquierdo, Kraemer, Peterson & Ryan (2019), "Resistance Training for Older Adults: Position Statement From the NSCA", *J Strength Cond Res* 33(8):2019–2052, doi:10.1519/JSC.0000000000003230.
  - 2–3 sessions/week, 1–3 sets per exercise, 70–85% 1RM.
  - Include **power training** (fast concentric, moderate load) and balance.
  - Progress individually; RT is safe with proper screening.
- [prior knowledge] Masters athletes: HRV declines with age, so **absolute thresholds are not transferable**. Personal baselines matter more, which supports the z-score approach in §3. (General physiological knowledge; no specific citation verified.)

### Inferences (implementable rules)
- **R-AGE-1 (C):** Age 40+: default to at least 48 h between hard sessions for the same muscle group or energy system, and a deload every 5–6 weeks.
- **R-AGE-2 (C):** Age 60+:
  - deload every 4–5 weeks;
  - progression steps half as large (for example, +2.5% load);
  - at least 1 power-oriented exercise per session (explosive concentric, RIR ≥ 3);
  - balance and mobility block 2×/week;
  - next-day soreness/strength check-in weighted higher.
- **R-AGE-3 (C):** All readiness thresholds are relative to personal baselines, never absolute HRV/RHR values, which handles age effects automatically.
- **R-AGE-4 (B/C):** Screening (§8) is applied strictly at 60+. Endurance HIIT is allowed if screened and progressed gradually.

### Gaps
- No direct evidence on optimal deload frequency or recovery windows by age decade for recreational concurrent trainees. Recommendations are extrapolated (C/D).
- The 40–64 age band is under-studied for recovery kinetics.
