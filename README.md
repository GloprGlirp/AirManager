# FLIGHTLINE – Airbase Command

3D-Browser-Aufbau- und Managementspiel: Fliegerhorst ausbauen, Flugabwehr errichten, Personal führen, Maschinen in Einsätze schicken und andere Basen angreifen. Mit Accounts – der Spielstand liegt auf dem Server.

## Starten (lokal)

```bash
npm install
npm start
```

Dann `http://localhost:3000` öffnen, Account registrieren, losspielen.

Zum Testen gibt es Entwickler-Abkürzungen (sofort reich, Bauten fertig, Luftangriff in 20 s):

```bash
npm run dev
# im Browser-Konsole, eingeloggt:
fetch('/api/dev/rich',  {method:'POST', headers:{Authorization:'Bearer '+localStorage.fl_token}})
fetch('/api/dev/finish',{method:'POST', headers:{Authorization:'Bearer '+localStorage.fl_token}})
fetch('/api/dev/raid',  {method:'POST', headers:{Authorization:'Bearer '+localStorage.fl_token}})
```

## Speicherung

- **Ohne Einstellung:** alles in `data/db.json` (Ordner per `DATA_DIR` änderbar).
- **Mit `DATABASE_URL`:** PostgreSQL – Tabellen werden beim Start automatisch angelegt.

Passwörter werden mit scrypt gehasht, Sessions laufen 30 Tage.

## Online stellen (Render)

Render erlaubt nur **eine** kostenlose Postgres-Datenbank – das Spiel nutzt einfach die, die du schon hast. Seine Tabellen heißen `ab_users` und `ab_sessions` und kommen anderen Projekten in derselben Datenbank nicht in die Quere.

1. Render-Dashboard → deine bestehende Postgres → **Connections** → **Internal Database URL** kopieren.
2. **New → Blueprint** → Repo `AirManager` wählen. Render fragt nach `DATABASE_URL` → URL einfügen.
   (Alternativ **New → Web Service**: Build `npm install`, Start `npm start`, Umgebungsvariable `DATABASE_URL` setzen.)
3. Fertig – die Tabellen werden beim ersten Start automatisch angelegt.

Ohne `DATABASE_URL` speichert der Server in `data/db.json` – auf Render geht die Datei bei jedem Neustart verloren.

## Steuerung

| Aktion | Maus / Tastatur | Touch |
|---|---|---|
| Karte verschieben | Ziehen, WASD / Pfeile | Ziehen |
| Drehen | Rechte Maustaste oder Shift + Ziehen, Q/E | Zwei Finger drehen |
| Zoom | Mausrad | Pinch |
| Menüs | B Bauen · F Flotte · P Personal · M Einsätze · X Angriff · L Lagebuch | Leiste unten |
| Bauen | Klick setzt, R dreht, Esc bricht ab | Tippen setzt Vorschau, „Bauen“ bestätigt |

## Inhalte

- **17 Gebäude:** Kommandozentrale, Start-/Landebahn, Kontrollturm, Hangar, Hubschrauberlandeplatz, Treibstofflager, Munitionsbunker, Logistikzentrum, Unterkunft, Wartungshalle, Flugschule, Fahrzeughof, Radarstation TRML-4D, Flak Skyguard 35 mm, Phalanx C-RAM, IRIS-T SLM, MIM-104 Patriot
- **20 Luftfahrzeuge:** Pilatus PC-21, F-16C, Gripen E, MQ-9B, C-130J, Tornado IDS, A-10C, F/A-18E, Eurofighter Typhoon, A400M, Rafale C, A330 MRTT, F-15EX, E-7 Wedgetail, F-35A, H145M, NH90, Tiger, CH-47F, AH-64E
- **7 Bodenfahrzeuge:** MAN HX2, MAN TGS Tankwagen, MJ-1E Waffenlader, Rosenbauer Panther, ATF Dingo 2, Goldhofer-Schlepper, Flakpanzer Gepard 1A2
- **Personal:** Pilot:innen (Rang, Erfahrung, Ruhezeit, Simulator), Mechaniker:innen, Logistiker:innen, Fluglots:innen
- **Einsätze:** 9 Auftragsarten von Übungsflug bis Präzisionsschlag, Erfolgschance aus Einsatzwert vs. Bedrohung
- **Luftangriffe der Red Force** (ab HQ 2) mit Radar-Vorwarnung, auch offline
- **Basis-Angriffe** auf andere Spieler:innen oder KI-Stellungen, Ruhm, Schutzschild, Rangliste

## Aufbau

```
server.js          Express-Server, Accounts, Aktionen, PvP, Rangliste
db.js              JSON-Datei oder PostgreSQL
shared/rules.js    Komplette Spiellogik (läuft auf Server und im Browser)
public/            Three.js-Client: Szene, Modelle, Welt, Oberfläche
```

Die Spiellogik ist serverseitig autoritativ: Der Browser zeigt nur eine Vorschau, jede Aktion prüft der Server.
