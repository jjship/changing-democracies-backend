# Fragment-Tags Relationship Import Tool

This tool imports relationships between fragments and tags from a CSV file into the application database.

## Overview

The import script:

1. Reads a CSV file containing fragment IDs and their associated tag names
2. Finds each fragment and tag in the database
3. Creates relationships between fragments and tags in the join table
4. Logs any fragments or tags that can't be found

## Prerequisites

- Node.js and npm installed
- Database connection configured in the application
- Tags must already be imported using the `import-tags` script
- CSV file with fragment-tag relationships placed in the `tags_migration` directory

## CSV Format

The CSV file (`tags_migration/fragments_tags.csv`) must have the following format:

- First row contains header columns: `id` and `TAGS (comma separated)`
- Each subsequent row contains:
  - `id`: The UUID of the fragment
  - `TAGS (comma separated)`: A comma-separated list of tag names in English

Example:

```
id,TAGS (comma separated)
afbb1d9b-f6aa-410c-a0b1-dd48175757f5,"free browsing, travelling workshop, resistance, courage"
592dfd00-f7c2-45d3-9a2a-8d28e11b87ff,"free browsing, migration, transition, family"
```

## Case Sensitivity

Tag matching is case-insensitive. The script converts all tag names to lowercase before searching for them in the database. This means that "Free Browsing", "FREE BROWSING", and "free browsing" will all match the same tag.

## Error Handling

The script uses a robust error handling approach:

- Each fragment is processed in its own transaction for isolation
- If a relationship for one tag fails, other tags for the same fragment will still be attempted
- Tags that can't be found by name are tracked and reported, but don't stop the process
- Non-existent fragments are logged but don't interrupt the import
- Detailed error summaries are provided after import completion

This approach ensures that the maximum number of valid relationships will be created, even if some fragments or tags have issues.

## Running the Import

It's recommended to run the scripts in the following order:

1. First import the tags:

```bash
npm run import-tags
```

2. Then import the fragment-tag relationships:

```bash
npm run import-fragment-tags
```

### Production Environment

For production, build the application first:

```bash
npm run build
```

Then run the imports:

```bash
npm run import-tags:prod
npm run import-fragment-tags:prod
```

## Import Summary

After running the script, you'll see a detailed summary showing:

- Number of fragments processed successfully
- Number of new relationships created
- Number of existing relationships found (and skipped)
- Number of fragments skipped
- Number of relationships that failed to create
- Lists of failed fragments, non-existent fragments, and missing tags

## Notes

- Tag names in the CSV need not match the exact capitalization in the database (case-insensitive matching)
- Existing fragment-tag relationships will be skipped (not duplicated)
