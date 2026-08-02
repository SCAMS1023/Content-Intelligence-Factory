# Migration guide

## Current v2 browser data

The application continues to read the existing `tsvf.*.v2` localStorage keys. No automatic migration deletes or overwrites those records.

Before a future schema upgrade, open **Library** and select **Full backup**. The resulting JSON file contains the library, trash, draft, and preferences records exactly as stored.

To restore, select **Restore backup** and choose a backup created by this application. The app validates the format, size, allowed keys, and every serialized record before writing. Restore is atomic: if a storage write fails, previously stored values are restored. Successful restore reloads the page.

Backups are limited to 4 MB to stay below typical localStorage capacity and avoid locking the browser while parsing untrusted files.
