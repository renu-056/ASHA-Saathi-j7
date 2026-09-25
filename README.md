# ASHA Saathi

A mobile-first community health dashboard for ASHA (Accredited Social Health Activist) workers in India. It supports voice-guided patient intake, automatic risk flagging, and printable handover summaries.

## Features

- **Voice Visit Recording**: Uses the Web Speech API (English and Hindi) with a live transcript and highlighted entities (name, age, symptoms).
- **Auto-Extraction**: Pulls patient name, age, gender and symptoms from speech into an editable verification form.
- **Manual Entry**: A stable form for when voice isn't available. Space, Enter and Tab never close the modal.
- **Dynamic Risk Rules**: A patient is flagged High-Risk when:
  - the last checkup was more than 28 days ago,
  - symptoms mention "high fever", "high BP", "chest pain" or "severe", or
  - the worker manually toggles High-Risk.
- **Dashboard**: Shows Today's Visits and Pending Follow-ups counters, search, and All / High-Risk / Normal filter pills.
- **Patient Detail & Print Export**: A clean, printable summary formatted for doctor and hospital handovers.
- **Hybrid Persistence**: Uses a Zustand store synced with the Supabase `patients` table and backed up to `localStorage` (`asha_saathi_patients`), so it works on slow or offline networks.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, Lucide React icons
- Zustand for global state
- Supabase (`@supabase/supabase-js`)

## Database Schema

Table: `patients`

| Column              | Type    |
| ------------------- | ------- |
| `name`              | text    |
| `age`               | int8    |
| `symptoms`          | text    |
| `last_checkup_date` | date    |
| `risk_flag`         | boolean |

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xmseivpecwoohteufpav.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/                 Layout, global styles, entry page
components/asha/     Dashboard, records, reports, settings, modals, nav
lib/store.ts         Zustand store + Supabase / localStorage sync
lib/patients.ts      Patient types, risk rules, sample data
lib/extract.ts       Speech transcript entity extraction
lib/supabase.ts      Supabase client
```

## Browser Support

Voice recording needs a browser with the Web Speech API, such as Chrome, Edge, or Safari. In other browsers the app falls back to manual entry.
