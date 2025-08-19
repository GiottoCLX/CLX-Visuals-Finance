# CLX Finance – Final
Einfaches, schnelles Finanz-Dashboard mit Supabase.

## Setup
1. Öffne Supabase → SQL → führe `schema.sql` aus.
2. Trage in `config.js` **Project URL** und **Publishable Key** (API Keys → *API Keys* → *Publishable key*) ein.
3. Lade den Ordner z. B. via **GitHub Pages**, **Vercel** oder **Netlify** hoch.
4. Seite öffnen → registrieren/anmelden → Konten/Kategorien/Buchungen nutzen.

## Features
- Auth (E-Mail/Passwort)
- Konten & Kategorien
- Transaktionen mit Import/Export (CSV)
- Filter (Monat, Konto, Kategorie, Suche, Quick-Chips)
- KPIs + Charts (Chart.js)
- Budgets (Monat/Kategorie)
- Wiederkehrende Transaktionen (monatlich/wöchentlich)
- Mobile Drawer, Dark-Mode, Performance optimiert

## Sicherheit
- Vollständige RLS-Policies, Daten pro Nutzer getrennt
- Client nutzt nur den **Publishable** Key
