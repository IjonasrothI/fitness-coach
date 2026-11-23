// Tagesform (Readiness) aus dem täglichen Check-in. Reine Funktionen – testbar.
// Regeln F1–F5, F10–F12, F26–F28 in reports/Evidenzbasis Fitness Coach App.md
// Gewichte und Schwellen sind Heuristik (Evidenz D) – bewusst transparent gehalten.
import type { BodyRegion, CheckIn, Profile, WarningSymptom } from './types';

export type Light = 'green' | 'yellow' | 'red';

export const WARNING_LABELS: Record<WarningSymptom, string> = {
  chestPain: 'Druck oder Schmerz in der Brust',
  breathless: 'Unerklärliche Atemnot',
  palpitations: 'Herzrasen/Herzstolpern mit Schwindel',
  fainting: 'Ohnmacht oder Beinahe-Ohnmacht'
};

export const LEG_REGIONS: BodyRegion[] = ['hip', 'knee', 'ankle', 'achilles', 'foot'];

export interface Caps {
  /** kein Training (krank, Warnzeichen) */
  noTraining: boolean;
  /** Training gesperrt – auch nicht übersteuerbar (Warnzeichen) */
  hardStop: boolean;
  /** keine Intervalle/Tempo, keine Sätze bis zum Versagen */
  noIntensity: boolean;
  /** nur leichte Erholungseinheit */
  recoveryOnly: boolean;
  /** Regionen mit Schmerz > 5 heute schonen */
  painRegions: BodyRegion[];
  /** Mindest-Reserve in Kraftsätzen */
  minRir: number;
}

export interface Readiness {
  score: number;
  light: Light;
  components: { wellness: number; sleep: number; rhr: number | null };
  reasons: string[];
  caps: Caps;
  overridden: boolean;
}

const clamp = (v: number, lim = 2) => Math.max(-lim, Math.min(lim, v));
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1));
};

/** Ab 14 Einträgen persönlicher z-Wert gegen 28-Tage-Mittel, davor absolute Skala (F2). */
function itemScore(value: number, hist: number[], invert: boolean): number {
  let z: number;
  if (hist.length >= 14) {
    const s = sd(hist);
    z = s < 0.3 ? (value - mean(hist)) / 0.5 : (value - mean(hist)) / s;
  } else {
    z = value - 3; // 1–5-Skala, 3 = normal
  }
  return clamp(invert ? -z : z);
}

export function readiness(today: CheckIn, history: CheckIn[], p: Profile): Readiness {
  const hist = history
    .filter((h) => h.date < today.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 28);
  const reasons: string[] = [];

  // ---- Wohlbefinden (Hauptsignal, Saw 2016) ----
  const items: [keyof CheckIn, boolean][] = [
    ['sleepQ', false], ['energy', false], ['soreness', true], ['stress', true], ['motivation', false]
  ];
  const wellness = mean(items.map(([k, inv]) =>
    itemScore(today[k] as number, hist.map((h) => h[k] as number), inv)));

  // ---- Schlaf: nur Dauer (F11) ----
  const sleepHist = hist.map((h) => h.sleepH);
  const sleepMean = sleepHist.length >= 7 ? mean(sleepHist) : 7.5;
  const sleep = clamp((today.sleepH - sleepMean) / 1);

  // ---- Ruhepuls (F10) ----
  let rhr: number | null = null;
  const rhrHist = hist.map((h) => h.restingHr).filter((x): x is number => !!x);
  const rhrBase = rhrHist.length >= 7 ? mean(rhrHist) : p.endurance.restingHr;
  if (today.restingHr && rhrBase) rhr = clamp(-(today.restingHr - rhrBase) / 4);

  // ---- Gewichtung (F3, HRV fehlt → neu verteilt) ----
  const parts: [number, number][] = [[wellness, 0.5], [sleep, 0.15]];
  if (rhr !== null) parts.push([rhr, 0.15]);
  const wsum = parts.reduce((t, [, w]) => t + w, 0);
  const score = Math.round((parts.reduce((t, [v, w]) => t + v * w, 0) / wsum) * 100) / 100;

  let light: Light = score >= -0.5 ? 'green' : score >= -1.25 ? 'yellow' : 'red';
  if (light !== 'green') reasons.push(light === 'yellow' ? 'Tagesform etwas unter deinem Normalwert.' : 'Tagesform deutlich unter deinem Normalwert.');
  if (wellness <= -1) reasons.push('Wohlbefinden (Energie, Muskelkater, Stress, Motivation) klar schlechter als sonst.');

  const caps: Caps = {
    noTraining: false, hardStop: false, noIntensity: false, recoveryOnly: false,
    painRegions: [], minRir: 1
  };

  // ---- Schlaf-Deckel (F12) ----
  if (today.sleepH < 6 || (sleepHist.length >= 7 && today.sleepH < sleepMean - 1.5)) {
    caps.noIntensity = true;
    reasons.push(`Nur ${today.sleepH} h Schlaf – heute keine harten Intervalle, Training aber möglich.`);
  }

  // ---- Ruhepuls zwei Tage erhöht + schlechtes Befinden (F10) ----
  const yesterday = hist[0];
  if (today.restingHr && rhrBase && today.restingHr >= rhrBase + 5 &&
    yesterday?.restingHr && yesterday.restingHr >= rhrBase + 5 && wellness < -0.5) {
    caps.noIntensity = true;
    reasons.push(`Ruhepuls seit 2 Tagen erhöht (${today.restingHr} statt ~${Math.round(rhrBase)}) und Befinden schlechter – möglicher Infekt. Keine Intensität, auf Krankheitszeichen achten.`);
  }

  // ---- Schmerz (F5, F27) ----
  const strong = today.pain.filter((x) => x.score > 5);
  if (strong.length) {
    caps.painRegions = strong.map((x) => x.region);
    reasons.push('Schmerz über 5/10 – betroffene Region wird heute geschont.');
  }

  // ---- Gelb/Rot wirken auf die Planung (F4) ----
  if (light === 'yellow') {
    caps.noIntensity = true;
    caps.minRir = 2;
  }
  if (light === 'red') {
    caps.noIntensity = true;
    caps.recoveryOnly = true;
    caps.minRir = 3;
  }
  if (caps.noIntensity) caps.minRir = Math.max(caps.minRir, 2);

  // ---- Übersteuern (F21) – gilt nicht für Krankheit/Warnzeichen ----
  const overridden = !!today.override && light !== 'green';
  if (overridden) {
    light = 'green';
    caps.noIntensity = false;
    caps.recoveryOnly = false;
    caps.minRir = 1;
    reasons.push('Von dir übersteuert: du fühlst dich trotzdem fit. Die App plant normal und lernt daraus.');
  }

  // ---- Harte Overrides vor allem anderen (F5, F26) ----
  if (today.sick) {
    light = 'red';
    caps.noTraining = true;
    caps.noIntensity = true;
    caps.recoveryOnly = true;
    caps.minRir = 3;
    reasons.unshift('Krankheitszeichen: heute kein Training. Erst wieder einsteigen, wenn du 24 h symptomfrei bist.');
  }
  if (today.warning.length) {
    light = 'red';
    caps.noTraining = true;
    caps.hardStop = true;
    caps.noIntensity = true;
    caps.recoveryOnly = true;
    reasons.unshift(`Warnzeichen (${today.warning.map((w) => WARNING_LABELS[w]).join(', ')}): kein Training. Bitte zeitnah ärztlich abklären lassen – bei akuten Brustschmerzen oder Atemnot den Notruf 112 wählen.`);
  }

  return { score, light, components: { wellness, sleep, rhr }, reasons, caps, overridden };
}

/** Schmerzverlauf einer Region (F27). */
export function painAdvice(checkins: CheckIn[], region: BodyRegion, today: string): string | null {
  const last14 = checkins.filter((c) => c.date <= today && daysBetween(c.date, today) < 14)
    .sort((a, b) => a.date.localeCompare(b.date));
  const vals = last14.map((c) => c.pain.find((x) => x.region === region)?.score ?? 0);
  const days = vals.filter((v) => v > 2).length;
  if (days >= 10) {
    const firstHalf = mean(vals.slice(0, Math.ceil(vals.length / 2)));
    const secondHalf = mean(vals.slice(Math.ceil(vals.length / 2)));
    if (secondHalf >= firstHalf) {
      return 'Seit zwei Wochen fast täglich Beschwerden ohne Besserung – bitte physiotherapeutisch oder ärztlich abklären lassen.';
    }
  }
  return null;
}

/** Zyklus (F28): Hinweis bei ausbleibender Periode > 90 Tage, wenn vorher erfasst. */
export function amenorrheaHint(checkins: CheckIn[], today: string): string | null {
  const periods = checkins.filter((c) => c.period).map((c) => c.date).sort();
  const last = periods[periods.length - 1];
  if (!last) return null;
  return daysBetween(last, today) > 90
    ? 'Seit über 3 Monaten keine Periode erfasst. Das kann mit zu wenig Energiezufuhr bei viel Training zusammenhängen (RED-S) – bitte gynäkologisch abklären lassen.'
    : null;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 86400000);
}

export function todayKey(d = new Date()): string {
  // lokales Datum, nicht UTC
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const LIGHT_LABELS: Record<Light, string> = {
  green: 'Grün – Training wie geplant',
  yellow: 'Gelb – Umfang halten, Intensität runter',
  red: 'Rot – Erholung'
};
