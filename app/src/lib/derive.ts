// Abgeleitete Werte aus dem Profil. Reine Funktionen, ohne UI – testbar.
import type { ParqKey, Profile } from './types';

export function ageOn(birthYear: number, date = new Date()): number {
  return date.getFullYear() - birthYear;
}

/**
 * HFmax: gemessener Wert schlägt Formel. Formel nach Tanaka (208 − 0,7 × Alter),
 * Unsicherheit ±10 Schläge. Nie 220 − Alter (E3).
 */
export function maxHr(p: Pick<Profile, 'birthYear' | 'endurance'>, date = new Date()):
  { value: number; source: 'measured' | 'tanaka'; uncertainty: number } {
  if (p.endurance.maxHrMeasured && p.endurance.maxHrMeasured > 100) {
    return { value: p.endurance.maxHrMeasured, source: 'measured', uncertainty: 0 };
  }
  return { value: Math.round(208 - 0.7 * ageOn(p.birthYear, date)), source: 'tanaka', uncertainty: 10 };
}

export type Clearance =
  | { status: 'clear' }
  | { status: 'regional'; reason: string }
  | { status: 'restricted'; reasons: ParqKey[] }
  | { status: 'cleared'; reasons: ParqKey[]; at: string };

/** Fragen, deren „Ja" intensive Einheiten global sperrt (F25). */
const GLOBAL_KEYS: ParqKey[] = [
  'heartCondition', 'chestPain', 'dizziness', 'chronicCondition', 'medication', 'supervision'
];

/**
 * PAR-Q+-Auswertung (F25). Regel-Vereinfachung (Evidenz D):
 * - Jedes „Ja" außer Knochen/Gelenke → intensive Einheiten (HIIT, Ausbelastungstests) gesperrt,
 *   bis eine ärztliche Freigabe eingetragen ist.
 * - Nur Knochen/Gelenke → keine globale Sperre, aber betroffene Regionen werden geschont.
 */
export function clearance(p: Pick<Profile, 'health'>): Clearance {
  const reasons = GLOBAL_KEYS.filter((k) => p.health.parq[k]);
  if (reasons.length > 0) {
    if (p.health.medicalClearanceAt) {
      return { status: 'cleared', reasons, at: p.health.medicalClearanceAt };
    }
    return { status: 'restricted', reasons };
  }
  if (p.health.parq.boneJoint) {
    return { status: 'regional', reason: 'Knochen-/Gelenkproblem: betroffene Regionen werden geschont.' };
  }
  return { status: 'clear' };
}

export function intenseAllowed(p: Pick<Profile, 'health'>): boolean {
  const c = clearance(p);
  return c.status !== 'restricted';
}

/** Re-Screening jährlich (F25) */
export function rescreenDue(p: Pick<Profile, 'health'>, now = new Date()): boolean {
  const last = new Date(p.health.screenedAt).getTime();
  return now.getTime() - last > 365 * 24 * 3600 * 1000;
}

/** Ab 40 / ab 60 gelten angepasste Erholungsregeln (F30). */
export function ageGroup(birthYear: number, date = new Date()): 'under40' | '40plus' | '60plus' {
  const a = ageOn(birthYear, date);
  if (a >= 60) return '60plus';
  if (a >= 40) return '40plus';
  return 'under40';
}

/** Planbarer Deload-Rhythmus in Wochen (F13, F30). */
export function deloadEveryWeeks(birthYear: number, date = new Date()): [number, number] {
  const g = ageGroup(birthYear, date);
  if (g === '60plus') return [4, 5];
  if (g === '40plus') return [5, 6];
  return [5, 7];
}

/** Grobe Wochenzeit aus Verfügbarkeit, für Anzeige und spätere Planung. */
export function weeklyMinutes(p: Pick<Profile, 'availability'>): number {
  return p.availability.days.length * p.availability.typicalMinutes;
}

export function validateProfile(p: Profile): string[] {
  const errors: string[] = [];
  const year = new Date().getFullYear();
  if (!p.name.trim()) errors.push('Name fehlt.');
  if (p.birthYear < year - 100 || p.birthYear > year - 12) errors.push('Geburtsjahr unplausibel.');
  if (p.heightCm < 120 || p.heightCm > 230) errors.push('Größe unplausibel (120–230 cm).');
  if (p.weightKg < 30 || p.weightKg > 250) errors.push('Gewicht unplausibel (30–250 kg).');
  if (p.endurance.restingHr !== undefined && (p.endurance.restingHr < 30 || p.endurance.restingHr > 110)) {
    errors.push('Ruhepuls unplausibel (30–110).');
  }
  if (p.endurance.maxHrMeasured !== undefined && (p.endurance.maxHrMeasured < 120 || p.endurance.maxHrMeasured > 230)) {
    errors.push('Maximalpuls unplausibel (120–230).');
  }
  if (p.availability.days.length === 0) errors.push('Mindestens einen Trainingstag wählen.');
  if (p.goals.areas.length === 0) errors.push('Mindestens ein Ziel wählen.');
  return errors;
}

/** Deutsche Zahlenformatierung, z. B. 2,7 */
export function fmt(n: number, digits = 1): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: digits });
}
