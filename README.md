# FoundIt — Smart Lost & Found Portal

A web application for managing a campus lost-and-found centre — reporting found items with a built-in ownership check, letting people search for what they've lost, and verifying claims before anything is handed back.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Security & Privacy](#security--privacy)
- [Intentionally Not Included](#intentionally-not-included)
- [Project Status](#project-status)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Background](#background)

---

## Overview

Most lost-and-found desks run on a notebook and memory: someone hands in a wallet, it sits in a drawer, and the owner finds out only by asking around or getting lucky. FoundIt digitizes that desk.

The twist is how it verifies a claim. Instead of just handing an item to whoever asks for it, or relying on an automatic photo/keyword match, **the person who logs the item in also writes one or more secret questions** — something only the real owner would know (*"What sticker is on the laptop lid?"*, *"What's the last four digits on the gift card inside?"*). Anyone claiming the item has to answer those questions, and a human admin makes the final call by comparing the submitted answers to the correct ones side by side. No algorithm decides who gets the item back — a person does, with the evidence in front of them.

## Key Features

**For everyone, once logged in**
- Secure registration and login (hashed passwords, session-based auth)
- Search the unclaimed inventory by keyword, category, or the date you lost your item
- View full item details — description, category, where and when it was found, a photo if one was attached — without ever seeing anyone else's private information

**For someone who lost something**
- Submit a claim on an item: answer its secret verification question(s) and explain why it's yours
- Track every claim you've made and its status — pending, approved, or rejected — with the admin's note once it's been reviewed
- Only one pending claim per item at a time, so duplicate submissions aren't possible

**For the lost-and-found admin**
- Log every item handed in, with a photo and one or more secret verification questions
- Edit an item's details, its secret questions, or replace its photo at any time (questions can't be changed once a claim has been made against them, to keep every claim's history meaningful)
- Delete items that turn out to be unclaimed mistakes — an item with a successful claim is kept permanently
- Review every claim with the submitted answers shown directly alongside the correct ones, filterable by status, so a decision is always an informed one
- Approve or reject a claim; approving marks the item "claimed" and automatically closes out any other pending claims on the same item
- See every registered user and a live dashboard of how many items are unclaimed/claimed and how many claims are pending/approved/rejected

## How It Works

1. Someone finds a lost item and hands it in at the lost-and-found centre — this part happens in person, outside the app.
2. An **admin** logs the item into FoundIt: a title, category, description, where and when it was found, an optional photo, and one or more secret questions only the real owner would know.
3. A **user** who's missing something searches the unclaimed inventory — by keyword, category, or the date they lost it — and finds a likely match.
4. They submit a **claim**: answering every one of the item's secret questions and writing a short note about why it's theirs.
5. The admin reviews the claim with the submitted answers next to the correct ones and decides — **approve or reject**. There's no automatic scoring; a person always makes the call.
6. If approved, the item is marked **claimed**, and any other pending claims on it are automatically rejected. If rejected, the claimant sees the admin's note (if one was left) and, if they really are the owner, can submit a new claim.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 (Vite), React Router, Bootstrap 5, axios |
| Backend | Node.js, Express 5, REST JSON API |
| Database | Microsoft SQL Server |
| ORM | Prisma |
| Authentication | Server-side session cookie (`express-session`), passwords hashed with bcrypt |
| File uploads | Multer (item photos, stored on disk) |
| Validation | zod |

This is a deliberate departure from a typical PHP/MySQL lost-and-found build — see [Background](#background) for why.

## Project Structure

```
foundIt/
  server/                  # the API
    prisma/schema.prisma   # the entire data model
    scripts/seed.js        # admin + sample data, runs automatically on startup
    src/
      routes/               # one file per feature: auth, items, search, claims, admin
      app.js, server.js, db.js, env.js, http.js
    uploads/                # item photos (not committed)
  client/                   # the web app
    src/
      pages/                # one file per screen
      components/           # shared UI (Navbar, ProtectedRoute)
      AuthContext.jsx, api.js
```

## API Overview

Every route lives under `/api/v1`. This is the shape of it — see [CLAUDE.md](CLAUDE.md) for the full, exact list.

| Group | Who can use it | What it does |
|---|---|---|
| `/auth` | Anyone / logged-in | Register, log in, log out, "who am I" |
| `/search` | Any logged-in user | Search and view **unclaimed** items only |
| `/items` | Admin only | Full item management — create, edit, delete, photo upload |
| `/claims` | Logged-in users + admin | Submit a claim, view your own claims; admin reviews and decides |
| `/admin` | Admin only | User list, dashboard counts |

## Security & Privacy

- Passwords are hashed with bcrypt — never stored or logged in plain text.
- Sessions use an HTTP-only cookie; there's no client-readable auth token.
- Every route is gated by role (`requireLogin` / `requireAdmin`), enforced on the server, not just hidden in the UI.
- A secret question's **answer** is never sent to a normal user or claimant — not in search results, not on the item page, not in a user's own claim history. Only an admin reviewing a claim sees the correct answer next to the submitted one.
- This is an educational project, not a hardened production system: there's no rate limiting, HTTPS enforcement, email verification, or password reset flow. See [Intentionally Not Included](#intentionally-not-included).

## Intentionally Not Included

Scoped out on purpose, to keep the project focused and buildable module by module:
- No automatic item-matching (keyword/AI-based suggestions linking lost reports to found ones) — a human admin and a searching user do that work
- No email/SMS notifications
- No in-app chat between the finder and the owner
- No automated test suite (verification was done by hand against the running app throughout)
- No Docker, CI/CD pipeline, or multi-environment setup

## Project Status

- **Backend**: complete — auth, item reporting, search, claims & verification, and admin extras.
- **Frontend**: login/registration, search & item detail, claim submission & history, and both admin screens for managing items and reviewing claims are built. The admin user-list/dashboard screen is the one remaining piece (the backend for it already exists).

## Getting Started

See **[SETUP.md](SETUP.md)** for step-by-step instructions — installing prerequisites (Node.js, SQL Server), running the backend and frontend, and logging in with the sample accounts that get seeded automatically.

## Documentation

- **[SETUP.md](SETUP.md)** — how to install and run this, from a clean machine.
- **[CLAUDE.md](CLAUDE.md)** — the full technical reference: every API route, the data model, business rules, and the conventions the codebase follows.

## Background

FoundIt began as a BCA mini-project synopsis for a "Smart Lost and Found Portal," originally scoped around PHP/MySQL with an AI-style keyword-matching engine, notifications, and finder↔owner chat. This implementation intentionally simplifies and re-architects that idea: a Node.js/Express/SQL Server/React stack, and a manual, secret-question-based verification model instead of automatic matching — trading "smart" for "simple and trustworthy," one module at a time.
