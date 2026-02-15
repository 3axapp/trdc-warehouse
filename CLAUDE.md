# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TRDC Warehouse — a Russian-language warehouse management and manufacturing control system. Manages the full supply chain: material reception → quality control → multi-stage manufacturing → shipment.

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
- `src/app/components/guard-area/` — all authenticated routes (supplies, manufacturing, packing, shipments, master data)
- `src/app/services/collections/` — Firestore collection wrappers extending `AbstractCollection<T>`
- `src/app/services/` — domain services (manufacturing logic, quality control, auth, cache)
- `src/app/pipes/` — display pipes for translating IDs to names

### Data Layer Pattern
`AbstractCollection<T extends Deletable>` (in `services/collections/abstract.collection.ts`) provides base CRUD: `get`, `add`, `update`, `archive`, `getList`. Each collection class sets `collectionName` and optionally overrides the Firestore converter. Transactions are passed as optional parameters for multi-document consistency.

### Manufacturing Pipeline (Recipe System)
Three sequential stages defined in `src/app/recipes.ts`:
1. **chipRecipe:** 5 checked materials → 1 chip
2. **packRecipe:** 5 chips + packaging → 1 pack
3. **shipRecipe:** 10 packs + box + label → 1 shipment (with recipient and docNumber fields)

Packing and shipment routes reuse the same manufacturing component, differing only by recipe.

### Firestore Collections
`positions`, `supplies`, `suppliers`, `executors`, `manufacturingProduction`, `manufacturingLots`, `positionCodes` (uniqueness enforcer), `positionLots` (uniqueness enforcer)

### Position Types
- **Normal** — no QC required
- **Checked (Проверяемый)** — must pass quality control before use in manufacturing
- **Produced** — output of a manufacturing stage

## Domain Constraints
- Position `code` must be unique (enforced via `positionCodes` collection in a transaction)
- Lot = unique combination of position code + materials composition + executor + date
- Only single lot combinations allowed per production run
- Supply position cannot be changed after QC approval or partial use
- Quantity validation: available = total − broken − used

## Quality Gates
- **All tests must pass** before considering any task complete. Run `ng test --no-watch` after making changes and fix any failures.
- **Build must succeed** — run `ng build` to verify there are no compilation errors.

## Code Style
- 2-space indentation, single quotes for TypeScript, UTF-8
- Angular schematics generate SCSS for component styles
- Icons from [Lucide](https://lucide.dev/icons/)
- Domain terms (UI labels, docs, comments) in Russian; code identifiers in English
- Component prefix: `app`

## Firebase
- Project: `trdc-warehouse-0x3`
- Emulator ports: Auth 9099, Firestore 8080, UI 4000
- Firestore rules: all authenticated users can read/write
- Emulator data persisted in `.firebase/emulator-data/`
