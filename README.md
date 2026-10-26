# Version-2-Mangold-App-
APP Mangold

## Außendienst-Nachweis aus Sprache

Im Auftrag unter **Dokumentation** die Spracheingabe starten und anschließend
beenden. Der Browser muss Spracherkennung unterstützen (z. B. Chrome/Edge),
Mikrofonzugriff erlauben und über HTTPS bzw. lokal laufen. Je nach Browser
erfolgt die Spracherkennung über dessen externen Dienst; eine funktionierende
Netzverbindung zum Dienst ist erforderlich. Alternativ im Textfeld die
Diktierfunktion der Tablet-Tastatur nutzen oder Angaben tippen.

Die lokale, regelbasierte Zuordnung erkennt Angaben wie „Befund: … Arbeiten: …
Material: 2 Stück Lager, Artikelnummer L-17. Arbeitszeit: zwei Stunden.
Reisezeit hin: 30 Minuten. Reisezeit rück: 45 Minuten. Kilometer: 48 km.“
Materialpositionen mit Semikolon oder Zeilenumbruch trennen. Unklare Angaben
bleiben zur Prüfung sichtbar und werden im Bericht übernommen. Es gibt keine
KI-Anbindung für beliebige freie Texte. Zuordnung vor der Weitergabe prüfen.

**Angaben prüfen → Ausgefülltes Formular anzeigen** zeigt beide Seiten der
unveränderten hochgeladenen V4-Vorlage mit den erfassten Werten. Das Ergebnis
kann als PDF geöffnet, gedruckt oder heruntergeladen werden. Es wird keine
JSON-Datei ausgegeben. Unterschriften, Preise und fehlende Angaben werden
nicht erfunden. Die Ausgabe ist ein PDF mit fest eingetragenen Werten;
Korrekturen erfolgen in der App. Lange Berichte laufen auf die Folgeseite,
Material umfasst maximal elf Positionen. Bei Platzmangel erscheint eine
Fehlermeldung; der Text bleibt erhalten und wird nicht abgeschnitten.

Entwürfe bleiben im lokalen Browserspeicher. Neue Beispielaufträge verwenden
weiterhin künstliche Kundendaten. Es erfolgt kein Versand an ERP oder Mangold.

## Start und Prüfungen

Benötigt wird Node.js, zusätzliche npm-Pakete sind nicht erforderlich.

```sh
node server.cjs
node build.cjs
node --test tests/service-report.test.cjs
```

Der lokale Server verwendet Port 4173. Für die funktionalen Browser- und
PDF-Prüfungen sind Python, Playwright, Chromium (`/usr/bin/chromium`) und
PyMuPDF erforderlich. Bei laufendem Server:

```sh
python3 tests/service-report-browser.py
```

Der Browsertest simuliert Spracherkennungsereignisse und prüft zusätzlich
die Inhalte des erzeugten PDFs, Speichern/Neuladen, Korrekturen und Überläufe.
Eine echte Mikrofonaufnahme und die Erreichbarkeit des Spracherkennungsdienstes
müssen auf dem verwendeten Tablet geprüft werden.
