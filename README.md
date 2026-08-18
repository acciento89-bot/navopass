# NavoPass 1.0

Digitaler Objekt- und Servicepass für Privatnutzer, Haushalte und Betriebe.

NavoPass verbindet reale Gegenstände über QR-Codes mit einer digitalen Historie. Gerätedaten, Garantie, Dokumente, Wartungen und Serviceereignisse bleiben an einem Ort und können kontrolliert geteilt werden.

## Produktionsumfang

- Konto, Login, E-Mail-Verifizierung und Passwort-Reset
- digitale Objektpässe mit Hersteller, Modell, Seriennummer, Kauf- und Garantiedaten
- Wartungs-, Service- und Ereignishistorie
- geschützte Datei-Uploads mit Speicherlimits und Dateisignaturprüfung
- QR-Codes sowie private, Link- und öffentliche Freigaben
- Haushalte und Teams mit Rollen und Einladungen
- Hinweise, Service-Center, Aktivität und Kalenderexport
- Datenexport und Kontolöschung
- Stripe-Abos Plus, Family und Business mit Monats- und Jahrespreisen
- Vertragsbestätigung, Customer Portal, Kündigung und Widerruf
- installierbare PWA mit datenschutzfreundlichem Offline-Fallback
- PostgreSQL, Docker und Healthchecks

Produktionsdomain: `https://navopass.de`

## Sicherheit

NavoPass verwendet HttpOnly-/Secure-Sitzungscookies, scrypt-Passworthashes, gehashte Einmal-Tokens, serverseitige Rollenprüfung, Stripe-Webhook-Signaturen, Content-Security-Policy und persistente Rate Limits für Login, Registrierung, Passwort-Reset und Kontaktformular.

Uploads werden nicht anhand der Dateiendung allein akzeptiert. PDF, JPEG, PNG, WebP, HEIC und HEIF werden anhand ihrer Dateisignatur geprüft und anschließend mit restriktiven Dateirechten gespeichert.

Der Service Worker cached keine privaten Pässe, API-Antworten oder Dokumente. Offline verfügbar sind nur statische App-Ressourcen und die Offline-Hinweisseite.

## Backups

Der Compose-Stack enthält einen eigenen `backup`-Dienst. Beim Start wird sofort ein Backup erzeugt; anschließend täglich um 03:17 UTC.

Ein Backup enthält:

- PostgreSQL-Dump im Custom-Format
- Archiv des Upload-Volumes
- Metadaten
- SHA-256-Prüfsummen

Standard-Aufbewahrung: 14 Tage (`BACKUP_RETENTION_DAYS`). Die Sicherungen liegen im Volume `navopass-backups`. `/api/health` meldet, ob ein Backup vorhanden und jünger als 36 Stunden ist.

Manuelles Backup:

```bash
docker compose run --rm backup /bin/sh /scripts/backup.sh
```

### Restore

Ein Restore ersetzt Datenbank und Uploads. Vorher Web- und Backup-Dienst stoppen und den gewünschten Sicherungsordner auswählen.

```bash
docker compose stop web backup
docker compose run --rm -e CONFIRM_RESTORE=YES backup /bin/sh /scripts/restore-backup.sh /backups/<ZEITSTEMPEL>
docker compose up -d
```

Danach `https://navopass.de/api/health` prüfen.

**Wichtig:** Das Docker-Backup schützt vor Anwendungs-, Datenbank- und Bedienfehlern auf dem laufenden Host. Für vollständige Disaster-Recovery bei Verlust des gesamten Servers muss das Backup-Volume zusätzlich auf ein externes/offsite Ziel gespiegelt werden.

## Healthcheck

`GET /api/health` prüft Datenbank und erforderliches Schema und zeigt zusätzlich Mail-, Billing- und Backup-Status.

Für einen vollständig eingerichteten Produktionsbetrieb sollte gelten:

```json
{
  "ok": true,
  "productionReady": true,
  "mailConfigured": true,
  "billingConfigured": true,
  "backup": {
    "available": true,
    "fresh": true
  }
}
```

Der Docker-Healthcheck bewertet die Kernanwendung anhand von `ok`; ein fehlendes externes System führt dadurch nicht zu einer Neustartschleife. `productionReady` ist die strengere Betriebsanzeige.

## Konfiguration

Secrets gehören ausschließlich in Portainer beziehungsweise die Produktionsumgebung und niemals ins Repository. Relevante Variablen sind in `.env.example` dokumentiert, darunter Datenbank, SMTP, Stripe, `RATE_LIMIT_SECRET` und Backup-Aufbewahrung.

Für `RATE_LIMIT_SECRET` sollte in Produktion ein eigener langer Zufallswert verwendet werden. Ist er nicht gesetzt, verwendet die Anwendung als Fallback das Datenbankpasswort.

## Tests und CI

GitHub Actions startet für Pull Requests eine echte PostgreSQL-Instanz und führt aus:

1. TypeScript-Typecheck
2. Unit-Tests der Upload-Dateisignaturen
3. Next.js Production-Build
4. Start der gebauten Anwendung
5. HTTP-Smoke-Tests gegen die laufende App einschließlich Healthcheck, CSP, PWA, Rechtliches, anonymer Login-Weiterleitung und einer echten Datenbank-Sitzung für den eingeloggten Navigationspfad

Lokal:

```bash
npm install
npm run typecheck
npm run test:unit
npm run build
```

Für `npm run test:smoke` müssen PostgreSQL und der Production-Server laufen und `DATABASE_URL` sowie `APP_URL` gesetzt sein.

## Abrechnung

NavoPass nutzt Stripe Checkout und Stripe Billing. Preis-IDs werden vor jedem Checkout serverseitig gegen Tarif, Betrag, Währung und Abrechnungsintervall validiert. Der Tarif wird ausschließlich aus signierten Stripe-Webhooks aktualisiert.

Bei Anwendung der Kleinunternehmerregelung enthält NavoPass den Hinweis zur Steuerbefreiung nach § 19 UStG in Preis-/Vertragsinformationen und in den NavoPass-spezifischen Stripe-Rechnungseinstellungen. Steuer- und Unternehmensdaten des Stripe-Kontos müssen im Stripe-Dashboard vollständig und aktuell gehalten werden.
