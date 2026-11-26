# Flowboard

A Kanban task board for small teams, built with React, TypeScript, Tailwind CSS, dnd-kit and Supabase.

Every visitor gets a private guest account automatically (Supabase anonymous sign-in), and Row Level Security makes sure each guest only ever sees their own data.

## Features

- **Board** with four columns (To Do, In Progress, In Review, Done) and smooth drag-and-drop with mouse, touch, or keyboard (Space to pick up, arrows to move, Space to drop).
- **Tasks** with title, description, priority, due date, assignees and labels.
- **Team members** with colored avatars; assign several people to one task.
- **Labels** such as Bug or Feature; create them inline while tagging a task.
- **Comments** on each task, in a separate `comments` table.
- **Activity log** written by database triggers, e.g. “Moved from To Do → In Progress · 2 hours ago”.
- **Due-date indicators**: overdue, due today, and due soon badges on cards.
- **Search and filters** by title, priority, assignee and label.
- **Board overview**: total, done and overdue counts with a completion bar.
- Loading skeletons, empty states, error states with retry, toasts, dark mode, and a responsive layout.

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer and a free [Supabase](https://supabase.com) project.

1. **Set up the database.** In the Supabase dashboard open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
2. **Turn on guest sign-in.** Go to **Authentication → Sign In / Providers** and enable **Allow anonymous sign-ins**.
3. **Add your keys.** Copy `.env.example` to `.env` and fill in the project URL and the **anon / publishable** key from **Project Settings → API**. Never use the service role key.
4. **Install and start:**

   ```bash
   npm install
   npm run dev
   ```

   Then open http://localhost:5173.

## Scripts

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the development server with hot reload. |
| `npm run build`   | Type-check and build for production (`dist`). |
| `npm run preview` | Serve the production build locally.           |
| `npm run lint`    | Check the code with oxlint.                   |

## Project structure

```
supabase/schema.sql      Tables, Row Level Security policies, activity triggers
src/lib/                 Supabase client, data access (api.ts), types, helpers
src/hooks/               Guest session, board state with optimistic updates, toasts
src/components/board/    Board (drag-and-drop), Column, TaskCard
src/components/task/     New-task modal, task detail panel, activity feed
src/components/layout/   Sidebar, toolbar, loading / error / empty screens
src/components/ui/       Small shared pieces: avatars, badges, popovers, dialogs
```
