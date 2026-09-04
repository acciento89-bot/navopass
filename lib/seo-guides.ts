export type LocalizedText = { de: string; en: string };

export type SeoGuide = {
  slug: string;
  eyebrow: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  intro: LocalizedText;
  benefits: LocalizedText[];
  steps: { title: LocalizedText; text: LocalizedText }[];
  faq: { question: LocalizedText; answer: LocalizedText }[];
};

export const seoGuides: SeoGuide[] = [
  {
    slug: "digitaler-objektpass",
    eyebrow: { de: "DIGITALER OBJEKTPASS", en: "DIGITAL ASSET PASS" },
    title: { de: "Geräte, Anlagen und Fahrzeuge vollständig dokumentieren", en: "Document equipment, systems and vehicles in one place" },
    description: { de: "Digitaler Objektpass mit Stammdaten, Dokumenten, Garantie, Wartungshistorie und QR-Code für private und geschäftliche Nutzung.", en: "A digital asset pass for master data, documents, warranties, maintenance history and QR access." },
    intro: { de: "Ein digitaler Objektpass bündelt alle wichtigen Informationen eines Gegenstands an einem Ort. Statt Rechnungen, Seriennummern und Wartungsnachweise in verschiedenen Ordnern zu suchen, bleibt die vollständige Historie direkt mit dem Objekt verknüpft.", en: "A digital asset pass keeps every important detail about an item in one place. Receipts, serial numbers and maintenance records remain connected to the asset instead of being scattered across folders." },
    benefits: [
      { de: "Stammdaten, Kaufbeleg und Garantiedauer zentral sichern", en: "Store master data, receipts and warranty periods centrally" },
      { de: "Reparaturen, Prüfungen und Wartungen nachvollziehbar festhalten", en: "Keep a traceable record of repairs, inspections and maintenance" },
      { de: "Dokumente über einen kontrollierten QR-Zugang bereitstellen", en: "Provide documents through controlled QR access" },
      { de: "Objekte im Haushalt, Team oder Unternehmen gemeinsam verwalten", en: "Manage assets together at home or across a business team" },
    ],
    steps: [
      { title: { de: "Objekt anlegen", en: "Create the asset" }, text: { de: "Bezeichnung, Hersteller, Modell, Seriennummer und Kaufdaten erfassen.", en: "Record its name, manufacturer, model, serial number and purchase details." } },
      { title: { de: "Nachweise ergänzen", en: "Add evidence" }, text: { de: "Rechnungen, Anleitungen, Fotos und Garantien passend zum Objekt speichern.", en: "Attach receipts, manuals, photos and warranty documents to the asset." } },
      { title: { de: "Historie pflegen", en: "Maintain the history" }, text: { de: "Service, Reparaturen, Messwerte und wichtige Ereignisse chronologisch dokumentieren.", en: "Document service, repairs, readings and important events chronologically." } },
      { title: { de: "Gezielt teilen", en: "Share selectively" }, text: { de: "QR-Code oder geschützten Link nur für die benötigten Informationen freigeben.", en: "Use a QR code or protected link to share only the information required." } },
    ],
    faq: [
      { question: { de: "Was ist ein digitaler Objektpass?", en: "What is a digital asset pass?" }, answer: { de: "Eine digitale Akte, die Stammdaten, Dokumente, Fristen und Ereignisse dauerhaft einem konkreten Gegenstand zuordnet.", en: "It is a digital record that permanently connects master data, documents, deadlines and events to a specific asset." } },
      { question: { de: "Für welche Gegenstände eignet er sich?", en: "Which assets can I use it for?" }, answer: { de: "Zum Beispiel für Geräte, Heizungs- und Klimaanlagen, Fahrzeuge, Fahrräder, Maschinen, Werkzeuge oder Boote.", en: "For example equipment, heating and air-conditioning systems, vehicles, bicycles, machines, tools or boats." } },
      { question: { de: "Kann ich einen Pass weitergeben?", en: "Can I hand a pass over?" }, answer: { de: "Ja. Informationen können kontrolliert geteilt und bei Reparatur, Verkauf oder Betreiberwechsel nachvollziehbar übergeben werden.", en: "Yes. Information can be shared in a controlled way for repairs, resale or a change of operator." } },
    ],
  },
  {
    slug: "inventar-mit-qr-code",
    eyebrow: { de: "QR-CODE-INVENTAR", en: "QR CODE INVENTORY" },
    title: { de: "Inventar mit QR-Codes kennzeichnen und direkt aufrufen", en: "Label inventory with QR codes and open records instantly" },
    description: { de: "Inventar digital verwalten: Gegenstände per QR-Code mit Dokumenten, Zuständigkeiten und Historie verbinden.", en: "Manage inventory digitally by linking QR codes to documents, responsibilities and asset history." },
    intro: { de: "Ein QR-Code am Gegenstand verkürzt den Weg zur richtigen Information. Mitarbeitende, Familienmitglieder oder Servicepartner öffnen den passenden Objektpass direkt vor Ort, ohne lange nach Ordnern oder Dateinamen zu suchen.", en: "A QR code on an item provides a direct route to the right information. Staff, family members or service partners can open the asset pass on site without searching folders or filenames." },
    benefits: [
      { de: "Eindeutige Zuordnung von Gegenstand und digitaler Akte", en: "A clear link between an item and its digital record" },
      { de: "Schneller Zugriff auf Anleitungen und Servicedaten", en: "Fast access to manuals and service information" },
      { de: "Kontrollierbare öffentliche oder geschützte Freigaben", en: "Controlled public or protected sharing" },
      { de: "Geeignet für Haushalt, Werkstatt, Lager und Außendienst", en: "Suitable for homes, workshops, warehouses and field service" },
    ],
    steps: [
      { title: { de: "Pass erstellen", en: "Create a pass" }, text: { de: "Für jedes relevante Inventarstück einen eindeutigen Objektpass anlegen.", en: "Create a unique asset pass for every relevant inventory item." } },
      { title: { de: "QR-Code erzeugen", en: "Generate the QR code" }, text: { de: "Den automatisch verknüpften Code als Aufkleber oder Ausdruck verwenden.", en: "Use the automatically linked code as a sticker or printout." } },
      { title: { de: "Zugriff festlegen", en: "Set access" }, text: { de: "Bestimmen, welche Informationen privat bleiben und welche geteilt werden dürfen.", en: "Choose which information remains private and what may be shared." } },
      { title: { de: "Vor Ort scannen", en: "Scan on site" }, text: { de: "Den Datensatz ohne App-Installation direkt im Browser öffnen.", en: "Open the record directly in a browser without installing an app." } },
    ],
    faq: [
      { question: { de: "Braucht der Empfänger eine App?", en: "Does the recipient need an app?" }, answer: { de: "Nein. Freigegebene Objektpässe lassen sich über den QR-Code direkt im Browser öffnen.", en: "No. Shared asset passes can be opened directly in a browser using the QR code." } },
      { question: { de: "Kann ein QR-Code geschützt werden?", en: "Can QR access be protected?" }, answer: { de: "Ja. Du steuerst die Sichtbarkeit und kannst statt öffentlicher Freigaben geschützte Links einsetzen.", en: "Yes. You control visibility and can use protected links instead of public sharing." } },
      { question: { de: "Eignet sich das für Unternehmen?", en: "Is this suitable for businesses?" }, answer: { de: "Ja. Teams können Inventar Kunden, Standorten und Zuständigkeiten zuordnen und Serviceabläufe daran anschließen.", en: "Yes. Teams can assign inventory to customers, locations and responsibilities and connect it to service workflows." } },
    ],
  },
  {
    slug: "wartungsplan-digital",
    eyebrow: { de: "DIGITALER WARTUNGSPLAN", en: "DIGITAL MAINTENANCE PLAN" },
    title: { de: "Wartungen, Prüfungen und Fristen zuverlässig organisieren", en: "Organise maintenance, inspections and deadlines reliably" },
    description: { de: "Digitaler Wartungsplan für Geräte und Anlagen: Termine, Nachweise, Historie und Erinnerungen übersichtlich verwalten.", en: "A digital maintenance plan for equipment and systems with schedules, records, history and reminders." },
    intro: { de: "Wiederkehrende Wartungen funktionieren besser, wenn Termin, Objekt und Nachweis zusammengehören. NavoPass verbindet anstehende Fristen mit der bisherigen Historie und den zugehörigen Dokumenten.", en: "Recurring maintenance works best when the date, asset and evidence stay together. NavoPass connects upcoming deadlines with the previous history and related documents." },
    benefits: [
      { de: "Wartungs- und Garantiefristen je Objekt erfassen", en: "Track maintenance and warranty deadlines per asset" },
      { de: "Kalenderexport und Erinnerungen für anstehende Termine", en: "Use calendar export and reminders for upcoming dates" },
      { de: "Durchgeführte Arbeiten und Dokumente chronologisch sichern", en: "Store completed work and documents chronologically" },
      { de: "Zuständigkeiten im Haushalt oder Team transparent halten", en: "Keep responsibilities transparent across households or teams" },
    ],
    steps: [
      { title: { de: "Intervall festlegen", en: "Set the interval" }, text: { de: "Herstellerangabe, gesetzliche Prüfung oder eigenen Rhythmus als Termin erfassen.", en: "Record the manufacturer interval, statutory inspection or your own schedule." } },
      { title: { de: "Verantwortung klären", en: "Assign responsibility" }, text: { de: "Objekt und Aufgabe dem richtigen Bereich oder Team zuordnen.", en: "Assign the asset and task to the correct workspace or team." } },
      { title: { de: "Durchführung dokumentieren", en: "Document completion" }, text: { de: "Arbeiten, Messwerte, Material und Nachweise direkt am Objekt speichern.", en: "Store work, readings, materials and evidence directly with the asset." } },
      { title: { de: "Folgetermin planen", en: "Plan the next date" }, text: { de: "Nach dem Abschluss die nächste Fälligkeit setzen und im Kalender behalten.", en: "After completion, set the next due date and keep it in the calendar." } },
    ],
    faq: [
      { question: { de: "Ersetzt NavoPass eine fachliche Prüfung?", en: "Does NavoPass replace a professional inspection?" }, answer: { de: "Nein. NavoPass organisiert Termine und Nachweise; vorgeschriebene Arbeiten müssen weiterhin von geeigneten Fachpersonen durchgeführt werden.", en: "No. NavoPass organises dates and evidence; required work must still be completed by qualified professionals." } },
      { question: { de: "Kann ich Termine exportieren?", en: "Can I export dates?" }, answer: { de: "Ja. Relevante Fristen können als Kalendereinträge genutzt werden.", en: "Yes. Relevant deadlines can be used as calendar entries." } },
      { question: { de: "Bleibt die alte Wartung sichtbar?", en: "Does previous maintenance remain visible?" }, answer: { de: "Ja. Neue Ereignisse ergänzen die chronologische Historie des jeweiligen Objektpasses.", en: "Yes. New events extend the chronological history of the relevant asset pass." } },
    ],
  },
  {
    slug: "servicebericht-digital-erstellen",
    eyebrow: { de: "DIGITALER SERVICEBERICHT", en: "DIGITAL SERVICE REPORT" },
    title: { de: "Serviceberichte vor Ort erfassen und nachvollziehbar teilen", en: "Create service reports on site and share them securely" },
    description: { de: "Digitale Serviceberichte mit Arbeiten, Material, Messwerten, Feststellungen, Kundenbestätigung und PDF-Ausgabe erstellen.", en: "Create digital service reports with work, materials, readings, findings, customer confirmation and PDF output." },
    intro: { de: "Ein guter Servicebericht zeigt verständlich, was beauftragt, geprüft und durchgeführt wurde. NavoPass verbindet den Einsatz mit Kunde, Standort und Objekt, damit Bericht und technische Historie nicht getrennt voneinander bleiben.", en: "A good service report clearly records what was requested, inspected and completed. NavoPass connects each job to the customer, location and asset so the report and technical history stay together." },
    benefits: [
      { de: "Auftrag, Priorität, Termin und Mitarbeiter zuordnen", en: "Assign job, priority, appointment and team member" },
      { de: "Arbeiten, Material, Messwerte und Prüfergebnisse erfassen", en: "Record work, materials, readings and inspection results" },
      { de: "Feststellungen und Empfehlungen sauber dokumentieren", en: "Document findings and recommendations clearly" },
      { de: "PDF-Druckansicht und geschützten Kundenlink bereitstellen", en: "Provide a printable PDF view and protected customer link" },
    ],
    steps: [
      { title: { de: "Einsatz vorbereiten", en: "Prepare the job" }, text: { de: "Kunde, Standort, Objekt, Termin und zuständige Person miteinander verknüpfen.", en: "Connect the customer, location, asset, appointment and responsible person." } },
      { title: { de: "Leistung erfassen", en: "Record the service" }, text: { de: "Durchgeführte Arbeiten, Zeiten, Material und technische Werte eintragen.", en: "Enter completed work, time, materials and technical readings." } },
      { title: { de: "Ergebnis bestätigen", en: "Confirm the result" }, text: { de: "Feststellungen, Empfehlungen und Kundenbestätigung nachvollziehbar sichern.", en: "Capture findings, recommendations and customer confirmation." } },
      { title: { de: "Bericht ausgeben", en: "Issue the report" }, text: { de: "Den fertigen Bericht drucken, als PDF nutzen oder geschützt teilen.", en: "Print the completed report, use it as a PDF or share it securely." } },
    ],
    faq: [
      { question: { de: "Für welche Branchen eignet sich der Servicebericht?", en: "Which industries can use the service report?" }, answer: { de: "Für Handwerk, technischen Service, Wartung, Prüfung, Geräte- oder Fahrzeugservice und andere Außendienstprozesse.", en: "Trades, technical service, maintenance, inspections, equipment or vehicle service and other field operations." } },
      { question: { de: "Kann der Kunde den Bericht öffnen?", en: "Can the customer open the report?" }, answer: { de: "Ja. Fertige Berichte können über einen geschützten Link bereitgestellt werden.", en: "Yes. Completed reports can be provided through a protected link." } },
      { question: { de: "Ist der Bericht mit dem Objekt verbunden?", en: "Is the report connected to the asset?" }, answer: { de: "Ja. Der Einsatz bleibt Teil der nachvollziehbaren Objekt- und Servicehistorie.", en: "Yes. The job remains part of the traceable asset and service history." } },
    ],
  },
];

export function getSeoGuide(slug: string) {
  return seoGuides.find((guide) => guide.slug === slug);
}
