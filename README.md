# LUNA · EDV Hausleitner

**Planung · Konstruktion · Produktion · Service**

[Live desktop](https://martin-hausleitner.github.io/Luna-Korpus/) · [Single HTML](Luna-Korpus.html) · [Portable LUNA theme](Luna.astertheme) · [App provenance](app-mapping.json)

> **Produktname: LUNA.** Der Repository-Name `Luna-Korpus` und die Datei `Luna-Korpus.html` bleiben aus Kompatibilitäts- und QA-Gründen bestehen. „Korpus“ ist im Produkt nur mehr der Formalyth-Werkzeugname, nicht der Name des Desktops.

## DE · Was ist LUNA?

LUNA ist ein moderner EDV-Hausleitner-Arbeitsplatz auf dem **echten Aster Desktop**. Aster bleibt Betriebsschicht, Window Manager, Taskbar, Start, Snap, Alt+Tab, Explorer, Kalender und App Center. LUNA ergänzt ausschließlich Branding, Windows-Profil, deutsche Launcher-Namen, Desktop-/Start-Belegung und die geprüfte Einbindung der Originalprogramme.

Der aktuelle Arbeitsplatz verwendet ein ruhiges Navy/Graphit-Branding mit Hausleitner-Blau, **30 Desktop-Launcher**, **24 gruppierte Start-Pins** und die Gruppen **Büro · Projekt · Werkstatt · IT & Service**. Die 19 lokal gebündelten Anwendungen sind weiterhin die verifizierten Originaldateien ihrer Upstream-Repositories; ihre App-Oberflächen werden von LUNA nicht neu implementiert.

### Architektur

- Real Aster source in `aster/`
- 19 SHA-256-geprüfte Original-Apps in `Apps/`
- vollständiger Aster App Center / Web-App-Katalog bleibt erreichbar
- LUNA v2 Integration: `aster/src/luna-modern.js`
- Chrome-only Premium Skin: `aster/src/luna.css`
- Portable Theme: `Luna.astertheme`
- Single-file Pages build: `Luna-Korpus.html` = `index.html`
- kein npm/CDN-Laufzeitzwang für die 19 lokal gebündelten Editionen

### Desktop – aktueller Fokus

**Büro:** Explorer, TwinForge, Gridline, MeridianOffice, Quire, Folio, FolioPro, NotepadXP, Notepad, Calculator, Velsign.  
**Projekt:** MeridianPlan, Calendar, Veyra Workspace, PlanforgeReview, LatticeAnalytics, AxiomWorksheet.  
**Werkstatt:** Draftline, KestrelCAD, Formalyth, StrataForge, Avolith Studio, Orivane.  
**IT & Service:** Orbit Browser, App Center, Code Studio, Terminal, Task Manager, Win32 Lab, Settings.

### Originalprogramme

| LUNA-Name | Original | Repository |
|---|---|---|
| Tabelle | Gridline | https://github.com/wieslawsoltes/Gridline |
| Planung | MeridianPlan | https://github.com/wieslawsoltes/MeridianPlan |
| Office | MeridianOffice | https://github.com/wieslawsoltes/MeridianOffice |
| Dateien | TwinForge | https://github.com/wieslawsoltes/TwinForge |
| Akte | Folio | https://github.com/wieslawsoltes/Folio |
| PDF | FolioPro | https://github.com/wieslawsoltes/FolioPro |
| Mail | Quire | https://github.com/wieslawsoltes/Quire |
| Text | NotepadXP | https://github.com/wieslawsoltes/NotepadXP |
| Auswertung | LatticeAnalytics | https://github.com/wieslawsoltes/LatticeAnalytics |
| Kalkulation | AxiomWorksheet | https://github.com/wieslawsoltes/AxiomWorksheet |
| Zeichnung | Draftline | https://github.com/wieslawsoltes/Draftline |
| CAD | KestrelCAD | https://github.com/wieslawsoltes/KestrelCAD |
| Aufmaß | PlanforgeReview | https://github.com/wieslawsoltes/PlanforgeReview |
| Tafel | Orivane | https://github.com/wieslawsoltes/Orivane |
| Team | Veyra Workspace | https://github.com/wieslawsoltes/VeyraWorkspace |
| Signatur | Velsign | https://github.com/wieslawsoltes/Velsign |
| Korpus | Formalyth | https://github.com/wieslawsoltes/Formalyth |
| Material | StrataForge | https://github.com/wieslawsoltes/StrataForge |
| 3D | Avolith Studio | https://github.com/wieslawsoltes/AvolithStudio |

### Build & Prüfung

```sh
python3 build.py
python3 qa/verify.py
```

`qa/verify.py` prüft die Original-App-Hashes, modularen Asset-Manifeste, den unveränderten Aster-Builder sowie geschützte Aster-Kernteile. GitHub Actions baut anschließend dieselbe Single-HTML-Datei für Pages.

### Theme importieren

In stock Aster: **Settings → Personalization → Themes → Import theme** und `Luna.astertheme` auswählen. Das Theme überträgt die unterstützten Farben/Windows-Chrome-Einstellungen; die komplette EDV-Hausleitner-Desktopbelegung ist Teil des LUNA-Builds.

### Grenzen

LUNA ist **keine lizenzierte WAWI** und ersetzt keine bestehende Warenwirtschaft. Formalyth bleibt Formalyth, Gridline bleibt Gridline, und die Launcher-Bezeichnungen behaupten keine zusätzliche Fachfunktion. Quire ist im geprüften Upstream ein Dokumenteditor; die Bezeichnung „Mail“ fügt keine echte Mail-Infrastruktur hinzu. Backend-, Account- oder Kollaborationsfunktionen einzelner Programme benötigen weiterhin deren reale Dienste und Konfiguration.

LUNA ist ein inoffizielles Theme/Desktop-Projekt und keine offizielle Produktfreigabe der EDV Hausleitner GmbH, sofern diese nicht ausdrücklich erfolgt. Aster und alle Anwendungen gehören ihren jeweiligen Upstream-Projekten. Originalhinweise und Lizenzdateien bleiben erhalten; insbesondere wird für Folio und Velsign **keine pauschale MIT-Neulizenzierung** behauptet.

---

## EN · Summary

LUNA is an unofficial EDV Hausleitner workspace built **on the real Aster Desktop**, not a replacement operating system or rewritten shell. It adds premium branding, German launcher metadata, a curated joinery/office desktop layout and verified local packaging of 19 original upstream applications. The current layout exposes 30 desktop launchers and 24 grouped Start pins while retaining the complete Aster environment and catalog.

The repository/file name `Luna-Korpus` is retained for compatibility; the visible product name is **LUNA**. LUNA is not licensed WAWI. Application ownership and licenses remain with the respective upstream projects.

Aster credit: https://github.com/wieslawsoltes/Aster
