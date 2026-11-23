# Fitness-Coach-App – Planung v1

Stand: 23.11.2026 · Grundlage: [reports/Evidenzbasis Fitness Coach App.md](reports/Evidenzbasis%20Fitness%20Coach%20App.md) (Regel-IDs K/E/F/T verweisen dorthin)

## 0. Rahmenbedingungen (entschieden)

| Thema | Entscheidung |
|---|---|
| Kosten | Ausschließlich kostenlos. Kein Developer-Konto, keine kostenpflichtigen APIs. |
| Geräte | iPhone, jede Person ihr eigenes Gerät. |
| Uhren/Apple Health | Werden ignoriert. Die App arbeitet mit Feedback und manuellen Kerndaten. |
| Equipment | Kurzhanteln bis 2 kg, 1 × Kettlebell 5 kg, 4 geschlossene Widerstandsbänder (Stufe 4 = schwer). Keine Anschaffungen. |
| Zeitbudget | Variabel. Pro Woche und pro Tag anpassbar; die App lernt, wie viel Zeit tatsächlich genutzt wird. |
| Planänderungen | Automatisch, immer sichtbar angezeigt mit Begründung, jederzeit überschreibbar. |
| Feldtests | Ja, regelmäßig, alle die für gute Pläne nötig sind. |
| Ernährung | Später. Nur wenn kostenlos und ohne Tipp-Aufwand machbar. |
| Nutzung | Rein privat. |
| Plattform | PWA (bestätigt). Hosting über GitHub Pages (kostenlos nur mit öffentlichem Repo: Code öffentlich, Daten bleiben auf dem iPhone). |
| Puls | Wird abgefragt (manuell von der Uhr abgelesen). Grundsatz: alles erfassen, was den Plan messbar verbessert, solange es schnell geht. |
| Rad | Sommer: Rennrad draußen (ohne Watt). Winter: Rolle indoor (mit Watt). |

## 1. Plattform: Web-App (PWA) statt nativer App

**Warum:** Eine native iPhone-App ohne bezahltes Konto läuft nur 7 Tage. Danach muss jedes iPhone per Kabel/WLAN an deinen Mac und neu aus Xcode installiert werden, und das maximal für 3 Geräte. Für mehrere Personen ist das unpraktisch. Da wir Apple Health ohnehin nicht nutzen, fällt der einzige Vorteil der nativen App weg.

**PWA (Progressive Web App):**
- In Safari öffnen → „Zum Home-Bildschirm" → verhält sich wie eine App (Vollbild, eigenes Icon, offline nutzbar).
- Kostenlos, kein Ablaufdatum, Updates erscheinen automatisch beim nächsten Öffnen.
- **Alle Daten bleiben lokal auf dem jeweiligen iPhone** (IndexedDB). Kein Server, keine Accounts, kein Datenaustausch.
- Hosting nur für den Programmcode: kostenlos über GitHub Pages oder Netlify. Der Code ist öffentlich abrufbar, die Trainingsdaten nicht.
- Sicherung: Export/Import als Datei (in iCloud Drive/Dateien speichern), plus Erinnerung alle 2 Wochen. Wichtig, weil Safari-Daten beim Löschen der Web-App mit verschwinden.
- Möglich: Timer, Vibration/Ton, Pausentimer, Benachrichtigungen (iOS 16.4+ für Home-Bildschirm-Apps).

**Technik:** TypeScript, Svelte oder React mit Vite, Dexie (IndexedDB), Diagramme mit einer kleinen Chart-Bibliothek. Die **Trainings-Engine ist ein eigenes, reines TypeScript-Modul** ohne UI-Abhängigkeit. Damit ist sie mit Unit-Tests prüfbar, und jede Regel ist eine Funktion mit Begründungstext und Regel-ID.

## 2. Profil und Onboarding (ca. 10 Minuten, einmalig)

1. **Basisdaten:** Name, Geburtsjahr, Geschlecht, Größe, Gewicht.
2. **Gesundheitscheck:** PAR-Q+ (F25). Ein verbleibendes „Ja" sperrt intensive Einheiten (HIIT, Tests bis zur Ausbelastung) und empfiehlt eine ärztliche Abklärung. Verletzungen/Problemzonen → Übungen ausschließen.
3. **Ziele (pro Profil abgefragt):**
   - Hauptausrichtung per Schieberegler: Kraft/Muskeln ↔ Ausdauer.
   - Bereiche anwählen: Muskelaufbau, Kraft im Alltag, Laufen, Radfahren, Gewicht/Körperzusammensetzung, Beweglichkeit, allgemeine Gesundheit.
   - Optionales konkretes Ziel (z. B. „10 km unter 50 min", „20 saubere Liegestütze", „einbeinige Kniebeuge").
   - Prozessziel als Standard (F23): z. B. „3 Einheiten pro Woche".
4. **Erfahrung** pro Bereich (Jahre, aktuelle Wochenumfänge, längster Lauf der letzten 30 Tage → Startwert für E14).
5. **Zeit:** typische Tage, typische Dauer pro Einheit (20/40/60 min), Bereitschaft zu Doppeleinheiten.
6. **Equipment:** vorausgefüllt (s. o.), Ankerpunkte im Haushalt (siehe Fragen).
7. **Optionale Zyklus-Symptome** (F28, nur mit ausdrücklicher Einwilligung; ändert den Plan nicht nach Phase).
8. **Einstiegstests** (siehe Abschnitt 5) über die ersten 1–2 Wochen verteilt, nicht alle an einem Tag.

## 3. Krafttraining-Engine

### 3.1 Bewegungsmuster und Variantenleitern

Jede Übung gehört zu einer **Leiter** (leicht → schwer). Die App wählt pro Person die Stufe, auf der ein Satz in 6–30 Wiederholungen bei 0–3 RIR endet (K5–K7). Beispiele (Entwurf, wird im Übungskatalog ausgearbeitet):

| Muster | Leiter (Auszug) |
|---|---|
| Kniedominant | Goblet Squat 5 kg → Split Squat → Bulgarian Split Squat (Defizit) → Skater Squat → Pistol-Negativ → Pistol (+ KB) |
| Hüftdominant | Hip Thrust → einbeinig → einbeinig mit Pause/Band; Einbeiniges RDL mit KB → mit Defizit; Gleitender Leg Curl (Handtuch auf Boden) → einbeinig; Nordic-Negativ (falls Anker, K20) |
| Horizontal drücken | Liegestütz erhöht → Boden → Defizit → mit Band → Archer → Einarm-Negativ |
| Vertikal drücken | Pike Push-up → Füße erhöht → Wand-Handstand-Negativ |
| Horizontal ziehen | Band-Rudern (Stufe 1–4, einarmig) → Tisch-Rudern (falls stabiler Tisch) → Füße erhöht → einarmig |
| Vertikal ziehen | Band-Latzug kniend (Anker oben) → einarmig → mit gedehnten Teilwiederholungen; Handtuch-Türrudern isometrisch |
| Arme/Waden/Rumpf | Band-Curls, Trizeps über Kopf, einbeiniges Wadenheben mit Dehnpause, Rumpf-Leitern |

**Ankerpunkte (bestätigt):** feste Gegenstände für Bänder, Sofa zum Einhaken der Füße (→ Nordic-Curl-Negative möglich).

**Übungs-Feedback „Klappt nicht" (M2):** Bei jeder Übung ein Knopf mit Gründen (Anker hält nicht / Schmerz / zu leicht / zu schwer / Technik unklar / mag ich nicht). Die App tauscht sofort gegen die nächstbeste Alternative desselben Bewegungsmusters und merkt sich das pro Person. Gesammelte Rückmeldungen lassen sich zusätzlich exportieren, um den Übungskatalog hier im Chat zu verbessern.

Zug (Rücken) ist der Engpass (K17). Lösung ohne Kauf: einarmige Band-Varianten, doppelt gelegte Bänder, Kombination Band + Körpergewicht, gedehnte Teilwiederholungen und Rest-Pause im letzten Satz.

### 3.2 Regeln pro Satz und Einheit

- **Logging pro Satz:** Wiederholungen + RIR (Schnellwahl 0/1/2/3/4+), optional Band-Stufe/Griffweite/Vordehnung (K12).
- **Satz zählt nur, wenn hart genug** (K5): RIR ≤ 3; bei > 25 Wdh. RIR ≤ 1.
- **Doppelte Progression** (K10): Alle Arbeitssätze am oberen Ende des Fensters bei Ziel-RIR → nächste Stufe, Neustart am unteren Ende.
- **> 30 Wiederholungen → schwerere Variante erzwingen** (K6).
- **Progressions-Reihenfolge** (K11): Wiederholungen → Variante → Intensivierung im letzten Satz.
- **RIR-Kalibrierung** (K9): alle 1–2 Wochen ein Satz bis zum Versagen bei einer sicheren Übung. Die Abweichung korrigiert künftige RIR-Angaben dieser Person.
- **Pausen** (K15): 60–90 s, harte einbeinige Beinübungen 90–180 s; bei wenig Zeit Antagonisten-Supersätze.
- **Reihenfolge** (K16): schwerste Fertigkeitsübung zuerst, Band-Finisher zuletzt.

### 3.3 Regeln pro Woche

- **Volumen** (K1–K4): 10–16 fraktionale harte Sätze pro Muskel und Woche als Standard, bis ~20 steigerbar; Minimaldosis in vollen Wochen 4–6. Jeder Muskel mindestens 2 × pro Woche. Höchstens 6–10 direkte Sätze pro Muskel und Einheit.
- **Volumen-Steuerung** pro Muskel aus Leistungstrend + Muskelkater + Readiness: Fortschritt und gute Erholung → +1–2 Sätze; stagnierend und schlecht erholt → −2 Sätze.
- **Plateau** (K18): 3 Einheiten ohne Fortschritt bei „Wdh. + RIR" → Erholung prüfen → Variante wechseln → Volumen +1–2 → Wiederholungsfenster ändern.

## 4. Ausdauer-Engine (Laufen + Rad)

### 4.1 Lauf-Tracking

Aufzeichnung läuft weiter auf der Uhr (eine PWA kann bei gesperrtem Bildschirm kein GPS aufzeichnen). Nach dem Lauf trägst du in ~20 s ein:

| Feld | Pflicht | Wofür |
|---|---|---|
| Dauer, Distanz | ja | Pace, Wochenumfang, **Einzellauf-Regel** (E14) |
| Ø-Puls | ja (abgelesen) | Intensitätszone, aerobe Effizienz |
| Max-Puls | optional | Ersetzt geschätzte HFmax, sobald höher beobachtet (E3) |
| Session-RPE 0–10 | ja | Belastung = RPE × Minuten (E11) |
| Einheitstyp | vorausgefüllt | locker / lang / Tempo / Intervalle / Test |
| Intervall-Ergebnis | nur bei Intervallen | Ø-Pace der Arbeitsintervalle → Kontrolle gegen Zielpace |
| Puls 2. Hälfte | optional, nur Long Run | Herzfrequenz-Drift (wird kleiner, wenn die Grundlage besser wird) |
| Schmerz/Region | wie bei allen Einheiten | Schmerzregeln (F27), Rad-Ersatz (E25) |

Geplante Einheit ist vorausgefüllt: bei „wie geplant" nur Puls und RPE eintippen.

**Was die App daraus berechnet und wie es den Plan steuert:**
- **Long-Run-Deckel:** Längster Lauf der letzten 30 Tage → nächster Long Run maximal +10 % (E14).
- **Intensitätsverteilung:** Zeit pro Zone aus Einheitstyp + Ø-Puls + RPE → Prüfung gegen pyramidale Zielverteilung (E1). Zu viele „lockere" Läufe mit RPE ≥ 5 oder Puls über der Talktest-Grenze → Hinweis „locker langsamer laufen".
- **Aerobe Effizienz (Hauptfortschritts-Signal ohne Test):** Geschwindigkeit pro Herzschlag bei lockeren Läufen (m/min ÷ Puls), geglättet über 3–4 Wochen. Steigt sie, wird die Grundlage besser. Stagniert sie 6–8 Wochen trotz Trainingstreue → Reiz ändern (F17).
- **Critical Speed aus den Feldtests** → Pace-Zonen für Tempo/Intervalle und VO2max-Trend (E4, E6, E21). Zwischen zwei Tests leitet die App aus Intervall-Ergebnissen ab, ob die Zielpace zu leicht/zu schwer war (RPE und erreichte Pace), und passt sie um 1–2 % an.
- **Wochenumfang:** weicher Hinweis bei > 20–30 % Zuwachs in 2 Wochen (E15).

**Optional später (kostenlos, mehr Genauigkeit):** Import einer FIT/GPX/TCX-Datei. Die COROS-App kann einzelne Aktivitäten als Datei exportieren → in „Dateien" speichern → in der App importieren. Dann liest die App Pace, Puls-Verlauf, Runden und Drift automatisch aus. Für die Apple Watch gibt es keinen kostenlosen Export ohne Zusatz-App, dort bleibt es bei manueller Eingabe.

### 4.2 Radfahren: Outdoor (Sommer) und Indoor (Winter)

**Was unterscheidet sich (Studienlage, klein und uneinheitlich):**
- **Durchschnittsleistung ist oft ähnlich:** 20-min-Zeitfahren indoor 280 W vs. outdoor 284 W, Korrelation r = 0,94 ([Jeffries 2019](https://research.stmarys.ac.uk/3000/3/Jeffries-et-al-Analysis-of-Variability.pdf)). Bei einzelnen Fahrern weicht es aber deutlich ab, Werte sind nicht 1:1 austauschbar ([MMP-Studie](https://researchportal.murdoch.edu.au/esploro/outputs/journalArticle/An-analysis-of-variability-in-power/991005541649607891)).
- **Bei freier Wahl fahren viele draußen härter:** 208 vs. 163 W, Puls 152 vs. 143 ([Mieras 2014](https://pubmed.ncbi.nlm.nih.gov/24476776/)). Indoor muss man sich bewusst mehr anstrengen.
- **Draußen schwankt die Leistung viel stärker** (Anstiege, Wind, Rollen, Ampeln) ([Jeffries 2019](https://research.stmarys.ac.uk/3000/3/Jeffries-et-al-Analysis-of-Variability.pdf)). Indoor tritt man durchgehend → 60 min indoor ≈ mehr Arbeit als 60 min draußen mit Rollphasen.
- **Wärme:** Ohne Fahrtwind steigt die Körpertemperatur, der Puls driftet nach oben, Leistung kann bei Hitze sinken ([Peiffer & Abbiss 2011 via Übersicht](https://www.roadbikerider.com/heat-indoor-cycling/)). Ein Ventilator hilft wahrscheinlich, die Evidenz ist aber dünn ([Fernandez](https://scholars.georgiasouthern.edu/en/publications/fan-cooling-improves-submaximal-exercise-capacity-in-an-indoor-th/)). Tipp, kein Muss: Fenster auf oder vorhandenen Ventilator nutzen.
- **Geschwindigkeit draußen sagt wenig über Fitness** (Wind, Steigung, Windschatten) → wird nicht als Leistungsmaß genutzt.

**Wie die App das einrechnet:**

| | Indoor (Rolle, mit Watt) | Outdoor (Rennrad, ohne Watt) |
|---|---|---|
| Eingabe | Dauer, Ø-Watt (bei Intervallen Ø-Watt der Intervalle), Ø-Puls, RPE | Dauer, Distanz, Höhenmeter (optional), Ø-Puls, RPE, Anteil Gruppe/Windschatten (optional) |
| Zonen | **Watt-Zonen** aus indoor-FTP-Test (E7) | **Puls- und RPE-Zonen**, kalibriert an den Indoor-Daten |
| Belastung | Session-RPE × min **und** Watt-basierte Last (Intensität² × Stunden) zum Abgleich | Session-RPE × min |
| Fortschritt | **Watt pro Herzschlag** bei lockeren Fahrten (beste Fitness-Messgröße der ganzen App) + FTP-Tests | Puls-/RPE-Trend bei vergleichbaren Hausrunden (optional als „Teststrecke" markieren) |
| Einheiten | Strukturierte Intervalle (präzise steuerbar) | Lange lockere Fahrten, Tempo nach Gefühl/Puls |

- **Getrennte Werte pro Umgebung:** Indoor-FTP gilt für die Rolle. Die App lernt pro Person das Verhältnis zwischen Indoor-Puls bei gegebenen Watt und dem Outdoor-Puls. Kein fester Umrechnungsfaktor, weil die Unterschiede individuell sind.
- **Puls-Korrektur indoor:** Steigt der Puls bei gleicher Leistung in der 2. Hälfte stark an (Hitzedrift), wird das als Wärmeeffekt markiert und nicht als schlechte Form gewertet.
- **Saisonlogik:** Winter = strukturierte, kürzere Indoor-Einheiten (ideal für Intervalle und FTP-Tests). Sommer = längere Outdoor-Grundlagenfahrten. Wechsel automatisch nach Eingabe „indoor/outdoor" pro Einheit, nicht nach Datum.
- **Rad und Laufen zusammen:** Rad zählt voll in Wochenbelastung, Intensitätsverteilung und WHO-Minuten, aber nicht in die Einzellauf-Regel (E16). Rad- und Laufzonen getrennt (E25).
- **Intensitätsverteilung pyramidal** (E1): ~75–85 % locker, 10–20 % Schwelle/Tempo, 5–10 % hoch; 1–2 Qualitätseinheiten pro Woche, HIIT max. 2 (E22).
- **Zonen ohne Uhr:**
  - Locker = Talktest (ganze Sätze sprechbar) (E5).
  - Laufen: Pace-Zonen aus Critical Speed (E4, E6).
  - Rad: Zonen über RPE + Talktest; Puls-Zonen nur optional (Tanaka, nie 220 − Alter, E3).
- **Einzellauf-Regel** (E14): Referenz = längster Lauf der letzten 30 Tage. > 10 % länger → Warnung; > 30 % → ausdrückliche Bestätigung; nie > 100 %. Long Run wächst in ≤ 10-%-Schritten. Kein ACWR (E12), keine harte 10-%-Wochenregel (E15).
- **Kombination mit Kraft** (E17–E19): harte Beinkraft nicht < 24 h vor einem Schlüssellauf; am selben Tag ≥ 3 h Abstand oder Kraft zuerst. Bei Muskelaufbau-Priorität Rad bevorzugen. Laufbeschwerden → lockeres Laufvolumen durch Rad ersetzen (E25).
- **Wöchentliche Untergrenze** (E20): ≥ 150 min moderat-äquivalent + 2 Krafttage, sichtbar als Gesundheits-Basis.
- **Hauptkennzahl Gesundheit** (E21): geschätzte VO2max aus Critical-Speed-Test (Trend, nicht absolut).

## 5. Feldtests

| Test | Was | Wie oft | Ergebnis |
|---|---|---|---|
| Kraft-Einstufung | Pro Bewegungsmuster eine Variante bis 1 RIR (bzw. Versagen bei sicheren Übungen) | Einstieg; nach jedem Block | Startstufe auf jeder Leiter |
| RIR-Kalibrierung | 1 Satz bis Versagen, eine sichere Übung | alle 1–2 Wochen (rotierend) | Korrekturfaktor RIR-Schätzung |
| Lauf: Critical Speed | 2 Zeitläufe, z. B. 3 min und 12 min max. (an 2 Tagen oder mit 30 min Pause) | alle 6–8 Wochen | Pace-Zonen, Schwellentempo, VO2max-Trend |
| Lauf: Talktest | Steigerungslauf, Pace notieren, an der man gerade noch ganze Sätze sprechen kann | Einstieg; alle 6–8 Wochen | Obergrenze „locker" |
| Rad indoor | 20-min-FTP-Test (FTP = 95 %), alternativ Rampentest; Talktest-Watt | Winter alle 6–8 Wochen | Watt-Zonen, Watt/Puls-Bezug |
| Rad outdoor | Talktest + optional feste Hausrunde mit Puls/RPE | Sommer alle 6–8 Wochen | Puls-/RPE-Zonen, Trendwert |
| Körpergewicht | Morgens, wöchentlich | wöchentlich (geglättet) | Trend |
| Optional: Ruhepuls | 60 s morgens im Liegen (manuell zählen oder von Uhr ablesen) | täglich oder gar nicht | Zusätzliches Readiness-Signal (F10) |

Tests werden automatisch eingeplant, in Deload-Wochen bzw. ausgeruhten Tagen, nie direkt nach harten Einheiten.

## 6. Feedback-Loops und Readiness

| Ebene | Eingabe (Zeit) | Wirkung |
|---|---|---|
| **Täglich** | 30-s-Check-in: Schlafdauer, Schlafqualität, Energie, Muskelkater (+ Ort), Stress, Motivation (1–5); Schmerz 0–10 pro Region; krank ja/nein (F1) | Ampel für heute (F2–F4); fehlende Uhr-Daten → Gewichte neu verteilt (nur Fragebogen + Schlaf + optional Ruhepuls) |
| **Pro Satz** | Wdh. + RIR | Stufe, Progression, Satz-Gültigkeit |
| **Pro Einheit** | Session-RPE, Spaß (1–5), Schmerz | Belastung, Übungsvorlieben (ungeliebte Übungen seltener), Schmerzregeln (F27) |
| **Wöchentlich** | Körpergewicht, verfügbare Zeit nächste Woche (optional, sonst gelernt) | Wochenplan, Volumen je Muskel, Laufumfang |
| **Block (4–8 Wochen)** | Tests, Zielfortschritt | Neuer Block, Deload, Schwerpunkt (F24) |

**Harte Stopps vor jeder Berechnung** (F5, F26): Krankheitssymptome, Warnsymptome (Brustdruck, Atemnot, Herzrasen mit Schwindel) → kein Training, Hinweis Arzt. Schmerz > 5/10 → Region entlasten.

**Ampel** (F4): Grün = Plan. Gelb = Volumen halten, Intensität deckeln oder Tag tauschen. Rot = Erholungs-/Mobility-Einheit oder 10-Minuten-Version.

**Deload** (F13–F15): geplant alle 5–7 Wochen (ab 40: 5–6), 40–50 % weniger Sätze, RIR +2, Ausdauer −40–50 %, keine Komplettpause. Vorgezogen bei ≥ 2 Warnsignalen in 7–10 Tagen; bei sehr gutem Verlauf bis 2 Wochen aufgeschoben (max. ~10 Wochen).

**Lernen pro Person** (F16, F20): Fortschritt zählt erst ab 1,5–2 × typischem Messfehler. Die App schätzt pro Person: Leistungsniveau je Übung, Erholungsdauer, typische Zeitnutzung, und wie stark die Readiness mit der Leistung zusammenhängt. Start mit Standardwerten, Anpassung schrittweise (bayesianisch, aber mit festen Leitplanken).

## 7. Flexible Zeit und automatische Wochenplanung

- **Wochenplanung:** Jeden Sonntag (oder bei Bedarf) schlägt die App eine Woche vor. Du kannst Tage antippen: „hab ich nicht", „nur 20 min", „hab 60 min".
- **Tagesmodus:** „Heute habe ich X Minuten" → die App baut die beste Einheit für genau diese Zeit, unter Berücksichtigung dessen, was in dieser Woche noch fehlt (Volumen je Muskel, Qualitätseinheit, Long Run).
- **Prioritäten bei wenig Zeit:** (1) Minimaldosis Kraft je Muskel, (2) eine Qualitätseinheit Ausdauer, (3) Long Run, (4) restliches Volumen. Supersätze und Ganzkörper-Einheiten bei kurzen Slots.
- **Automatisches Lernen:** Werden geplante Einheiten wiederholt ausgelassen oder verkürzt, passt die App die Standardwoche an die tatsächlich genutzte Zeit an, statt Rückstände aufzustauen. Verpasste Einheiten werden nicht nachgeholt, sondern umverteilt.

## 8. Planänderungen sichtbar machen

- Jede automatische Änderung erzeugt einen Eintrag: **Was** wurde geändert, **warum** (Klartext + Regel-ID), **wie sicher**.
  Beispiel: „Bulgarian Split Squat → Stufe 4 (Defizit). Grund: 3 × 30 Wdh. bei RIR 2 – zu leicht für Muskelaufbau (K6)."
- Knopf **„Rückgängig / anders"** bei jeder Änderung. Überschreibungen werden gespeichert und fließen ins Lernen ein (F21).
- Banner auf dem Heute-Bildschirm, wenn sich die heutige Einheit geändert hat. Wochenübersicht mit markierten Änderungen.

## 9. Bildschirme

1. **Heute:** Check-in → Ampel → Einheit (mit Änderungshinweisen) → Start
2. **Training-Player:** Übung mit Anleitung (Text + einfache Grafik/Video-Link), Satz-Logging (2 Taps), Pausentimer mit Ton/Vibration, Lauf-/Rad-Vorgabe mit Zielzone
3. **Nach der Einheit:** Session-RPE, Spaß, Schmerz
4. **Woche:** Plan, Zeitbudget pro Tag, Änderungen
5. **Fortschritt:** Kraft je Bewegungsmuster (Stufe + Wdh.), Volumen je Muskel, Lauf-Pace bei Talktest-Grenze, Critical Speed / VO2max-Trend, Gewicht, Readiness-Verlauf
6. **Änderungsprotokoll**
7. **Profil & Einstellungen:** Ziele, Equipment, Gesundheit, Export/Import

## 10. Meilensteine

| # | Inhalt | Ergebnis |
|---|---|---|
| ✅ M1 | Projekt-Setup, PWA-Grundgerüst, Profil + Onboarding (inkl. PAR-Q+, Ziele), lokale Datenbank, Export/Import | Installierbare App mit Profil |
| ✅ M2 | Übungskatalog + Variantenleitern, Kraft-Einstufungstest, Training-Player mit Satz-Logging, Satzregeln + doppelte Progression | Erstes nutzbares Krafttraining |
| ✅ M3 | Ausdauer: Erfassung, Feldtests (CS, Talktest), Zonen, Einzellauf-Regel | Lauf/Rad integriert |
| M4 | Täglicher Check-in, Ampel, Sicherheits-Stopps, Schmerzregeln | Tagesanpassung |
| M5 | Wochenplaner mit flexibler Zeit, Volumensteuerung, Deload, Änderungsprotokoll + Überschreiben | Volle Feedback-Loops |
| M6 | Fortschrittsdiagramme, Lernen pro Person, Plateau-Erkennung, Blockwechsel | Langfristige Personalisierung |
| später | Ernährung (siehe 11), quartalsweise Literatur-Updates | |

Jeder Meilenstein wird mit Unit-Tests für die Engine und einem Test auf dem iPhone abgeschlossen.

## 11. Später: Ernährung (kostenlos)

Foto-Erkennung per KI kostet API-Geld und ist pro Mahlzeit ungenau (~⅓ Unterschätzung). Kostenlose Optionen für später prüfen:
- Barcode-Scan mit der kostenlosen Open-Food-Facts-Datenbank (Kamera im Browser).
- „Schnellwahl" häufiger Mahlzeiten mit Portionsgröße (einmal anlegen, danach 1 Tap).
- Fokus auf **Protein-Check** und **Gewichtstrend** statt exakter Kalorien.

## 12. Literatur-Updates

Quartalsweise eine geplante Recherche (PubMed, Positionspapiere) → Update-Bericht mit „betrifft Regel K…/E…/F…". Regeln werden nur nach deiner Freigabe geändert (T12). Einrichtung nach M5.
