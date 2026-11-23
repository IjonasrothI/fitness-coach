# Technical feasibility: private SwiftUI fitness app (2–3 users, Apple Watch + COROS), as of Nov 2026

Note on method: about 20 web searches and fetches, run 23 Nov 2026. Some primary pages could not be read: the COROS support pages returned 403, the checkmark cells in Apple's capability tables did not survive extraction, and PMC showed a bot check. Those points are marked **[UNCERTAIN]** or listed under Gaps. "General knowledge" means not verified against a source in this session.

## 1. Distribution for private use (free Apple ID vs. paid program, TestFlight, ad hoc, EU)

### Takeaway
The paid Apple Developer Program (99 USD/year, one account) is the practical route. It lets 2–3 people use the app long-term through TestFlight internal testing (builds last 90 days) or ad hoc builds. A free Personal Team works only on devices you build to from your own Mac, and installs expire after 7 days. Whether a free team can use HealthKit is disputed (see below). EU alternative marketplaces don't help this use case.

### Cited Findings
- Free tier (Personal Team): up to 3 devices, up to 10 App IDs, up to 3 apps per device. Profiles and App IDs expire after 7 days, so apps must be rebuilt and reinstalled. The free tier excludes Certificates/Identifiers/Profiles, App Store Connect, TestFlight, Xcode Cloud and notarization. Apple says that to "build and test more advanced capabilities and services, join the Apple Developer Program." — [Apple: Choosing a Membership](https://developer.apple.com/support/compare-memberships)
- Apple's capability tables have three columns: ADP (paid Developer Program), ADEP (Enterprise) and "Apple Developer" (a free Apple Account with the agreement accepted, which cannot distribute apps). Some capabilities are marked "development only". HealthKit has a row, but its free-tier cell could not be extracted. — [Apple: Supported capabilities (iOS)](https://developer.apple.com/help/account/reference/supported-capabilities-ios/)
- **HealthKit on a free Personal Team is disputed [UNCERTAIN]:**
  - One open-source project says Apple grants the HealthKit capability only to paid members and Xcode refuses to sign for a free team. — [GitHub PR, life-dashboard-companion-app-ios #90](https://github.com/owen282000/life-dashboard-companion-app-ios/pull/90)
  - Other sources say Apple's table lists HealthKit for the free tier, and that Xcode's automatic signing enables it. Re-signing tools such as SideStore and Sideloadly drop the entitlement, so no Health permission sheet appears. — [GitHub PR, scootsy/HIIT #16](https://github.com/scootsy/HIIT/pull/16); [GitHub: cjwillin/health-ios, a HealthKit spike for free Apple IDs](https://github.com/cjwillin/health-ios); [Nirmitee HealthKit guide 2026](https://nirmitee.io/blog/apple-health-healthkit-api-integration-guide/)
  - A developer forum thread asking exactly this has no answer. — [Apple Developer Forums 722522](https://developer.apple.com/forums/thread/722522)
  - One forum error report reads: "iOS Team Provisioning Profile … doesn't support the HealthKit capability." It is unclear whether that was a free account. — [Apple Developer Forums 685129](https://developer.apple.com/forums/thread/685129)
- In a related thread about Family Controls, Apple DTS said the Personal Team feature "has significant limitations." — [Apple Developer Forums 764682](https://developer.apple.com/forums/thread/764682)
- TestFlight: up to 100 internal testers, who must be App Store Connect users on the team, and up to 10,000 external testers. Builds are available for 90 days and can be expired early. — [App Store Connect Help: TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/overview-of-testflight/); [Add internal testers](https://www.developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers)
- An older Instabug post says the limit is 25 internal testers. That is outdated and contradicted by Apple's current figure of 100. — [Instabug](https://www.instabug.com/blog/testflight-beta-testing-setting-effective-tests)
- It is not documented whether the 90 days run from upload or from beta approval. — [newly.app: TestFlight build expiry](https://newly.app/guides/testflight-build-expiry)
- The Developer Program costs 99 USD/year. Fee waivers are only for nonprofits, accredited educational institutions and government entities. — [Apple: fee waiver](https://developer.apple.com/support/fee-waiver); [appbuilder24 (2026)](https://appbuilder24.com/blog/apple-developer-account-needed). Price in EUR: 99 EUR (general knowledge, not verified this session).

### Inferences
- Recommended route: one paid account, held by the developer. Add the other 1–2 people as App Store Connect users (for example with the "Customer Support" or "Developer" role) and install via TestFlight internal testing. Internal testing doesn't need Beta App Review (general knowledge). Upload a new build at least every 90 days, for example through an Xcode Cloud workflow included with the program.
- Ad hoc alternative (paid only): register each person's device UDID. Profiles last about a year, and there is a 100-device-per-type yearly limit (general knowledge, not verified this session). Installation is through Xcode or Apple Configurator. This is more cumbersome than TestFlight but doesn't expire after 90 days.
- Free Personal Team: workable only for the developer's own phone, and maybe a partner's phone built from the same Mac. You would re-sign weekly and couldn't use TestFlight, CloudKit containers or push (general knowledge that CloudKit and push need the paid program). Even if HealthKit is technically allowed, this is unsuitable for 2–3 people long-term.
- EU alternative app marketplaces and web distribution under the DMA require a paid developer account, notarization and Apple's alternative terms (general knowledge). They are aimed at public distribution, so they offer no advantage over TestFlight for 2–3 private users. Non-EU users can't use them.

### Gaps
- The definitive checkmark for HealthKit in the "Apple Developer (free)" column couldn't be extracted. Test it yourself: create a free-team build in Xcode and see whether the Health permission sheet appears.
- The current EUR price and exact ad hoc device limits weren't verified this session.

## 2. HealthKit: readable types, background delivery, writing, WorkoutKit, iOS 18/26 changes

### Takeaway
HealthKit covers almost everything needed: workouts with routes, HR, resting HR, HRV (SDNN), VO2max, running speed and power, cycling power and cadence, sleep stages, body mass and dietary nutrients. The app can write workouts, and WorkoutKit (iOS 17+) can push structured interval workouts to the Apple Watch Workout app. Since iOS 26 the full workout-session API also runs on iPhone. Background delivery exists but is best-effort and rate-limited.

### Cited Findings
- Setup: add the HealthKit capability under Signing & Capabilities. Background Delivery and Clinical Health Records are nested sub-capabilities. — [Apple: Setting up HealthKit](https://developer.apple.com/documentation/healthkit/setting-up-healthkit); [Apple: Configuring HealthKit access](https://developer.apple.com/documentation/xcode/configuring-healthkit-access)
- Data type catalog: [Apple: HealthKit data types](https://developer.apple.com/documentation/healthkit/data-types). From general knowledge, matching the catalog structure but not checked type by type this session:
  - HKWorkout, plus HKWorkoutRoute (series of CLLocation points)
  - heartRate, restingHeartRate, heartRateVariabilitySDNN, vo2Max
  - runningSpeed, runningPower, runningStrideLength, groundContactTime, verticalOscillation (iOS 16+)
  - cyclingPower, cyclingCadence, cyclingSpeed, cyclingFunctionalThresholdPower (iOS 17+)
  - sleepAnalysis with stages: asleepCore, asleepDeep, asleepREM, awake, inBed (stages iOS 16+)
  - bodyMass, bodyFatPercentage
  - dietaryEnergyConsumed, dietaryProtein, dietaryCarbohydrates, dietaryFatTotal, and others
- Permissions are granted per data type, separately for read and write. For privacy, apps can't tell whether read access was denied (general knowledge).
- Background delivery: HealthKit wakes the app at most once per period of the registered frequency. On iOS some types have an hourly maximum: stepCount triggers at most once per hour, even with `.immediate`. — [Apple: enableBackgroundDelivery](https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery%28for:frequency:withcompletion:%29); [Apple Forums 823699](https://developer.apple.com/forums/thread/823699)
- Developer reports of unreliable background delivery:
  - Updates arriving only when the app comes to the foreground — [Forums 856115](https://developer.apple.com/forums/thread/856115)
  - No delivery after the app is force-quit — [Forums 803365](https://developer.apple.com/forums/thread/803365)
  - Instability on watchOS 26 — [Forums 803194](https://developer.apple.com/forums/thread/803194)
  - Questions about the frequency for sleepAnalysis — [Forums 790004](https://developer.apple.com/forums/thread/790004)
- iOS 26 / WWDC25 session 322 ("Track workouts with HealthKit on iOS and iPadOS"): apps can use HKWorkoutSession plus a workout builder on iPhone and iPad to track any activity and save it to HealthKit. The session covers crash recovery via the scene delegate and Live Activities/Siri on the Lock Screen. iPhone has no built-in HR sensor but can pair with a compatible HR device. Health data can't be read while the device is locked, and an iPhone locks more often than a Watch. — [WWDC25 session 322](https://developer.apple.com/videos/play/wwdc2025/322)
- HKLiveWorkoutDataSource is available on iOS/iPadOS 26. — [Apple Forums 790321](https://www.developer.apple.com/forums/thread/790321)
- Medications API (iOS 26, WWDC25 session 321): HKUserAnnotatedMedication and dose events. Per a third-party summary (unverified), it doesn't use the normal requestAuthorization sheet; the user grants access per medication. — [WWDC25 session 321](https://developer.apple.com/videos/play/wwdc2025/321/); [Axiom guide (third-party)](https://charleswiltgen.github.io/Axiom/skills/health/wellbeing-and-medications)
- iOS 18: HKStateOfMind (mood and emotion logging) and the GAD-7/PHQ-9 assessments in the Mental Wellbeing category. — [Apple Health privacy page](https://www.apple.com/legal/privacy/data/en/health-app/); [Apple HealthKit updates](https://developer.apple.com/documentation/updates/healthkit)
- WorkoutKit: iOS and watchOS apps can create and preview workouts and sync scheduled workouts to the Apple Watch Workout app. The flow is: get the `WorkoutScheduler.shared` instance, call `requestAuthorization()`, then `schedule(_:at:)`. `CustomWorkout` holds structured steps with goals and alerts, and `dataRepresentation(as:)` exports a plan. — [Apple: WorkoutKit](https://developer.apple.com/documentation/workoutkit); [WWDC23 10016](https://developer.apple.com/videos/play/wwdc2023/10016); [WWDC24 10084](https://developer.apple.com/videos/play/wwdc2024/10084)
- A community example says the WorkoutKit scheduler needs watchOS 10 or 11 or later and a paired Apple Watch. Test on real hardware. — [devgenius blog](https://blog.devgenius.io/over-engineering-my-morning-run-with-apples-workoutkit-7b3e76346bf4); [pub.dev apple_workout_scheduler](https://pub.dev/documentation/apple_workout_scheduler/latest/)

### Inferences
- Every user's data stays in their own Health store on their own iPhone. The app reads it locally and needs no server.
- Writing: the app can save HKWorkout objects with routes and samples, for example a strength session logged on iPhone, and nutrition samples (general knowledge, consistent with the WWDC25 builder API).
- Use WorkoutKit for Apple Watch users only. COROS users need structured workouts pushed through the COROS app or an intervals.icu sync (see section 3).
- Design for robustness: run anchored queries (HKAnchoredObjectQuery) on every app launch, and treat background delivery as an optional bonus.

### Gaps
- The exact iOS versions for each data type weren't verified one by one this session.
- iOS 26.x HealthKit additions after WWDC25 (for example sleep score, hypertension notifications) and whether they are readable by third parties: no source checked this session **[UNCERTAIN]**.

## 3. COROS: what reaches Apple Health; API access; alternatives

### Takeaway
COROS writes a limited set to Apple Health: HR, sleep analysis, steps and distances, and probably workouts (exact details unverified). Proprietary metrics such as HRV and Wellness Check, training load and COROS's own VO2max estimates generally don't reach Apple Health. Since 2026, COROS offers self-service OAuth/MCP access, but it returns summaries rather than raw streams. The commercial Partner API is for companies only. The most reliable way to get raw COROS data is FIT export or intervals.icu.

### Cited Findings
- The COROS support article lists these data types that can be synced to Apple Health: Cycling Distance, Heart Rate, Sleep Analysis, Steps, Swimming Distance, Walking + Running Distance. You choose them under COROS app > Profile > Settings > 3rd Party Apps > Data Sync > Apple Health. — [COROS Support: Connecting Apple Health with COROS App](https://support.coros.com/hc/en-us/articles/360041549551-Connecting-Apple-Health-with-COROS-App) (from search snippet; the page returned 403 on fetch)
- The COROS App Store notes say "HRV Index is replaced by Wellness Check". No evidence was found that HRV or Wellness Check data syncs to Apple Health. — [COROS on the App Store](https://apps.apple.com/app/id1277625343)
- User reviews report gaps. Some want more of the "today" data sent to Apple Health, especially sleep, and some say data stopped transferring after an update. This is anecdotal. — [App Store reviews](https://apps.apple.com/de/app/coros/id1277625343?l=en-GB)
- Apple and Google Health store only the metrics agreed with the watchmaker (steps, calories, HR, sleep, activity summaries). Proprietary metrics such as VO2max and training load are generally not included. — [the5krunner, May 2026](https://the5krunner.com/2026/05/13/coros-mcp-ai-data/)
- Routes: no source confirms that COROS writes HKWorkoutRoute to Apple Health. A WHOOP community thread shows that even consumers of Apple Health often ignore GPS from non-Apple watches. — [WHOOP Community](https://www.community.whoop.com/t/synching-apple-health-gps-data-to-whoop-activity-from-non-apple-watch/12962) **[UNCERTAIN]**
- COROS MCP (official, 2026) has 15 read-only tools covering profile, devices, activity lists and details (HR, pace, elevation, cadence), daily health (steps, calories, average and resting HR, stress, sleep), HRV, recovery, training load, VO2max, race predictions and training plans. It withholds GPS detail, per-second HR and pace, laps and splits, power, running dynamics and structured-workout uploads. During testing the API often returned "temporarily unavailable". — [the5krunner, May 2026](https://the5krunner.com/2026/05/13/coros-mcp-ai-data/)
- COROS developer access:
  - A self-service OAuth 2.0 path for developers building personal apps or integrations, with no application required.
  - The Partner API requires an established platform with users, a registered company and a technical representative, applied for via api@coros.com. It allows 1,000 calls/minute.
  - Source: COROS support pages from search snippets, updated May 2026 — [COROS Support 53181766856724](https://support.coros.com/hc/en-us/articles/53181766856724); [Submit an API Application](https://support.coros.com/hc/en-us/articles/17085887816340-Submit-an-API-Application)
  - Nango (possibly outdated) says the COROS API docs are private and shared on request. — [Nango](https://nango.dev/docs/integrations/all/coros)
- An unofficial, reverse-engineered COROS API exists (community MCP). It is unsupported and may break. — [GitHub: CuberL/coros-mcp](https://github.com/CuberL/coros-mcp)
- Strava API:
  - New apps start in "Single Player Mode", which allows access to your own data only (athlete capacity 1). Default limits are 200 requests per 15 minutes and 2,000 per day, plus a separate non-upload limit of 100 per 15 minutes and 1,000 per day. — [Strava rate limits](https://developers.strava.com/docs/rate-limits/); [Strava getting started](https://developers.strava.com/docs/getting-started/)
  - From June 2026, new Standard-tier developers need a Strava subscription (search snippet; verify). — [Strava developer program](https://communityhub.strava.com/developers-knowledge-base-14/our-developer-program-3203); [TechRepublic on API tightening](https://www.techrepublic.com/article/news-strava-api-scraping-crackdown/)
- intervals.icu: a personal API key lives under Settings > Developer Settings and uses Basic auth with username `API_KEY`. Third-party apps need OAuth. COROS syncs to intervals.icu, but users report activities appear in the API only after a sync is triggered on the website. — [intervals.icu Open API](https://www.intervals.icu/features/open-api/); [forum: API access](https://forum.intervals.icu/t/api-access-to-intervals-icu/609); [forum: COROS sync](https://forum.intervals.icu/t/data-sync-from-oura-and-coros-schedule-and-activities-sync-endpoint-question/115493)
- intervals.icu can send structured workouts to COROS, with some known issues (for example mixed pace/HR targets). — [forum: COROS structured workouts](https://forum.intervals.icu/t/coros-and-structured-workouts/16859); [forum: mixed targets](https://forum.intervals.icu/t/coros-workout-sync-issue-with-mixed-pace-and-heart-rate-targets/132977)

### Inferences
- Tiered approach for COROS users:
  1. Apple Health for HR, sleep and daily data (zero effort).
  2. For full workouts with streams, laps and power: either manual FIT export from the COROS app/web with parsing in the app (for example via a Swift FIT SDK), or intervals.icu as a hub through a personal API key per user.
  3. The COROS self-service OAuth/MCP route for summaries such as HRV and training load, if it becomes stable.
- Embedding a personal intervals.icu key in the app is acceptable for 2–3 users if each user enters their own key and it is stored in the iOS Keychain.

### Gaps
- Exact current COROS → Apple Health behaviour (workouts with type/duration/energy, HR samples during workouts, routes, sleep stages vs. "asleep" only) couldn't be verified, because the COROS pages returned 403 and no reliable test report was found. Recommendation: test empirically with a COROS watch.
- No documentation was found on the endpoints and data scopes of the COROS self-service OAuth.

## 4. Data storage (on-device, CloudKit, backup)

### Takeaway
No server is needed. Each user's data can live on-device in SwiftData (iOS 17+), with optional sync to that user's own iCloud private CloudKit database. HealthKit stays the source of truth for health data. CloudKit requires the paid program.

### Cited Findings
- iCloud/CloudKit is a capability in Apple's table. The free-tier column couldn't be extracted. — [Apple: Supported capabilities (iOS)](https://developer.apple.com/help/account/reference/supported-capabilities-ios/)

### Inferences (general knowledge, not source-verified this session)
- SwiftData's `ModelConfiguration(cloudKitDatabase: .private(...))` syncs automatically to each user's private CloudKit database. The data counts against the user's iCloud quota, not the developer's, and is free for the developer.
- CloudKit sync restrictions in SwiftData: no unique constraints, all properties optional or with default values, and relationships must be optional.
- Backup: HealthKit data is backed up with the iCloud/encrypted device backup and synced through iCloud Health. App data is covered through CloudKit or the device backup. Add JSON/CSV export via the Files app as an extra safety net.
- Sharing between the 2–3 people, for example a group leaderboard, would need a CloudKit shared database (CKShare) or the public database. This is optional.

### Gaps
- No primary sources were fetched this session for the SwiftData + CloudKit restrictions or for whether CloudKit is available on a free team.

## 5. Photo-based nutrition tracking (accuracy, apps, LLM API cost/privacy, Apple Health)

### Takeaway
AI photo estimates have small average bias but large per-meal error. Commercial apps underestimated about 250–345 kcal per meal (roughly a third) in a 2026 NIH feeding study. LLMs identify foods well, but portion and volume, hidden fats and protein remain weak points. With a Claude API call, a private app is technically easy and cheap (roughly 0.1–4 US cents per photo depending on model). The API key must not be shipped in the app binary unprotected, and photos leave the device.

### Cited Findings
- NUTRITION 2026 (American Society for Nutrition, July 2026; conference abstract, not yet peer-reviewed): 102 weighed meals from a controlled feeding study were photographed and analysed by MyFitnessPal, Lose It!, Cal AI and Appediet.
  - Mean calorie underestimation: Appediet 252 kcal, MyFitnessPal 327, Lose It! 333, Cal AI 345, roughly a third overall.
  - All apps underestimated fat by about 30 g. Lose It! and Cal AI underestimated carbohydrates by about 14 g.
  - Accuracy was worse for keto (high-fat) meals in a follow-up of more than 200 meals.
  - Sources: [Healio, 4 Aug 2026](https://www.healio.com/news/primary-care/20260804/ai-photobased-calorietracking-tools-underestimate-them-by-33); [HealthDay](https://www.healthday.com/health-news/nutrition/how-accurate-are-photo-based-calorie-apps-4-are-put-to-the-test); [ScienceDaily](https://sciencedaily.com/releases/2026/07/260726015237.htm); [News-Medical](https://www.news-medical.net/news/20260726/Photo-based-calorie-tracking-apps-fall-short-in-estimating-meal-nutrition.aspx)
- arXiv 2610.26538 (Li, Oct 2026; preprint): 8 general-purpose LLMs (Claude Haiku/Sonnet/Opus 5.5, three GPT-6 variants, two Gemini models) on 802 weighed meals from the ACETADA feeding trial.
  - Only one model met the ±30% limits of agreement, narrowly (−28% to +27%).
  - All models underestimated protein.
  - Subtracting a "leftovers" photo's estimate usually underestimated intake. Scaling the before-photo estimate by 0.87 recovered most of the benefit of the second photo.
  - Repeated calls changed error by 1.4 points at most.
  - Author's conclusion: "A low average bias is not evidence of accurate individual intake estimation."
  - Source: [arXiv 2610.26538](https://arxiv.org/abs/2610.26538)
- GPT-4V (arXiv 2312.08592, 2023): up to 87.5% food-detection accuracy without fine-tuning. Portion error was 54.6 g, versus 43.6 g for dietitians. — [arXiv 2312.08592](https://arxiv.org/abs/2312.08592v1)
- Virginia Tech thesis (Sept 2025), 8 multimodal models including GPT-4o: calorie error about 51% from the image alone, about 29% when per-ingredient mass was supplied. — [VTechWorks](https://vtechworks.lib.vt.edu/items/b67c2a61-f283-41ba-9602-9798306b9529)
- MLLMs struggle with volume recognition, which drives calorie errors. Fine-tuned models (CalorieLLaVA on Nutrition5k) beat GPT-4V. — [Tanabe & Yanai 2024 (CalorieVoL)](https://mm.cs.uec.ac.jp/pub/conf24/250109tanabe_0.pdf); [Tanabe & Yanai 2024 (CalorieLLaVA)](https://mm.cs.uec.ac.jp/pub/conf24/241201tanabe_0.pdf)
- ChatGPT-5 study (Nutrients, Nov 2025): accuracy dropped when the image was omitted, even with detailed ingredient text. The image adds value, and image plus context works best. — [PMC12655113](https://pmc.ncbi.nlm.nih.gov/articles/PMC12655113/) (full text not readable because of a bot check; finding from the search snippet)
- Claude API pricing (Nov 2026, per million input/output tokens): Haiku 5.5 $0.10/$0.50 (prompts up to 100k tokens), Sonnet 5.5 $2/$10, Opus 5.5 $4/$20. The Batch API gives 50% off. — [Claude pricing docs](https://platform.claude.com/docs/en/about-claude/pricing)
- Image cost = image tokens × input price. Older models used up to about 1,568 tokens per image; high-resolution images on Opus 4.7 and later use up to about 4,784. — [Claude Vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- A third-party analysis puts a typical phone photo at about 6,636 tokens on Claude (May 2026). This is higher than the Claude docs' figure, possibly because of different resolution handling **[conflict, UNCERTAIN]**. — [Roboflow](https://blog.roboflow.com/image-token-cost-vlm/)

### Inferences
- Cost per photo, assuming about 1,600–6,600 image tokens, about 500 prompt tokens and about 400–600 output tokens:
  - Haiku 5.5: about $0.0005–0.001
  - Sonnet 5.5: about $0.008–0.02
  - Opus 5.5: about $0.02–0.04
  - At 3 users × 4 photos/day, that is roughly 0.10–15 USD/month. Downscaling images (for example to about 1,000 px) cuts cost.
- Accuracy-oriented design:
  - Let the user correct portions.
  - Ask for a reference object, or use a depth/LiDAR estimate as an option.
  - Ask the user about cooking oil, sauces and drinks.
  - Show uncertainty ranges and treat results as trend data, not exact intake.
  - Do protein-focused reviews, since all models underestimate protein.
- API key handling: a key embedded in the app binary can be extracted. For 2–3 trusted users the pragmatic options are:
  1. Each user enters their own Anthropic API key, stored in the Keychain.
  2. A tiny proxy, such as a Cloudflare Worker or a serverless function, that holds the key and authenticates users, for example with Sign in with Apple. This adds a small server after all.
- Privacy: meal photos and any health context sent to the API leave the device. Check Anthropic's commercial terms and data-retention settings; API data isn't used for training by default (general knowledge; verify current terms). Minimise what you send: don't send names, and strip EXIF location.
- Apple Health nutrition: dietary types (dietaryEnergyConsumed, macros, micronutrients) are readable with permission. Apps like MyFitnessPal and Cronometer write to them, so the coach app can read nutrition logged elsewhere instead of building photo AI itself (general knowledge on which apps write; not verified this session).

### Gaps
- No specific accuracy figures were found for SnapCalorie or for MyFitnessPal Meal Scan as a separate feature. The NIH study tested the MyFitnessPal app's photo function, but the feature name wasn't confirmed.
- No JMIR systematic review from 2025/2026 with pooled MAPE was retrieved.

## 6. Periodic automated literature updates (brief)

### Takeaway
Feasible with existing tooling and no app server. Run a scheduled agent (for example quarterly) that searches PubMed and preprints for defined queries and produces an "evidence update" report. The app itself only displays the result.

### Cited Findings
- No external sources were fetched for this point (out of scope for deep research).

### Inferences (general options)
- Claude Code scheduled cloud agents or routines (cron), or a local scheduled task, run a fixed research prompt each quarter and write a Markdown/PDF report to a folder or iCloud Drive.
- PubMed E-utilities (free API) with saved queries, or PubMed "My NCBI" email alerts as a no-code fallback, followed by an LLM summarisation step via the Batch API at 50% off (see the pricing source above).
- Show human-reviewed updates in the app as static content or a CloudKit public record. Don't automatically change training or nutrition recommendations without human review.

### Gaps
- No evaluation of the reliability of automated evidence synthesis was done in this session.
