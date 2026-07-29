# CSV Import Pipeline Guide

This document describes the CSV parsing mechanics, supported browser-store exports, custom mapper settings, and diagnostic statistics logged during file uploads.

KoalaData opens the Chrome Web Store statistics dashboard with `?hl=en`. This asks Google for the English interface so report filenames and headers remain predictable even when the browser or account language differs. Localized exports remain supported and can still be detected or mapped.

## 1. CSV Parser & Content Checking
Every uploaded file is checked before being committed:
- **Delimiter Auto-Detection**: Compares commas (`,`), semicolons (`;`), and tabs (`\t`) outside quoted cells across the first non-empty rows.
- **Encoding Detection**: Supports UTF-8 (with or without BOM) and BOM-marked UTF-16 LE/BE exports.
- **Binary Check**: Inspects the first 1KB of content for null bytes (`0x00`) to block executable or binary file uploads.

## 2. Chrome Web Store Importer Compatibility
The system provides a high-confidence mapping configuration if it matches standard Chrome Web Store exports. It matches headers against standard column name aliases:

| Metric Type | Chrome Web Store Header Aliases |
| :--- | :--- |
| **Date** | `date`, `time`, `date_utc`, `timestamp`, `day` |
| **Weekly Active Users** | `weekly active users`, `active users`, `users`, `active_users` |
| **Daily Installs** | `daily installs`, `installs`, `daily_installs`, `downloads` |
| **Daily Uninstalls** | `daily uninstalls`, `uninstalls`, `daily_uninstalls` |
| **Store Page Views** | `store page views`, `page views`, `pageviews`, `store_views` |
| **Store Impressions** | `impressions`, `store impressions`, `store_impressions` |

Recognized Chrome Web Store report filenames import automatically when their columns produce a high-confidence mapping. Unknown files open a review preview before any observation is committed. Common localized headers cover English, German, French, Spanish, Portuguese, Italian, Dutch, Polish, and Turkish. Additional Japanese, Korean, and Chinese header aliases are recognized where the report structure is unambiguous.

Wide breakdown reports are stored as one metric definition with a dimension for each category. For example, `Installationen nach Region` becomes an install-flow breakdown with observations such as `{"region":"Deutschland"}` instead of creating a separate chart definition for every country. Snapshot reports such as weekly users, extension versions, ratings, and enabled state use their latest value; install and uninstall breakdowns are summed over the selected period.

## 3. Firefox Add-ons (AMO) Importer Compatibility

Official AMO statistics exports contain three leading `#` metadata lines before the CSV header. KoalaData removes only these leading comment lines before delimiter and header detection.

The following daily reports import automatically when uploaded to a `firefox_amo` source:

| AMO filename | Required columns | KoalaData metric | Aggregation |
| --- | --- | --- | --- |
| `downloads-day-YYYYMMDD-YYYYMMDD.csv` | `date,count` | Downloads | Sum |
| `usage-day-YYYYMMDD-YYYYMMDD.csv` | `date,count` | Active users | Latest value |

Both the official filename and required columns must match. Generic `date,count` files remain in mapping review so they are not silently assigned Firefox semantics.

## 4. Microsoft Edge Add-ons

Microsoft Edge extension analytics and CSV export are provided through Microsoft Partner Center under **Extension overview > Analytics**. The import page links Edge sources to Partner Center rather than to Chrome Web Store tooling. Edge CSV layouts remain in mapping review until their exported columns have been confirmed and covered by a source-specific detector.

Unknown wide numeric files are sent to the manual mapping preview. They are never silently assigned period-sum semantics.

## 5. Date & Number Normalization
- **Date Standardizer**: Formats date strings to `YYYY-MM-DD` (ISO 8601). It can parse custom formats (like `MM/DD/YYYY` or `DD/MM/YYYY`) and falls back to JavaScript's standard `Date.parse()` when needed.
- **Number Standardizer**: Handles localized grouping and decimal separators, non-breaking spaces, apostrophes, signs, and surrounding unit text.

## 6. Diagnostics & Duplicate Handling
During mapping, the system logs metrics to calculate statistics:
- **In-File Duplicates**: If multiple rows share the same date/dimensions inside the uploaded CSV, the importer retains the **last** value encountered and increments the `duplicate_count` statistic.
- **DB Overlaps**: Computes the number of parsed rows that overlap with existing observations already imported in complete, active batches, updating the `overlap_count` statistic.
- **Errors/Warnings**: Counts unparseable rows and skips them rather than aborting the entire upload.
