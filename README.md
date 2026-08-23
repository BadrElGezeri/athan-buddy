# Athan Buddy

Athan Buddy is a bilingual Windows 10/11 prayer companion. It lives in the system tray, starts with Windows, fetches location-aware prayer times, reminds the user about unlogged prayers before the next prayer, keeps a private on-device prayer log, and streams Quran recitations.

## Included

- English and full Arabic RTL interfaces
- Light and dark themes
- Windows precise location, IP-based location, and manual city override
- User-selectable AlAdhan calculation method and Asr school
- Full adhan, short sound, or silent Windows prayer alerts; adhan volume appears only for the full-adhan mode
- Configurable missed-prayer reminder that can be disabled
- Native notification actions to mark a prayer as prayed, snooze repeatedly for 5/10/15 minutes, or close
- Browsable local prayer history with seven-day paging
- Bilingual English/Arabic surah and reciter search, reviewed reciter nationality flags where known, persistent streaming playback, saved listening position, current-ayah timing where supported, and mute/volume controls
- Prayer logging unlocks only after each prayer time has begun
- Collapsible sidebar that gives the active page more room
- Manual GitHub update checks with release notes and a Check for updates button; the app never downloads or runs an update
- Minimize-to-tray behavior and Windows startup registration
- Local-only settings and prayer logs

## Install

Use the generated installer:

`release/Athan-Buddy-Setup-0.1.0.exe`

The installer is currently unsigned. Windows may show **Unknown Publisher** or a SmartScreen warning. Download public builds only from the official GitHub Releases page and verify the published checksum or attestation.

## Development

Requirements:

- Node.js 22 or newer
- pnpm 11 or newer

Commands:

```powershell
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm dist:win
```

Public release setup and the signed update procedure are documented in [RELEASING.md](RELEASING.md).

## Data and privacy

Prayer logs and settings are stored as `athan-buddy-data.json` in Electron's Athan Buddy user-data folder under `%APPDATA%`. The app does not create accounts or upload prayer logs.

Location is sent only when requesting location-dependent data:

- Precise coordinates or a manually entered city are sent to AlAdhan for prayer-time calculation.
- Precise coordinates are sent to BigDataCloud's keyless client endpoint to resolve the city and country shown in the app.
- IP-based detection uses IPWhoIs and stores the returned city and coordinates locally.
- Quran streaming requests go to MP3Quran's catalog and audio servers. Supported recitations also request MP3Quran's per-ayah timing metadata so the player can identify the current ayah.

## Services

- [AlAdhan Prayer Times API](https://aladhan.com/prayer-times-api)
- [AlAdhan adhan audio](https://aladhan.com/download-adhans)
- [MP3Quran API](https://www.mp3quran.net/eng/api)
- [Reciter nationality source notes](RECITER_DATA.md)
- [IPWhoIs documentation](https://ipwhois.io/documentation)
- [BigDataCloud free client-side reverse geocoding](https://www.bigdatacloud.com/docs/free-api)

Internet access is currently required for prayer-time refreshes, IP location, full adhan playback, and Quran streaming. Offline schedules and downloads are intentionally outside this release.

Update checks read only the latest stable release metadata from the public `BadrElGezeri/athan-buddy` GitHub Releases API. When a newer version exists, Athan Buddy displays its release notes and can open the exact official release page. The app never receives a release-asset URL, downloads an installer, or starts an installation.

## Visual QA

The `artifacts/screenshots` directory contains verified renders for onboarding, English light mode, Arabic dark RTL, Quran playback, prayer history, collapsed navigation, Settings, and the packaged first-run executable.

Made by [Badr Elgezeri](https://badrelgezeri.me/) with the help of AI.
