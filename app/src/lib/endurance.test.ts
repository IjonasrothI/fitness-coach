import { describe, expect, it } from 'vitest';
import { newProfile } from './defaults';
import {
  checkRunDistance, criticalSpeed, distribution, efficiency, efficiencyTrend, ftpFrom20, hrEasyMax,
  longestRun, monotonyHint, newMaxHr, paceStr, parsePace, predictTime, suggest, testDue, tooHardForEasy,
  weeklyIncreaseHint, whoMinutes, zones
} from './endurance';
import type { EnduranceSession, EnduranceTest, Profile, StrengthSession } from './types';

const NOW = new Date('2026-11-23T18:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();

function profile(mod?: (p: Profile) => void): Profile {
  const p = { ...newProfile(), name: 'T', birthYear: 1990, createdAt: '2026-01-01T00:00:00Z' };
  mod?.(p);
  return p;
}
let n = 0;
function run(o: Partial<EnduranceSession>): EnduranceSession {
  return { id: `r${n++}`, profileId: 'p', date: daysAgo(1), sport: 'run', type: 'easy', durationMin: 45, sRpe: 3, ...o };
}
const csTest: EnduranceTest = { id: 'c', profileId: 'p', date: daysAgo(5), kind: 'cs', t1Sec: 180, d1M: 900, t2Sec: 720, d2M: 3060 };

describe('Formatierung', () => {
  it('Pace hin und zurück', () => {
    expect(paceStr(312)).toBe('5:12 /km');
    expect(parsePace('5:12')).toBe(312);
    expect(parsePace('5,05')).toBe(305);
    expect(parsePace('99')).toBeNull();
  });
});

describe('Feldtests (E4, E7)', () => {
  it('Critical Speed aus zwei Läufen', () => {
    const r = criticalSpeed(csTest)!;
    expect(r.cs).toBeCloseTo(4.0, 5); // (3060−900)/(720−180)
    expect(r.dPrime).toBeCloseTo(180, 5);
    expect(predictTime(r.cs, r.dPrime, 5000)).toBeCloseTo(1205, 0);
  });
  it('unplausible Eingaben → null', () => {
    expect(criticalSpeed({ t1Sec: 180, d1M: 900, t2Sec: 720, d2M: 800 })).toBeNull();
    expect(criticalSpeed({ t1Sec: 720, d1M: 900, t2Sec: 180, d2M: 3000 })).toBeNull();
  });
  it('FTP = 95 % der 20-min-Leistung', () => expect(ftpFrom20(250)).toBe(238));
  it('Retest nach 7 Wochen fällig', () => {
    expect(testDue([], 'cs', NOW)).toBe(true);
    expect(testDue([csTest], 'cs', NOW)).toBe(false);
    expect(testDue([{ ...csTest, date: daysAgo(60) }], 'cs', NOW)).toBe(true);
  });
});

describe('Zonen', () => {
  it('Lauf: Schwelle bei/leicht unter CS, Intervalle darüber (E6)', () => {
    const z = zones(profile(), [csTest], 'run');
    // CS 4,0 m/s = 4:10 /km
    expect(z.tempo.paceSec![0]).toBeCloseTo(1000 / (4 * 0.97), 3);
    expect(z.intervals.paceSec![1]).toBeCloseTo(1000 / (4 * 1.03), 3);
    expect(z.easy.paceSec).toBeCloseTo(1000 / 3.2, 3);
  });
  it('Talktest schlägt Schätzung', () => {
    const t: EnduranceTest = { id: 't', profileId: 'p', date: daysAgo(3), kind: 'talkRun', paceSec: 330, hr: 148 };
    const z = zones(profile(), [csTest, t], 'run');
    expect(z.easy.paceSec).toBe(330);
    expect(z.easy.hr).toBe(148);
  });
  it('Rad ohne eigenen Talktest: Lauf-Talkpuls − 7', () => {
    const t: EnduranceTest = { id: 't', profileId: 'p', date: daysAgo(3), kind: 'talkRun', paceSec: 330, hr: 148 };
    expect(hrEasyMax(profile(), [t], 'bikeOutdoor').hr).toBe(141);
  });
  it('Rolle mit Watt: Zonen aus FTP', () => {
    const f: EnduranceTest = { id: 'f', profileId: 'p', date: daysAgo(3), kind: 'ftp20', power: 250 };
    const z = zones(profile(), [f], 'bikeIndoor');
    expect(z.tempo.power).toEqual([202, 226]);
    expect(z.easy.power).toBe(179);
  });
  it('ohne Tests: Puls aus Herzfrequenzreserve', () => {
    const p = profile((x) => (x.endurance.restingHr = 50));
    // HFmax Tanaka 36 J. = 183 → 50 + 0,7 × 133 = 143
    expect(hrEasyMax(p, [], 'run')).toEqual({ hr: 143, source: '70 % Herzfrequenzreserve (Schätzung)' });
  });
});

describe('Intensitätsverteilung (E1, E5, E20)', () => {
  const p = profile();
  it('zu harter lockerer Lauf wird erkannt', () => {
    const t: EnduranceTest = { id: 't', profileId: 'p', date: daysAgo(3), kind: 'talkRun', paceSec: 330, hr: 148 };
    expect(tooHardForEasy(run({ avgHr: 160 }), p, [t])).toMatch(/über deiner Locker-Grenze/);
    expect(tooHardForEasy(run({ avgHr: 140, distanceKm: 8, durationMin: 45 }), p, [t])).toBeNull();
    expect(tooHardForEasy(run({ type: 'tempo', avgHr: 175 }), p, [t])).toBeNull();
  });
  it('Verteilung und WHO-Minuten', () => {
    const s = [run({ durationMin: 60 }), run({ type: 'intervals', durationMin: 40 })];
    const d = distribution(s, p, []);
    expect(d.minutes[0]).toBeCloseTo(60 + 26, 5);
    expect(d.minutes[2]).toBeCloseTo(12, 5);
    expect(whoMinutes(s, p, [])).toBe(Math.round(86 + 2 * 14));
  });
  it('Monotonie-Hinweis nur bei gleichförmig steigender Last', () => {
    expect(monotonyHint([300, 320, 310, 300, 330, 310, 300], 1500)).not.toBeNull();
    expect(monotonyHint([0, 400, 0, 300, 0, 500, 0], 1000)).toBeNull();
  });
});

describe('Einzellauf-Regel (E14–E16)', () => {
  it('Referenz = längster Lauf der letzten 30 Tage', () => {
    const p = profile();
    const runs = [run({ distanceKm: 10, date: daysAgo(5) }), run({ distanceKm: 14, date: daysAgo(40) })];
    expect(longestRun(runs, p, NOW)).toEqual({ km: 10, seeded: false });
  });
  it('Profil-Startwert zählt nur in den ersten 30 Tagen', () => {
    const fresh = profile((x) => { x.createdAt = daysAgo(3); x.experience.longestRunLast30dKm = 12; });
    expect(longestRun([], fresh, NOW)).toEqual({ km: 12, seeded: true });
    const old = profile((x) => { x.experience.longestRunLast30dKm = 12; });
    expect(longestRun([], old, NOW).km).toBe(0);
  });
  it('Warnstufen', () => {
    expect(checkRunDistance(10.5, 10).level).toBe('ok');
    expect(checkRunDistance(12, 10).level).toBe('warn');
    expect(checkRunDistance(14, 10).level).toBe('confirm');
    expect(checkRunDistance(21, 10).level).toBe('block');
    expect(checkRunDistance(5, 0).level).toBe('ok');
  });
  it('2-Wochen-Zuwachs > 30 % → weicher Hinweis', () => {
    const runs = [
      run({ distanceKm: 6, date: daysAgo(20) }), run({ distanceKm: 6, date: daysAgo(17) }),
      run({ distanceKm: 10, date: daysAgo(10) }), run({ distanceKm: 10, date: daysAgo(3) })
    ];
    expect(weeklyIncreaseHint(runs, NOW)).toMatch(/\+67 %/);
  });
});

describe('Fortschritt', () => {
  it('Effizienz: Lauf m/min pro Schlag, erste Hälfte bei Drift', () => {
    expect(efficiency(run({ distanceKm: 9, durationMin: 45, avgHr: 140 }))).toBeCloseTo(200 / 140, 5);
    expect(efficiency(run({ distanceKm: 9, durationMin: 45, avgHr: 140, hrSecondHalf: 145 }))).toBeCloseTo(200 / 135, 5);
    expect(efficiency(run({ type: 'intervals', distanceKm: 9, avgHr: 160 }))).toBeNull();
  });
  it('Effizienz-Trend über 4-Wochen-Fenster', () => {
    const s = [
      run({ distanceKm: 8, durationMin: 45, avgHr: 145, date: daysAgo(40) }),
      run({ distanceKm: 8, durationMin: 45, avgHr: 145, date: daysAgo(35) }),
      run({ distanceKm: 8, durationMin: 45, avgHr: 140, date: daysAgo(10) }),
      run({ distanceKm: 8, durationMin: 45, avgHr: 140, date: daysAgo(3) })
    ];
    expect(efficiencyTrend(s, 'run', NOW)!.pct).toBeCloseTo((145 / 140 - 1) * 100, 3);
  });
  it('neuer Maximalpuls nur wenn höher', () => {
    const p = profile((x) => (x.endurance.maxHrMeasured = 185));
    expect(newMaxHr(p, run({ maxHr: 190 }))).toBe(190);
    expect(newMaxHr(p, run({ maxHr: 180 }))).toBeNull();
  });
});

describe('Vorschlag', () => {
  const p = profile();
  it('ohne harte Einheit diese Woche → Intervalle mit ≥ 15 min Arbeit (E22)', () => {
    const s = suggest(p, 'run', 45, [], [], [csTest], NOW);
    expect(s.type).toBe('intervals');
    expect(s.title).toMatch(/4 × 4 min/);
  });
  it('harte Einheit < 48 h → locker oder lang', () => {
    const s = suggest(p, 'run', 40, [run({ type: 'intervals', date: daysAgo(1) })], [], [], NOW);
    expect(s.type).toBe('easy');
  });
  it('PAR-Q-Sperre → keine Intervalle', () => {
    const r = profile((x) => (x.health.parq.chestPain = true));
    expect(suggest(r, 'run', 45, [], [], [], NOW).type).not.toBe('intervals');
  });
  it('hartes Beintraining < 24 h → keine Schlüsseleinheit (E18)', () => {
    const st: StrengthSession = {
      id: 's', profileId: 'p', kind: 'strength', status: 'done', startedAt: daysAgo(0.5), finishedAt: daysAgo(0.45),
      plannedMinutes: 40, plan: [], sets: [{ pattern: 'squat', exerciseId: 'bulgarian', reps: 12, rir: 1, at: daysAgo(0.45) }]
    };
    const s = suggest(p, 'run', 45, [], [st], [], NOW);
    expect(['easy', 'long']).toContain(s.type);
  });
  it('langer Lauf wird auf +10 % gedeckelt', () => {
    const s = suggest(p, 'run', 90, [run({ type: 'intervals', date: daysAgo(3) }), run({ distanceKm: 12, date: daysAgo(6) })], [], [], NOW);
    expect(s.type).toBe('long');
    expect(s.maxKm).toBe(13.2);
  });
  it('Laufschmerz > 5 → Rad statt Laufen (E25)', () => {
    const s = suggest(p, 'run', 45, [run({ pain: [{ region: 'knee', score: 6 }], date: daysAgo(2) })], [], [], NOW);
    expect(s.sport).toBe('bikeOutdoor');
  });
});

describe('Tagesform im Ausdauer-Vorschlag (M4)', () => {
  const p = profile();
  const caps = (o: Partial<import('./readiness').Caps>) => ({ noTraining: false, hardStop: false, noIntensity: false, recoveryOnly: false, painRegions: [], minRir: 1, ...o });
  it('krank → Ruhetag', () => expect(suggest(p, 'run', 45, [], [], [], NOW, caps({ noTraining: true })).title).toBe('Ruhetag'));
  it('rot → lockere Erholung ≤ 30 min, nicht laufen', () => {
    const s = suggest(p, 'run', 60, [], [], [], NOW, caps({ recoveryOnly: true }));
    expect(s.type).toBe('recovery');
    expect(s.minutes).toBe(30);
    expect(s.sport).toBe('bikeOutdoor');
  });
  it('keine Intensität → keine Intervalle', () => expect(suggest(p, 'run', 45, [], [], [csTest], NOW, caps({ noIntensity: true })).type).not.toBe('intervals'));
  it('Knieschmerz → Rad statt Laufen', () => expect(suggest(p, 'run', 45, [], [], [], NOW, caps({ painRegions: ['knee'] })).sport).toBe('bikeOutdoor'));
});
