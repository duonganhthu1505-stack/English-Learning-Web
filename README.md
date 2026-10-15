# English-Learning-Web

Responsive English-learning app with TOEIC/IELTS level paths, five-question lessons, browser pronunciation, personal-content analysis, and progress tracking.

## Run locally

This app loads `lessons.json`, so serve the repository over HTTP instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Features

- 700 starter lessons grouped into five approximate difficulty bands for each track: **TOEIC 500–900** and **IELTS 4.0–8.0**.
- At least five multiple-choice questions per lesson. Existing questions are kept; additional vocabulary checks are generated from each lesson's words.
- Search/filter within a level, completion status, best scores, and a daily study streak.
- Browser-based pronunciation with the Web Speech API.
- Add your own English text: the browser splits sentences, extracts likely vocabulary, recognizes common patterns (including active/passive present continuous), suggests a level, and creates practice questions. The vocabulary translations are editable; unknown words need your own translation.
- Progress and added lessons are stored locally first. Cross-device cloud sync is available after configuring a Supabase project; setup is below and in the app's **☁ Sync** panel.
- Responsive layout for desktop and mobile.

### About level assignment and content analysis

The built-in lessons did not include exam-band metadata, so their TOEIC/IELTS bands are estimated from each lesson's title and grammar topic. These are learning-path groupings, not official score predictions. Personal-content analysis is rule-based and runs in your browser; it does not call an AI service or automatically translate every possible word. You can edit extracted translations before saving the lesson.

## Enable cross-device sync with Supabase

GitHub Pages and a browser's `localStorage` cannot share progress between devices by themselves. The app can sync automatically through a Supabase project you control. Each device must use the same Project URL, public anon/publishable key, and private sync code.

1. Create a Supabase project and open its **SQL Editor**.
2. Run this SQL to create a small progress table protected by the private sync code:

```sql
create table if not exists public.english_learning_progress (
  sync_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.english_learning_progress enable row level security;
grant select, insert, update on public.english_learning_progress to anon;

drop policy if exists "sync by private code" on public.english_learning_progress;
create policy "sync by private code"
on public.english_learning_progress
for all to anon
-- The app sends its private sync code in the standard x-client-info header.
using (
  sync_id = (coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'x-client-info')
)
with check (
  sync_id = (coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'x-client-info')
);
```

3. In Supabase, copy the project's **Project URL** and its public **anon/publishable key** (never use `service_role`).
4. In Daily English, open **☁ Sync**, enter the URL and key, and generate a long random sync code. Keep the code private.
5. On your other device/browser, enter the same URL, public key, and sync code. The app pulls and merges progress when opened or brought back into focus, and syncs after lessons, known-word changes, and custom lessons.

The sync code is a bearer secret: anyone who has it can read or modify the matching progress record. Supabase stores progress, scores, known words, and personal lessons in your project. The text-analysis feature itself runs locally.

## Publish with GitHub Pages

1. Open the repository's **Settings**.
2. Select **Pages** in the sidebar.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then click **Save**.
5. Wait for the deployment and open the URL shown in Settings → Pages.

Available pronunciation voices depend on the browser and operating system.
