# Modern Todo Dashboard (Vanilla JS)

[한국어](README.md) | [English](README.en.md) | [日本語](README.ja.md)

A todo dashboard built with `HTML + CSS + Vanilla JavaScript`.  
It focuses on user-specific todo storage, real-time clock, rotating backgrounds, and location-based weather in one screen.

## Core Features

### 1) User Login & Access Control
- Sign in with a name (2-20 chars) and store it in `localStorage`
- Restore login state automatically on revisit
- Lock todo input/filter/actions before login
- Switch users via the `Change user` button
- Show/hide greeting and background shuffle button based on auth state

### 2) Todo Management
- Add tasks, toggle done/active, and delete tasks
- Inline edit support (`Enter` to save, `Escape` to cancel)
- Duplicate prevention (case-insensitive) and whitespace normalization
- Input length limit (max 80 chars)
- Filters: `All` / `Active` / `Done`
- Bulk remove completed tasks with `Clear completed`
- Reorder `Active` todos using drag and drop
- Summary counts: `active · done · total`

### 3) Per-User Data Storage
- Separate todo storage keys per user
- Storage key: `todo.items:<normalized_username>`
- One-time migration from legacy `todo.items` on first login
- Main `localStorage` keys
  - `todo.username`
  - `todo.items:<username>`
  - `todo.lastBg`

### 4) Background System
- Random selection from dark/light texture image pools
- Random background applied on app start
- Auto-rotation every 2 minutes
- Immediate change with `Shuffle background`
- Crossfade transition using two layers
- Auto UI class switch by background tone (light/dark)

### 5) Clock, Date, and Greeting
- Real-time clock (updates every second)
- Date display (`ko-KR` format)
- Time-based greeting message
  - morning / afternoon / evening / night

### 6) Location-Based Weather
- Get current location via Geolocation
- Fetch weather from OpenWeather API (Celsius, Korean description)
- Auto refresh every 10 minutes
- Show fallback messages for permission/network/API failures

### 7) Module Load Failure Fallback
- Keeps basic login form behavior even if module script fails
- Allows minimum username save and reload path

## Run

1. Open `index.html` directly in your browser
2. Allow location permission when prompted (for weather feature)
