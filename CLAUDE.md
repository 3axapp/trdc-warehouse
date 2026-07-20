# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TRDC Warehouse — a Russian-language warehouse management and manufacturing control system. Manages the full supply chain: quarantine intake → quality control → material reservation → multi-stage manufacturing → shipment.

**Stack:** Angular 20, Taiga UI 4, Firebase (Firestore + Auth), TypeScript (strict mode)

## Development Commands

```shell
# Start Firebase emulator (required for local dev)
npm run firebase

# Start Angular dev server (in separate terminal)
ng serve

# Build for production
ng build

# Run tests (Jasmine/Karma)
ng test
```

Both `npm run firebase` and `ng serve` must be running simultaneously for local development.

## Architecture

### Data Flow
`Components → Services → Firestore Collections (via AbstractCollection<T>)`

- **No state management library** — components fetch data directly from services that wrap Firestore
- **Reactive Forms** for all form inputs
- **Zoneless change detection** (`provideZonelessChangeDetection()`)
- **Soft deletes** via `deleted` boolean flag (hard delete is disabled)

### Key Directories
- `src/app/components/guard-area/` — all authenticated routes (quarantine, supplies, reserve, manufacturing, packing, shipments, master data)
- `src/app/components/login/` — login page
- `src/app/components/register/` — registration page (separate from login)
- `src/app/services/collections/` — Firestore collection wrappers extending `AbstractCollection<T>`
- `src/app/services/` — domain services (manufacturing, reserve, quarantine QC, auth, cache)
- `src/app/pipes/` — display pipes for translating IDs to names

### Data Layer Pattern
`AbstractCollection<T extends Deletable>` (in `services/collections/abstract.collection.ts`) provides base CRUD: `get`, `add`, `update`, `archive`, `getList`. Each collection class sets `collectionName` and optionally overrides the Firestore converter. Transactions are passed as optional parameters for multi-document consistency.

### Quarantine & Quality Control
Materials enter through quarantine invoices (`quarantineInvoices` collection) before becoming available supplies. `QuarantineQcService` processes QC: validates quantities, generates lots in format `КОД-ДДММГГ-НОМЕР_СЧЕТА-N`, creates supplies on the warehouse, and tracks used/broken quantities per invoice item. Lot uniqueness is enforced via `quarantineQcCounters` and `quarantineQcUserLots` collections.

### Reserve System
Before manufacturing chips, materials are reserved from available supplies via `ReserveService`. `ReserveProductionService` handles production from reserves: validates quantities, creates chip supplies with lots, logs production to `manufacturingProduction`, and supports returning unused remainder back to supplies.

### Manufacturing Pipeline (Recipe System)
Three sequential stages defined in `src/app/recipes.ts`:
1. **chipRecipe:** 5 checked materials → 1 chip (produced from reserve via `ReserveProductionService`)
2. **packRecipe:** 5 chips + packaging → 1 pack
3. **shipRecipe:** 10 packs + box + label → 1 shipment (with recipient and docNumber fields)

Packing and shipment routes reuse the same manufacturing component, differing only by recipe.
Chip production uses a separate reserve-based flow with its own component and service.

### Authentication & Users
- Login and registration are separate pages (`/login`, `/register`)
- Registration collects email, password, full name (ФИО), and position (Должность)
- `users` collection stores user profiles; document ID = Firebase Auth UID
- Each user gets a sequential `number` (unique, enforced via `userNumbers` collection)
- `authGuardWithUser` guard wraps Firebase `AuthGuard` and loads `User` into `AuthService` on protected routes (handles page refresh)
- `AuthService.getIdentity()` returns `User | null`; `loadUser()` fetches from Firestore if not cached

### Roles
- `User.role` is an optional free-text field on the `users` document. Only `'admin'` (`ADMIN_ROLE`) grants elevated access; absent or any other value means a regular user.
- **There is no UI to assign roles** — this is deliberate. Roles are set by hand in the Firebase console. `UsersCollection.addWithUid` takes `Omit<User, 'id' | 'number' | 'role'>`, so registration structurally cannot write one.
- `AuthService.isAdmin()` checks the loaded profile; `adminGuard` (`services/admin.guard.ts`) protects admin-only routes and redirects non-admins to `/` (they are authenticated, just unauthorized).
- Currently only `/backup` is admin-only. `Layout` also filters the tab out of the menu, but the guard is what actually blocks the route.
- **This is UI/route-level enforcement, not a security boundary.** Firestore rules still allow any authenticated user to read/write every collection, so a user could set their own `role` or run a restore directly via the SDK. Rules cannot distinguish restore writes from normal writes, so backup access cannot be enforced there; genuine escalation-proofing would require a Firebase Auth custom claim instead of a document field.

### Backup & Restore
`BackupService` (`services/backup.service.ts`) exports each Firestore collection and restores it back; `backup-archive.ts` packs those per-collection JSON files into a single ZIP (via `fflate`). UI lives at `/backup` (Бэкап).

- Export produces one `backup-YYYY-MM-DD.zip` containing `positions.json`, `supplies.json`, … — one file per collection.
- Restore accepts either the archive or loose `.json` files; both paths go through `parseBackupFile` → `restoreCollection`.
- Firebase Auth is **not** backed up (client SDK has no access). `users` docs are keyed by Auth UID, so restoring into a fresh project leaves profiles without accounts.

- The client SDK cannot enumerate collections — `BACKUP_COLLECTIONS` is a hardcoded list. **Adding a new Firestore collection requires adding it there**, including uniqueness-enforcer collections.
- Reads bypass `AbstractCollection` converters so document IDs are preserved; restore writes with `setDoc` on the original ID (enforcer collections encode meaning in the ID itself).
- Restore is a **full replacement**: existing documents in the collection are hard-deleted, then backup contents are written via chunked `writeBatch` (500-op limit).
- `Timestamp`/`GeoPoint`/`Bytes`/`DocumentReference` are serialized with a `__type` tag and decoded back on restore.

### Firestore Collections
- `positions`, `positionCodes` (uniqueness enforcer)
- `supplies`, `suppliers`
- `users`, `userNumbers` (uniqueness enforcer for sequential user numbers)
- `quarantineInvoices`, `quarantineInvoiceLots` (uniqueness enforcer), `quarantineQcCounters`, `quarantineQcUserLots`
- `reserves`
- `manufacturingProduction`, `manufacturingLots`

### Position Types
- **Normal** — no QC required
- **Checked (Проверяемый)** — must pass quality control before use in manufacturing
- **Produced** — output of a manufacturing stage

## Domain Constraints
- Position `code` must be unique (enforced via `positionCodes` collection in a transaction)
- User `number` must be unique (enforced via `userNumbers` collection in a transaction)
- Quarantine invoice `lot` must be unique (enforced via `quarantineInvoiceLots` collection)
- Production lot = unique combination of recipe code + date + user number + material lots
- Only single lot combinations allowed per production run
- Supply position cannot be changed after QC approval or partial use
- Quantity validation: available = total − broken − used
- Reserve: materials reserved from supplies, produced quantity + broken + returned ≤ reserved

## Quality Gates
- **All tests must pass** before considering any task complete. Run `ng test --no-watch` after making changes and fix any failures.
- **Build must succeed** — run `ng build` to verify there are no compilation errors.
- **Lint must pass** — run `ng lint` after making changes; fix with `ng lint --fix` then resolve remaining errors manually.

## Code Style
- 2-space indentation, single quotes for TypeScript, UTF-8
- Always use curly braces for `if`, `for`, `while` etc. — even single-line bodies (`curly: all`)
- All class members must have explicit access modifiers (`public`/`protected`/`private`)
- Angular schematics generate SCSS for component styles
- Icons from [Lucide](https://lucide.dev/icons/)
- Domain terms (UI labels, docs, comments) in Russian; code identifiers in English
- Component prefix: `app`
- Full style reference: `docs/code_style.md`

## Firebase
- Project: `trdc-warehouse-0x3`
- Emulator ports: Auth 9099, Firestore 8080, UI 4000
- Firestore rules: all authenticated users can read/write
- Emulator data persisted in `.firebase/emulator-data/`
