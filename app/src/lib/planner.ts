// Wochenplaner: verteilt Kraft und Ausdauer auf die verfügbare Zeit, plant Entlastungswochen,
// lernt die tatsächlich genutzte Zeit. Reine Funktionen – testbar.
// Regeln: K1/K4 (Krafthäufigkeit), E1/E17/E18/E20/E22 (Ausdauer), F13–F15/F24 (Deload/Blöcke)
import { deloadEveryWeeks } from './derive';
import { todayKey } from './readiness';
import type {
  CheckIn, DayPlan, EnduranceSession, EnduranceType, PlannedItem, Profile, Sport, StrengthSession, Weekday
} from './types';
import type { Light } from './readiness';

const DAY = 86400000;

// ---------- Datum ----------

export function parseDay(d: string): Date {
  return new Date(`${d}T12:00:00`);
}
export function addDays(d: string, n: number): string {
  const x = parseDay(d);
  x.setDate(x.getDate() + n);
  return todayKey(x);
}
/** Montag der Woche (lokal) */
export function mondayOf(d: string): string {
  const x = parseDay(d);
  const wd = (x.getDay() + 6) % 7; // 0 = Montag
  return addDays(d, -wd);
}
export function weekdayOf(d: string): Weekday {
  return ((parseDay(d).getDay() + 6) % 7) as Weekday;
}
export function weeksBetween(a: string, b: string): number {
  return Math.floor((parseDay(b).getTime() - parseDay(a).getTime()) / (7 * DAY));
}

// ---------- Verfügbarkeit ----------

/** Standardwoche aus dem Profil, ggf. durch Gelerntes ersetzt. */
export function defaultAvailability(p: Profile, learned?: number[] | null): number[] {
  if (learned && learned.length === 7) return [...learned];
  return [0, 1, 2, 3, 4, 5, 6].map((d) => (p.availability.days.includes(d as Weekday) ? p.availability.typicalMinutes : 0));
}

// ---------- Planung ----------

export interface PlanOptions {
  weekStart: string;
  deload: boolean;
  /** Tage vor diesem Datum werden nicht neu geplant */
  fromDate?: string;
  /** bestehende Einträge (vergangene Tage, vom Nutzer bearbeitete) bleiben */
  keep?: DayPlan[];
}

export function enabledSports(p: Profile): Sport[] {
  const out: Sport[] = [];
  if (p.endurance.runOutdoor) out.push('run');
  if (p.endurance.bikeOutdoor) out.push('bikeOutdoor');
  if (p.endurance.bikeIndoor) out.push('bikeIndoor');
  return out;
}

/** Winter (Nov–März): Rad auf der Rolle, sonst draußen (Saisonlogik aus PLAN.md 4.2). */
export function bikeForSeason(p: Profile, date: string): Sport | null {
  const m = parseDay(date).getMonth() + 1;
  const winter = m >= 11 || m <= 3;
  if (winter && p.endurance.bikeIndoor) return 'bikeIndoor';
  if (p.endurance.bikeOutdoor) return 'bikeOutdoor';
  if (p.endurance.bikeIndoor) return 'bikeIndoor';
  return null;
}

export function strengthTarget(p: Profile, availableDays: number): number {
  const f = p.goals.focus;
  let n = f <= 40 ? 3 : f < 60 ? (availableDays >= 5 ? 3 : 2) : 2;
  if (f >= 90) n = 1;
  if (f <= 10) n = Math.min(4, availableDays);
  return Math.max(0, Math.min(n, availableDays));
}

/**
 * Wählt k Tage aus den verfügbaren mit möglichst großem Abstand (≥ 48 h zwischen Ganzkörpereinheiten).
 * `bonus` bewertet eine Auswahl zusätzlich (z. B. „ein Tag für Intervalle bleibt frei").
 */
export function spreadDays(days: number[], k: number, bonus?: (picked: number[]) => number): number[] {
  if (k <= 0) return [];
  if (k >= days.length) return [...days];
  let best: number[] = [];
  let bestScore = -1;
  const combos = (start: number, picked: number[]) => {
    if (picked.length === k) {
      // Abstand inkl. Wochenumbruch
      let minGap = 7;
      for (let i = 0; i < k; i++) {
        const a = picked[i]!;
        const b = i + 1 < k ? picked[i + 1]! : picked[0]! + 7;
        minGap = Math.min(minGap, b - a);
      }
      const score = minGap * 10 + (bonus?.(picked) ?? 0) - picked.reduce((t, x) => t + x, 0) * 0.01;
      if (score > bestScore) { bestScore = score; best = [...picked]; }
      return;
    }
    for (let i = start; i < days.length; i++) combos(i + 1, [...picked, days[i]!]);
  };
  combos(0, []);
  return best;
}

let idc = 0;
const nid = () => `i${Date.now().toString(36)}${(idc++).toString(36)}`;

/**
 * Plant eine Woche. Prioritäten bei wenig Zeit (PLAN.md §7):
 * (1) Kraft-Minimaldosis, (2) eine Qualitätseinheit Ausdauer, (3) lange Einheit, (4) Rest locker.
 */
export function planWeek(p: Profile, avail: number[], o: PlanOptions): { days: DayPlan[]; why: string[] } {
  const why: string[] = [];
  const dates = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(o.weekStart, i));
  const from = o.fromDate ?? o.weekStart;
  const keepMap = new Map((o.keep ?? []).map((d) => [d.date, d]));

  const days: DayPlan[] = dates.map((date, i) => {
    const kept = keepMap.get(date);
    const fixed = date < from ? kept?.items ?? [] : kept?.items.filter((x) => x.userEdited) ?? [];
    return { date, availableMin: avail[i] ?? 0, items: fixed };
  });

  // bereits feststehende Einheiten zählen mit
  const fixedStrength = days.reduce((t, d) => t + d.items.filter((x) => x.kind === 'strength').length, 0);
  const fixedEndurance = days.flatMap((d) => d.items.filter((x) => x.kind === 'endurance'));
  const free = days.map((d, i) => ({ d, i })).filter(({ d }) => d.date >= from && d.items.length === 0 && d.availableMin >= 15);
  const freeIdx = free.map((x) => x.i);
  const sports = enabledSports(p);

  const totalDays = days.filter((d) => d.availableMin >= 15).length;
  let sTarget = Math.max(0, strengthTarget(p, totalDays) - fixedStrength);
  if (sports.length === 0) sTarget = Math.min(freeIdx.length, Math.max(sTarget, 3));
  sTarget = Math.min(sTarget, freeIdx.length);
  const eCount = sports.length ? freeIdx.length - sTarget : 0;

  // ---- Kraft-Tage gleichmäßig verteilen ----
  // Lange Tage bevorzugt für Ausdauer (lange Einheit), daher den längsten Tag für Kraft meiden, wenn genug Tage
  const byLength = [...freeIdx].sort((a, b) => (days[b]!.availableMin - days[a]!.availableMin) || (b - a));
  const longDay = eCount >= 2 ? byLength[0] : undefined;
  const strengthPool = freeIdx.filter((i) => i !== longDay || freeIdx.length <= sTarget);
  // Bonus, wenn ein Ausdauertag übrig bleibt, der nicht direkt auf Kraft folgt (Platz für Intervalle, E18)
  const hardFree = (picked: number[]) =>
    freeIdx.some((i) => !picked.includes(i) && !picked.includes(i - 1) && (longDay === undefined || Math.abs(i - longDay) > 1));
  let sDays = spreadDays(strengthPool, sTarget, (picked) => (hardFree(picked) ? 5 : 0));
  // Zwei Ganzkörper-Krafttage direkt hintereinander vermeiden: lieber eine Einheit weniger (≥ 2 bleiben)
  if (sDays.length > 2 && minGap(sDays) < 2) {
    sTarget--;
    sDays = spreadDays(strengthPool, sTarget, (picked) => (hardFree(picked) ? 5 : 0));
    why.push('Eine Krafteinheit weniger, damit zwischen zwei Ganzkörpereinheiten mindestens ein Tag Pause liegt.');
  }
  // Verfügbare Zeit ist eine Obergrenze, kein Muss: Einheiten bewusst unterschiedlich lang (F23)
  let varied = 0;
  let shortened = false;
  for (const i of sDays) {
    const full = clampMin(days[i]!.availableMin, 20, 60);
    const minutes = varyMinutes(full, o.weekStart, varied++, 'strength');
    if (minutes < full) shortened = true;
    days[i]!.items.push({ id: nid(), kind: 'strength', minutes });
  }

  // ---- Ausdauer ----
  const eDays = sports.length ? freeIdx.filter((i) => !sDays.includes(i)) : [];
  why.unshift(`${totalDays} Tage mit Zeit: ${sDays.length + fixedStrength}× Kraft (jeder Muskel mind. 2× pro Woche, K4) und ${eDays.length + fixedEndurance.length}× Ausdauer.`);
  if (sports.length && eDays.length) {
    const types = enduranceTypes(eDays.length, o.deload);
    // lange Einheit auf den längsten Ausdauertag
    const order = [...eDays].sort((a, b) => days[b]!.availableMin - days[a]!.availableMin);
    const assigned = new Map<number, EnduranceType>();
    if (types.includes('long') && order[0] !== undefined && days[order[0]]!.availableMin >= 60) {
      assigned.set(order[0], 'long');
    }
    // harte Einheiten: nicht am Tag nach Kraft (Beine, E18), nicht neben der langen oder einer anderen harten Einheit
    const hard: EnduranceType[] = types.filter((t) => t === 'intervals' || t === 'tempo');
    for (const t of hard) {
      const cand = eDays
        .filter((i) => !assigned.has(i))
        .map((i) => ({ i, score: hardScore(i, days, assigned, sDays) }))
        .sort((a, b) => b.score - a.score)[0];
      if (cand && cand.score > 0) assigned.set(cand.i, t);
    }
    for (const i of eDays) {
      const type = assigned.get(i) ?? 'easy';
      const sport = pickSport(p, days[i]!.date, type, i);
      const max = type === 'long' ? 150 : type === 'easy' ? 75 : 70;
      let minutes = clampMin(days[i]!.availableMin, 20, max);
      if (type !== 'long') {
        const v = varyMinutes(minutes, o.weekStart, varied++, type);
        if (v < minutes) shortened = true;
        minutes = v;
      }
      if (o.deload) minutes = Math.max(20, Math.round((minutes * 0.6) / 5) * 5);
      days[i]!.items.push({ id: nid(), kind: 'endurance', sport, type, minutes });
    }
  }

  // ---- Doppeleinheiten, falls WHO-Minuten fehlen (E20) ----
  if (p.availability.allowDoubleSessions && sports.length) {
    const endMin = days.flatMap((d) => d.items).filter((x) => x.kind === 'endurance').reduce((t, x) => t + x.minutes, 0);
    if (endMin < 150) {
      for (const i of sDays) {
        const d = days[i]!;
        if (d.availableMin >= 75) {
          d.items[0]!.minutes = Math.min(d.items[0]!.minutes, 45);
          d.items.push({ id: nid(), kind: 'endurance', sport: pickSport(p, d.date, 'easy', i), type: 'easy', minutes: clampMin(d.availableMin - 45, 20, 45) });
        }
      }
      why.push('Doppeleinheiten an langen Krafttagen, um auf 150 Ausdauerminuten zu kommen (WHO).');
    }
  }

  if (shortened) {
    why.push('Einheiten sind bewusst unterschiedlich lang – deine Zeitangabe ist eine Obergrenze, kein Muss. Kürzere Tage entlasten, längere bringen Reiz.');
  }
  if (o.deload) {
    why.push('Entlastungswoche: Krafttraining mit etwa halb so vielen Sätzen und 3 Wdh. Reserve, Ausdauer 40 % kürzer und nur locker (F13).');
  } else if (eDays.length >= 3) {
    why.push('Pyramidale Verteilung: eine Intervall-, eine Tempo-, eine lange Einheit, der Rest locker (E1, E22).');
  }
  return { days, why };
}

function minGap(days: number[]): number {
  let g = 7;
  for (let i = 0; i + 1 < days.length; i++) g = Math.min(g, days[i + 1]! - days[i]!);
  return g;
}

/**
 * Variiert die Dauer einer Einheit innerhalb der verfügbaren Zeit (deterministisch je Woche,
 * damit Neuplanen stabil bleibt). Etwa jede dritte Einheit nutzt die volle Zeit.
 */
const VARY: Record<string, number[]> = {
  strength: [1, 0.85, 0.75, 1, 0.9, 0.8],
  easy: [0.85, 1, 0.75, 0.9, 1, 0.8],
  recovery: [0.75, 0.85],
  intervals: [1, 0.9, 0.85],
  tempo: [0.9, 1, 0.85],
  test: [1]
};
export function varyMinutes(full: number, weekStart: string, k: number, kind: string): number {
  const f = VARY[kind] ?? [1];
  let h = 0;
  for (const ch of weekStart) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const factor = f[(h + k * 2) % f.length]!;
  const m = Math.round((full * factor) / 5) * 5;
  return Math.max(Math.min(full, 20), Math.min(full, m));
}

function clampMin(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.round(v / 5) * 5));
}

export function enduranceTypes(n: number, deload: boolean): EnduranceType[] {
  if (deload) return Array.from({ length: n }, () => 'easy' as EnduranceType);
  if (n <= 0) return [];
  if (n === 1) return ['intervals'];
  if (n === 2) return ['intervals', 'long'];
  return ['intervals', 'tempo', 'long', ...Array.from({ length: n - 3 }, () => 'easy' as EnduranceType)];
}

function hardScore(i: number, days: DayPlan[], assigned: Map<number, EnduranceType>, sDays: number[]): number {
  let s = 10;
  if (sDays.includes(i - 1)) s -= 6; // Tag nach Kraft (Beine) → schlecht (E18)
  if (sDays.includes(i)) s -= 10;
  for (const [j, t] of assigned) {
    if (Math.abs(j - i) <= 1 && t !== 'easy') s -= 8; // 48 h zwischen harten Einheiten
  }
  if (days[i]!.availableMin < 30) s -= 8;
  return s;
}

function pickSport(p: Profile, date: string, type: EnduranceType, i: number): Sport {
  const run = p.endurance.runOutdoor;
  const bike = bikeForSeason(p, date);
  const wantsRun = p.goals.areas.includes('running');
  const wantsBike = p.goals.areas.includes('cycling');
  if (!run && bike) return bike;
  if (!bike) return 'run';
  // Intervalle im Winter auf der Rolle mit Watt sind präzise steuerbar
  if (type === 'intervals' && bike === 'bikeIndoor' && p.endurance.bikeIndoorPower && !wantsRun) return 'bikeIndoor';
  if (wantsRun && !wantsBike) return type === 'easy' && i % 3 === 2 ? bike : 'run';
  if (wantsBike && !wantsRun) return type === 'long' || type === 'intervals' ? bike : i % 2 ? 'run' : bike;
  // beides/keins: abwechseln, Muskelaufbau-Fokus → mehr Rad (E19)
  if (p.goals.focus <= 40 && type === 'easy') return bike;
  return i % 2 ? bike : 'run';
}

// ---------- Deload & Blöcke (F13–F15, F24) ----------

export interface FatigueInput {
  lights: Light[]; // letzte 7 Tage
  strength: StrengthSession[]; // letzte 10 Tage
  endurance: EnduranceSession[]; // letzte 10 Tage
  checkins: CheckIn[]; // letzte 10 Tage
}

/** Ermüdungssignale der letzten 7–10 Tage (F14). */
export function fatigueSignals(x: FatigueInput): string[] {
  const out: string[] = [];
  const bad = x.lights.filter((l) => l !== 'green').length;
  if (bad >= 4) out.push(`${bad} von 7 Tagen mit gelber/roter Tagesform.`);
  const rpe = [...x.strength.map((s) => s.sRpe).filter((v): v is number => v !== undefined), ...x.endurance.map((s) => s.sRpe)];
  if (rpe.length >= 3 && rpe.reduce((a, b) => a + b, 0) / rpe.length >= 7.5) out.push('Einheiten fühlen sich im Schnitt sehr schwer an (Anstrengung ≥ 7,5).');
  const easyHard = x.endurance.filter((s) => ['easy', 'long', 'recovery'].includes(s.type) && s.sRpe >= 5).length;
  if (easyHard >= 2) out.push('Lockere Einheiten fühlen sich ungewöhnlich hart an.');
  const sore = x.checkins.filter((c) => c.soreness >= 4).length;
  if (sore >= 4) out.push('An vielen Tagen starker Muskelkater.');
  const pain = x.checkins.filter((c) => c.pain.some((p) => p.score > 3)).length;
  if (pain >= 4) out.push('Häufig Schmerzen über 3/10.');
  return out;
}

export interface DeloadDecision {
  deload: boolean;
  reason: string;
}

/**
 * Geplant alle 5–7 Wochen (Alter: F30), vorgezogen bei ≥ 2 Ermüdungssignalen,
 * aufgeschoben (max. 2 Wochen, Limit 10) bei sehr guter Tagesform.
 */
export function deloadDecision(p: Profile, blockWeek: number, signals: string[], greenRatio: number, now = new Date()): DeloadDecision {
  const [lo, hi] = deloadEveryWeeks(p.birthYear, now);
  if (blockWeek >= 10) return { deload: true, reason: 'Spätestens nach 10 Wochen ist eine Entlastungswoche fällig.' };
  if (signals.length >= 2 && blockWeek >= 3) {
    return { deload: true, reason: `Entlastung vorgezogen – mehrere Ermüdungszeichen: ${signals.join(' ')}` };
  }
  if (blockWeek >= lo) {
    if (greenRatio >= 0.8 && blockWeek < hi + 2 && signals.length === 0) {
      return { deload: false, reason: `Woche ${blockWeek} im Block: Tagesform sehr gut – Entlastung aufgeschoben (F15).` };
    }
    return { deload: true, reason: `Woche ${blockWeek} im Block: geplante Entlastungswoche (alle ${lo}–${hi} Wochen).` };
  }
  return { deload: false, reason: '' };
}

// ---------- Status & Zeit-Lernen ----------

export type ItemStatus = 'done' | 'missed' | 'today' | 'planned';

export function itemStatus(item: PlannedItem, date: string, today: string,
  strength: StrengthSession[], endurance: EnduranceSession[], items: PlannedItem[]): ItemStatus {
  const sameKind = items.filter((x) => x.kind === item.kind);
  const idx = sameKind.indexOf(item);
  const doneCount = item.kind === 'strength'
    ? strength.filter((s) => s.status === 'done' && s.kind === 'strength' && todayKey(new Date(s.startedAt)) === date).length
    : endurance.filter((s) => todayKey(new Date(s.date)) === date).length;
  if (doneCount > idx) return 'done';
  if (date < today) return 'missed';
  if (date === today) return 'today';
  return 'planned';
}

export interface WeekRecord {
  /** pro Wochentag: geplante Minuten (0 = nichts geplant) und tatsächlich trainierte Minuten */
  planned: number[];
  done: number[];
}

/**
 * Lernt aus den letzten (≥ 3) Wochen die tatsächlich genutzte Zeit je Wochentag.
 * Ein Tag, an dem 3 von 4 Wochen nichts passiert ist, wird frei; deutlich kürzere Einheiten senken die Standarddauer.
 */
export function learnAvailability(base: number[], weeks: WeekRecord[]): { avail: number[]; changes: string[] } | null {
  if (weeks.length < 3) return null;
  const recent = weeks.slice(-4);
  const avail = [...base];
  const changes: string[] = [];
  const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  for (let d = 0; d < 7; d++) {
    const planned = recent.filter((w) => (w.planned[d] ?? 0) > 0);
    if (planned.length < 3) continue;
    const missed = planned.filter((w) => (w.done[d] ?? 0) === 0).length;
    if (missed >= Math.ceil(planned.length * 0.75)) {
      if (avail[d]! > 0) changes.push(`${names[d]}: meist ausgefallen → frei (${avail[d]} → 0 min)`);
      avail[d] = 0;
      continue;
    }
    const ratios = planned.filter((w) => (w.done[d] ?? 0) > 0).map((w) => w.done[d]! / w.planned[d]!);
    if (ratios.length >= 3) {
      const r = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      if (r < 0.8) {
        const next = Math.max(20, Math.round((avail[d]! * r) / 5) * 5);
        if (next < avail[d]!) {
          changes.push(`${names[d]}: Einheiten meist kürzer → ${avail[d]} → ${next} min`);
          avail[d] = next;
        }
      }
    }
  }
  return changes.length ? { avail, changes } : null;
}

export function weekMinutes(days: DayPlan[]): { strength: number; endurance: number } {
  const items = days.flatMap((d) => d.items);
  return {
    strength: items.filter((x) => x.kind === 'strength').reduce((t, x) => t + x.minutes, 0),
    endurance: items.filter((x) => x.kind === 'endurance').reduce((t, x) => t + x.minutes, 0)
  };
}
