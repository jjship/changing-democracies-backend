# Tags Import Tool

This tool imports tags with translations from a CSV file into the application database.

## Overview

The import script:

1. Checks for required languages in the database and creates them if missing
2. Reads the CSV file with tag translations
3. Creates a new tag entity for each row
4. Creates name entities for each language translation (stored in lowercase)
5. Uses transactions to ensure data integrity

## Prerequisites

- Node.js and npm installed
- Database connection configured in the application
- CSV file with tag translations placed in the `tags_migration` directory

## CSV Format

The CSV file (`tags_migration/tags_import.csv`) must have the following format:

- First row should contain language names as headers (English, Catalan, Croatian, etc.)
- Each subsequent row contains tag names for each language
- At minimum, each tag should have an English translation

Example:

```
English,Catalan,Croatian,Czech,Dutch,Greek,Lithuanian,Polish,Portuguese,Romanian,Spanish
Democracy,Democràcia,Demokracija,Demokracie,Democratie,Δημοκρατία,Demokratija,Demokracja,Democracia,Democrație,Democracia
Freedom,Llibertat,Sloboda,Svoboda,Vrijheid,Ελευθερία,Laisvė,Wolność,Liberdade,Libertate,Libertad
```

## Case Sensitivity

All tag names are stored in lowercase in the database, regardless of their capitalization in the CSV file. This ensures case-insensitive matching when looking up tags.

## Running the Import

### Development Environment

```bash
npm run import-tags
```

### Production Environment

First, build the application:

```bash
npm run build
```

Then run the import:

```bash
npm run import-tags:prod
```

## Language Handling

The script expects the following languages to exist in the database:

| Language   | ISO Code |
| ---------- | -------- |
| English    | EN       |
| Catalan    | CA       |
| Croatian   | HR       |
| Czech      | CS       |
| Dutch      | NL       |
| Greek      | EL       |
| Lithuanian | LT       |
| Polish     | PL       |
| Portuguese | PT       |
| Romanian   | RO       |
| Spanish    | ES       |

If any language doesn't exist, the script will create it automatically.
