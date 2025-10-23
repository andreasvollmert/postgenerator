# Supabase Integration Setup Guide

Diese Anleitung zeigt dir, wie du die Supabase-Datenbankintegration für deine AI Content Platform einrichtest, um generierte Posts automatisch in deine Lovable Supabase-Datenbank zu exportieren.

## 🎯 Was ist Supabase?

Supabase ist eine Open-Source Alternative zu Firebase und bietet:
- PostgreSQL Datenbank
- Echtzeit-Subscriptions
- Authentication
- Storage
- Edge Functions

Lovable nutzt Supabase als Backend-Datenbank.

## 📋 Voraussetzungen

1. Ein Supabase-Projekt (kostenlos bei [supabase.com](https://supabase.com))
2. Zugriff auf dein Supabase-Dashboard
3. Die AI Content Platform lokal installiert

## 🛠️ Setup-Schritte

### 1. Supabase-Projekt erstellen

Falls noch nicht vorhanden:

1. Gehe zu [supabase.com](https://supabase.com)
2. Klicke auf "Start your project"
3. Erstelle ein neues Projekt
4. Notiere dir:
   - **Project URL** (z.B. `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (unter Settings → API)

### 2. Datenbank-Tabelle erstellen

Führe dieses SQL im Supabase SQL Editor aus:

```sql
-- Erstelle die posts Tabelle
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    html_content TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    permalink TEXT,
    inputs JSONB,
    schema JSONB,
    image_url TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- Erstelle Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder kann Posts lesen (für Development)
CREATE POLICY "Posts sind öffentlich lesbar" ON public.posts
    FOR SELECT
    USING (true);

-- Policy: Jeder kann Posts erstellen (für Development)
CREATE POLICY "Jeder kann Posts erstellen" ON public.posts
    FOR INSERT
    WITH CHECK (true);

-- Policy: Nur eigene Posts bearbeiten (wenn Authentication aktiviert)
CREATE POLICY "Nur eigene Posts bearbeiten" ON public.posts
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Nur eigene Posts löschen (wenn Authentication aktiviert)
CREATE POLICY "Nur eigene Posts löschen" ON public.posts
    FOR DELETE
    USING (auth.uid() = user_id);
```

**Hinweis:** Für Production solltest du die Policies anpassen und nur authentifizierten Benutzern Zugriff geben!

### 3. Umgebungsvariablen konfigurieren

Öffne die `.env.local` Datei und füge deine Supabase-Credentials ein:

```bash
# Supabase Database (Lovable Integration)
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key-hier
```

**Wichtig:**
- Die URLs haben das Präfix `VITE_` damit Vite sie ins Frontend einbettet
- Verwende den **Anon/Public Key**, nicht den Service Role Key
- Den Anon Key findest du unter: Settings → API → Project API keys → `anon` / `public`

### 4. Anwendung neu starten

```bash
# Dev Server stoppen (Ctrl+C)
npm run dev
```

Die Anwendung lädt automatisch die neuen Umgebungsvariablen.

## 🚀 Verwendung

### Content generieren und speichern

1. **Content generieren:**
   - Öffne die Anwendung: `http://localhost:3000`
   - Gib ein Thema ein und klicke auf "Generieren"
   - Warte bis der Content generiert wurde

2. **In Supabase speichern:**
   - Im Output-Bereich findest du den Button: **"🗄️ In Datenbank speichern (Supabase)"**
   - Klicke darauf
   - Eine Erfolgsmeldung zeigt die gespeicherte Post-ID

3. **Gespeicherte Posts ansehen:**
   - Öffne das Supabase Dashboard
   - Gehe zu Table Editor → `posts`
   - Alle generierten Posts sind dort aufgelistet

### Was wird gespeichert?

Für jeden generierten Post wird gespeichert:

| Feld | Beschreibung |
|------|--------------|
| `id` | UUID (automatisch generiert) |
| `title` | Thema/Titel des Artikels |
| `content` | Markdown-Version des Contents |
| `html_content` | HTML-Version des Contents |
| `meta_title` | SEO Meta-Titel |
| `meta_description` | SEO Meta-Beschreibung |
| `permalink` | URL-freundlicher Slug |
| `inputs` | Alle Input-Parameter (Sprache, Länge, Tonfall, etc.) |
| `schema` | Schema Markup (future) |
| `image_url` | URL zum Titelbild (future) |
| `created_at` | Erstellungsdatum |
| `updated_at` | Letztes Update |
| `user_id` | Benutzer-ID (null für anonyme Posts) |

## 🔌 Integration mit Lovable

### Wenn du Lovable verwendest:

1. **Gleiche Supabase-Projekt verwenden:**
   - Verwende das gleiche Supabase-Projekt wie in deinem Lovable-Projekt
   - Die `posts` Tabelle wird dann in beiden Apps verfügbar sein

2. **In Lovable auf Posts zugreifen:**

```typescript
// In deiner Lovable-App (React/TypeScript)
import { supabase } from './lib/supabase'

// Posts laden
const { data: posts, error } = await supabase
  .from('posts')
  .select('*')
  .order('created_at', { ascending: false })

// Post anzeigen
posts?.map(post => ({
  id: post.id,
  title: post.title,
  content: post.html_content, // oder post.content für Markdown
  createdAt: post.created_at
}))
```

3. **Post-Details anzeigen:**

```typescript
// Einzelnen Post laden
const { data: post, error } = await supabase
  .from('posts')
  .select('*')
  .eq('id', postId)
  .single()
```

## 🔒 Sicherheit

### Development vs. Production

**Development (aktuell):**
- Jeder kann Posts lesen und erstellen
- Keine Authentifizierung erforderlich
- Gut für lokale Tests

**Production (empfohlen):**

```sql
-- Policies für Production (nach Supabase Auth Integration)

-- Nur authentifizierte Benutzer können Posts erstellen
DROP POLICY IF EXISTS "Jeder kann Posts erstellen" ON public.posts;
CREATE POLICY "Nur authentifizierte Benutzer können Posts erstellen" ON public.posts
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Posts sind öffentlich lesbar (oder auch einschränken)
-- Bestehende Policy kann bleiben oder angepasst werden
```

### API-Keys Sicherheit

⚠️ **Wichtig:**
- Der **Anon Key** ist im Frontend sichtbar und darf öffentlich sein
- Verwende **NIEMALS** den Service Role Key im Frontend
- Row Level Security (RLS) schützt deine Daten
- Für Production: Aktiviere Supabase Auth

## 🐛 Troubleshooting

### "Supabase ist nicht konfiguriert!"

**Problem:** Der Button funktioniert nicht, Fehlermeldung im UI

**Lösung:**
```bash
# 1. Prüfe .env.local
cat .env.local | grep VITE_SUPABASE

# 2. Stelle sicher, dass beide Variablen gesetzt sind
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...

# 3. Dev Server neu starten
npm run dev
```

### "Insert failed" / "permission denied"

**Problem:** Beim Speichern gibt es einen Permissions-Fehler

**Lösung:**
```sql
-- Prüfe ob RLS aktiviert ist
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'posts';

-- Prüfe ob Policies existieren
SELECT * FROM pg_policies WHERE tablename = 'posts';

-- Falls keine Policies: Führe das SQL aus Schritt 2 erneut aus
```

### "Table 'posts' does not exist"

**Problem:** Die Tabelle wurde nicht erstellt

**Lösung:**
1. Gehe zu Supabase Dashboard → SQL Editor
2. Führe das CREATE TABLE SQL aus (siehe Schritt 2)
3. Klicke auf "Run" (grüner Play-Button)

### Netzwerkfehler / CORS

**Problem:** Kann nicht zu Supabase verbinden

**Lösung:**
- Prüfe ob die SUPABASE_URL korrekt ist
- Stelle sicher, dass du `https://` im URL hast
- Prüfe ob dein Supabase-Projekt aktiv ist (nicht pausiert)

## 📊 Datenbank-Schema erweitern

Du kannst die Tabelle beliebig erweitern:

```sql
-- Füge neue Spalten hinzu
ALTER TABLE public.posts
ADD COLUMN seo_score INTEGER,
ADD COLUMN tags TEXT[],
ADD COLUMN category TEXT;

-- Erstelle zusätzliche Tabellen
CREATE TABLE public.post_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎓 Nächste Schritte

1. **Authentication hinzufügen:**
   - Implementiere Supabase Auth in der App
   - Setze `user_id` beim Speichern
   - Passe RLS Policies an

2. **Post-Verwaltung:**
   - Implementiere `loadPostsFromSupabase()` UI
   - Zeige gespeicherte Posts in der App
   - Ermögliche Bearbeiten/Löschen

3. **Erweiterte Features:**
   - Versionierung von Posts
   - Kategorien und Tags
   - Volltext-Suche mit PostgreSQL
   - Analytics und Tracking

## 📚 Weitere Ressourcen

- [Supabase Dokumentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [Lovable Documentation](https://lovable.dev)

## ✅ Checklist

- [ ] Supabase-Projekt erstellt
- [ ] Project URL und Anon Key kopiert
- [ ] SQL für `posts` Tabelle ausgeführt
- [ ] `.env.local` mit Credentials aktualisiert
- [ ] Dev Server neu gestartet
- [ ] Content generiert
- [ ] "In Datenbank speichern" erfolgreich getestet
- [ ] Posts im Supabase Dashboard sichtbar

---

**Viel Erfolg mit deiner Supabase-Integration!** 🚀

Bei Fragen oder Problemen, schau in die Supabase Dokumentation oder frage mich! 😊
