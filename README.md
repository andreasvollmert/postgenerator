<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Content Platform - Postgenerator

Eine leistungsstarke AI-gestützte Content-Plattform für die Erstellung von Blog-Artikeln, SEO-Content und mehr mit Google Gemini AI und Supabase-Integration.

View your app in AI Studio: https://ai.studio/apps/drive/16hmELX_pCM5lf_Dqq1Llfrw9HrNu0INV

## 🚀 Features

- ✅ **Google Gemini AI Integration** - Hochwertige Content-Generierung
- ✅ **Supabase Database** - Speichere generierte Posts in der Cloud
- ✅ **Export-Funktionen** - Markdown, HTML, PDF Export
- ✅ **Dark/Light Mode** - Anpassbare UI
- ✅ **SEO-Optimierung** - Meta-Titel, Beschreibungen, Permalinks
- ✅ **Anpassbare Einstellungen** - Sprache, Länge, Tonfall, Struktur
- ✅ **Sichere Authentifizierung** - Passwort-geschützte Platform

## 📋 Voraussetzungen

- Node.js (v18 oder höher)
- npm oder yarn
- Google Gemini API Key ([hier erhalten](https://makersuite.google.com/app/apikey))
- Optional: Supabase Account ([kostenlos registrieren](https://supabase.com))

## 🛠️ Installation

1. **Repository klonen:**
   ```bash
   git clone <your-repo-url>
   cd postgenerator
   ```

2. **Dependencies installieren:**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen konfigurieren:**

   Bearbeite die `.env.local` Datei:
   ```bash
   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key_here

   # Supabase (Optional - für Datenbank-Integration)
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Site Security
   SITE_PASSWORD=your_secure_password
   ```

4. **Development Server starten:**
   ```bash
   npm run dev
   ```

   Die App läuft auf: `http://localhost:3000`

## 🗄️ Supabase Integration (Optional)

Die Plattform bietet eine vollständige Supabase-Integration zum Speichern generierter Posts.

**Setup:**
1. Folge der detaillierten Anleitung: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
2. Erstelle ein Supabase-Projekt
3. Führe das SQL-Schema aus (siehe Dokumentation)
4. Konfiguriere `.env.local` mit deinen Credentials

**Features:**
- Speichere generierte Posts in der Cloud
- Automatische Metadaten-Erfassung
- Versionierung und History
- Integration mit Lovable-Projekten

## 📦 Build für Production

```bash
# Production Build erstellen
npm run build

# Build lokal testen
npm run preview
```

Die Build-Dateien werden im `/dist` Ordner erstellt.

## 🚀 Deployment

### Vercel (empfohlen)

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run deploy
```

### Andere Plattformen

Jeder statische Hosting-Anbieter funktioniert:
- GitHub Pages
- CloudFlare Pages
- AWS S3 + CloudFront
- Eigener VPS/Server

## 📚 Verwendung

1. **Login:** Nutze das Passwort aus `.env.local`
2. **Content erstellen:**
   - Gib dein Thema ein
   - Wähle Sprache, Länge, Tonfall
   - Klicke auf "Generieren"
3. **Exportieren:**
   - Als Markdown (.md)
   - Als HTML (.html)
   - Als PDF (.pdf)
   - In Supabase Datenbank

## 🔒 Sicherheit

⚠️ **Wichtig für lokale Nutzung:**
- API-Keys sind im Frontend sichtbar
- Nur für persönlichen Gebrauch geeignet
- Für Production: Backend-API implementieren

**Für Production:**
- Verschiebe API-Keys auf Backend-Server
- Implementiere Supabase Authentication
- Aktiviere Row Level Security (RLS)
- Rate Limiting hinzufügen

## 🐛 Troubleshooting

### "GEMINI_API_KEY ist nicht konfiguriert"
- Stelle sicher, dass `.env.local` existiert
- Prüfe ob der API-Key korrekt ist
- Starte den Dev Server neu

### "Supabase ist nicht konfiguriert"
- Siehe [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- Prüfe ob beide `VITE_SUPABASE_*` Variablen gesetzt sind

### Dependencies-Fehler
```bash
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contributing

Contributions sind willkommen! Bitte erstelle einen Pull Request.

## 📄 License

MIT License - siehe LICENSE Datei

## 👨‍💻 Support

Bei Fragen oder Problemen:
- Erstelle ein Issue auf GitHub
- Siehe die Dokumentation: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- Kontaktiere den Maintainer

---

**Erstellt mit [Claude Code](https://claude.com/claude-code) & [Google Gemini AI](https://ai.google.dev/)**
