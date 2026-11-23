# Fitness Coach

Persönlicher, evidenzbasierter Trainingscoach als Web-App (PWA) fürs iPhone:
Krafttraining zuhause mit minimalem Equipment, Laufen und Radfahren, personalisiert über Feedback-Loops.

- **App:** https://ijonasrothi.github.io/fitness-coach/
- **Plan:** [PLAN.md](PLAN.md)
- **Wissenschaftliche Grundlage:** [reports/Evidenzbasis Fitness Coach App.md](reports/Evidenzbasis%20Fitness%20Coach%20App.md)

## Auf dem iPhone installieren

1. Link oben in **Safari** öffnen.
2. Teilen-Symbol → **„Zum Home-Bildschirm"** → Hinzufügen.
3. Immer über das Icon starten. Funktioniert danach auch offline.

Alle Trainingsdaten bleiben lokal auf dem jeweiligen iPhone. Sicherung: *Daten* → **Sicherung speichern** → „In Dateien sichern".

## Entwicklung

```bash
cd app
npm install
npm run dev     # http://localhost:5173
npm test        # Unit-Tests der Trainingslogik
npm run check   # Typprüfung
```

Jeder Push auf `main` wird automatisch geprüft und auf GitHub Pages veröffentlicht.
