# Kestrel Field Ops – Ops-Desk-Modus

Eigenständiges Indie-Spiel im Pixel-Look im AirManager-Repo: Du sitzt im Operations-Büro am Schreibtisch, schaust aus dem Fenster auf Startbahn 27 und steuerst den Fliegerhorst über das Basis-Terminal.

Läuft komplett im Browser, ohne Server-Logik und ohne Account. Der Spielstand liegt im `localStorage` des Browsers.

## Spielen

- Online: `https://<deine-render-url>/desk-ops/`
- Lokal: `npm start` im Repo-Root, dann `http://localhost:3000/desk-ops/`
- Oder `public/desk-ops/index.html` direkt im Browser öffnen.

Leertaste pausiert, Tasten 1–4 ändern das Tempo.

## Was drin ist

- **Tutorial:** Schritt-für-Schritt-Einführung beim ersten Start, danach geht die Kampagne weiter. Der Help-Knopf oben startet es jederzeit neu.
- **Kampagne:** Früh-, Spät- und Nachtschicht (je 8 Spielstunden) mit 3 Zielen pro Schicht, Schichtbericht, XP und Beförderungen vom Second Lieutenant bis zum Brigadier General. Flugzeuge, Ausbauten und Ausbildung werden mit dem Rang freigeschaltet. Daneben gibt es **Free Play** mit allem freigeschaltet.
- **Fenster:** Jets rollen, starten mit Nachbrenner und landen; C-130 bringt Nachschub; Tag/Nacht, Wetter, Luftangriffe mit Rauch und Kratern; Hangars und Kran beim Bau; Patriot- und Avenger-Starts.
- **Tasking:** CAP, Strike, Recon und Intercept mit Taktik (Aggression, Formation, ROE, Flughöhe).
- **Flightline:** Tanken, Bewaffnen, Reparieren, Turnaround, Pilotentausch.
- **Supply:** JP-8, AIM-120, AIM-9X, AGM-65, GBU-12, 20mm, Chaff, Flares, Ersatzteile, PAC-3, Stinger.
- **Base:** Hangars (+2 Stellplätze, Schutz bei Angriffen), Patriot-Batterie, Avenger SHORAD, Tanklager-Ausbau, Munitionsbunker, Crew-Unterkünfte; Bodencrews und Ersatzpiloten ausbilden; neue Flugzeuge kaufen (F-16C, F-15E, F/A-18E, A-10C, F-35A, KC-135R, E-3G AWACS).
- **Perks:** Auto refuel, Auto repair, Auto re-arm, Auto resupply und Fast crews. In der Kampagne mit Perk-Punkten freischalten (je Beförderung und saubere Schicht), jederzeit an- und ausschaltbar.
- **Tac map:** Radarkarte mit Flügen, Raids und Einsätzen; Taktik im Flug ändern, zum Tanker schicken, zurückrufen.
- **Sound:** synthetisch per Web Audio (Triebwerke, Funk, Alarm, Explosionen, Donner). Schalter „Sound“ oben rechts.

## Aufbau

Der Code liegt in Teilen unter `src/`, `build.sh` setzt daraus `public/desk-ops/index.html` zusammen:

| Datei | Inhalt |
|---|---|
| `01-head.html` | Titel, Schriften, CSS |
| `02-body.html` | Raum, Fenster, Monitor |
| `03-data.js` | Daten: Ressourcen, Flugzeugtypen, Ausbauten, Spielstand |
| `04-sim-ground.js` | Bodencrews, Logistik, Startbahn, Rollwege |
| `05-sim-air.js` | Flüge, Luftkampf, SAMs, Raids, Einsätze, Spielschritt |
| `10-sim-base.js` | Bau, Ausbildung, Beschaffung |
| `13-campaign.js` | Kampagne: Schichten, Ziele, XP, Ränge, Freischaltungen |
| `06/07/12-scene-*.js` | Fensteransicht (Canvas) |
| `14-pixel.js` | Pixel-Look: Palette und Dithering der Fensteransicht |
| `08-ui-panels.js`, `09-ui-main.js` | Terminal, Tac Map, Eingabe, Hauptschleife |
| `11-audio.js` | Sound |
| `15-tutorial.js` | Tutorial mit markierten Knöpfen |

Nach Änderungen in `src/`:

```bash
./desk-ops/build.sh
```
