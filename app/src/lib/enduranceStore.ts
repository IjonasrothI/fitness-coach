// Ausdauer: Speichern, Auswerten beim Eintragen, Feldtests.
import { db, plain, saveProfile, type CoachDB } from './db';
import {
  checkRunDistance, driftPct, longestRun, newMaxHr, tooHardForEasy, weeklyIncreaseHint
} from './endurance';
import type { EnduranceSession, EnduranceTest, Profile } from './types';

export async function listEndurance(pid: string, d: CoachDB = db): Promise<EnduranceSession[]> {
  const all = await d.endurance.where('profileId').equals(pid).toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function listTests(pid: string, d: CoachDB = db): Promise<EnduranceTest[]> {
  const all = await d.tests.where('profileId').equals(pid).toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export interface Note { kind: 'info' | 'warn' | 'good'; text: string; rule?: string }

/** Hinweise beim Eintragen – vor dem Speichern berechnet, damit die Referenz den neuen Lauf nicht enthält. */
export function evaluate(p: Profile, s: EnduranceSession, history: EnduranceSession[], tests: EnduranceTest[]): Note[] {
  const notes: Note[] = [];
  if (s.sport === 'run' && s.distanceKm) {
    const before = history.filter((h) => h.id !== s.id && new Date(h.date) < new Date(s.date));
    const ref = longestRun(before, p, new Date(s.date)).km;
    const c = checkRunDistance(s.distanceKm, ref);
    if (c.level !== 'ok') notes.push({ kind: 'warn', text: c.text, rule: 'E14' });
    const inc = weeklyIncreaseHint([...before, s], new Date(s.date));
    if (inc) notes.push({ kind: 'info', text: inc, rule: 'E15' });
  }
  const hard = tooHardForEasy(s, p, tests);
  if (hard) notes.push({ kind: 'warn', text: `${hard} Lockere Einheiten bitte wirklich locker – sonst fehlt die Erholung für die harten Tage.`, rule: 'E1' });
  const drift = driftPct(s);
  if (drift !== null && drift > 5) {
    notes.push({
      kind: 'info', rule: 'E9',
      text: s.sport === 'bikeIndoor'
        ? `Puls-Drift ${Math.round(drift)} %: auf der Rolle meist Wärme (kein Fahrtwind) – kein Zeichen schlechter Form. Fenster auf oder Ventilator hilft.`
        : `Puls-Drift ${Math.round(drift)} %. Sinkt dieser Wert über die Wochen, wird deine Grundlage besser.`
    });
  }
  const hm = newMaxHr(p, s);
  if (hm) notes.push({ kind: 'good', text: `Neuer höchster Puls: ${hm}. Ab jetzt rechnet die App mit diesem gemessenen Wert statt der Formel.`, rule: 'E3' });
  if (s.pain?.some((x) => x.score > 5)) {
    notes.push({ kind: 'warn', rule: 'F27', text: 'Schmerz über 5/10: Die nächsten Laufvorschläge werden durch lockeres Radfahren ersetzt. Hält es an, bitte abklären lassen.' });
  }
  return notes;
}

export async function saveEndurance(p: Profile, s: EnduranceSession, d: CoachDB = db): Promise<Note[]> {
  const history = await listEndurance(p.id, d);
  const tests = await listTests(p.id, d);
  const notes = evaluate(p, s, history, tests);
  await d.endurance.put(plain(s));
  const hm = newMaxHr(p, s);
  if (hm) {
    await saveProfile({ ...p, endurance: { ...p.endurance, maxHrMeasured: hm } }, d);
    await d.changes.add({
      profileId: p.id, at: new Date().toISOString(), ruleId: 'E3',
      what: `Maximalpuls ${p.endurance.maxHrMeasured ?? 'geschätzt'} → ${hm}`,
      why: 'In einer Einheit wurde ein höherer Puls gemessen. Gemessene Werte sind genauer als jede Formel.'
    });
  }
  return notes;
}

export async function deleteEndurance(id: string, d: CoachDB = db): Promise<void> {
  await d.endurance.delete(id);
}

export async function saveTest(t: EnduranceTest, d: CoachDB = db): Promise<void> {
  await d.tests.put(plain(t));
}

export async function deleteTest(id: string, d: CoachDB = db): Promise<void> {
  await d.tests.delete(id);
}
