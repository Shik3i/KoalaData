# CSV Import Pipeline Guide

This document describes the CSV parsing mechanics, Chrome Web Store compatibility, custom mapper settings, and diagnostic statistics logged during file uploads.

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

Every uploaded file opens a review preview before any observation is committed. Recognized Chrome Web Store report filenames and common localized headers cover English, German, French, Spanish, Portuguese, Italian, Dutch, Polish, and Turkish. Additional Japanese, Korean, and Chinese header aliases are recognized where the report structure is unambiguous.

Wide breakdown reports are stored as one metric definition with a dimension for each category. For example, `Installationen nach Region` becomes an install-flow breakdown with observations such as `{"region":"Deutschland"}` instead of creating a separate chart definition for every country. Snapshot reports such as weekly users, extension versions, ratings, and enabled state use their latest value; install and uninstall breakdowns are summed over the selected period.

Unknown wide numeric files are sent to the manual mapping preview. They are never silently assigned period-sum semantics.

## 3. Date & Number Normalization
- **Date Standardizer**: Formats date strings to `YYYY-MM-DD` (ISO 8601). It can parse custom formats (like `MM/DD/YYYY` or `DD/MM/YYYY`) and falls back to JavaScript's standard `Date.parse()` when needed.
- **Number Standardizer**: Handles localized grouping and decimal separators, non-breaking spaces, apostrophes, signs, and surrounding unit text.

## 4. Diagnostics & Duplicate Handling
During mapping, the system logs metrics to calculate statistics:
- **In-File Duplicates**: If multiple rows share the same date/dimensions inside the uploaded CSV, the importer retains the **last** value encountered and increments the `duplicate_count` statistic.
- **DB Overlaps**: Computes the number of parsed rows that overlap with existing observations already imported in complete, active batches, updating the `overlap_count` statistic.
- **Errors/Warnings**: Counts unparseable rows and skips them rather than aborting the entire upload.
