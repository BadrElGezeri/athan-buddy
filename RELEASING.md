# Releasing Athan Buddy through GitHub

Athan Buddy checks the latest published release in `BadrElGezeri/athan-buddy`. It never downloads or executes an update. When a newer stable version exists, the app shows its plain-text release notes and can open the exact official GitHub release page.

The current installers are unsigned. Windows may show **Unknown Publisher** or a Microsoft Defender SmartScreen warning. Never imply that checksums or attestations replace Authenticode; they provide provenance and integrity evidence for users who choose to verify a download.

## 1. Protect the repository

1. Protect `main`: block force pushes and deletion, require the `Verify changes / build` check, and require pull requests when practical.
2. Enable two-factor authentication and register at least two passkeys or security keys on the owner account.
3. Under **Settings → General → Releases**, enable immutable releases.
4. Under **Settings → Security**, enable private vulnerability reporting.
5. Create a GitHub Actions environment named `production` and require manual approval for releases.

## 2. Prepare a version

1. Choose a strictly newer semantic version, for example `0.1.1`.
2. Update `version` in `package.json` and run `pnpm install --lockfile-only` so the lockfile records it.
3. Write concise plain-text release notes. These notes appear in the in-app update card.
4. Run:

```powershell
pnpm audit --audit-level=high
pnpm build
```

5. Commit, review, and push the version change to protected `main`.

## 3. Publish the GitHub release

Open **Actions → Release Windows installer → Run workflow** from `main`. Enter:

- The version already present in `package.json`.
- Plain-text features and fixes for the in-app announcement.

Approve the `production` environment. The workflow:

1. Installs only locked dependencies.
2. Validates the version and branch.
3. Builds the hardened NSIS installer.
4. Creates a SHA-256 checksum file.
5. Generates a GitHub artifact attestation.
6. Creates a draft release with all assets attached.
7. Publishes the completed release.

The release notes automatically disclose that the installer is unsigned.

## 4. Verify a release

Download the installer and checksum from the published release, then compare locally:

```powershell
Get-FileHash -Algorithm SHA256 ".\Athan-Buddy-Setup-0.1.1.exe"
gh release verify-asset "v0.1.1" ".\Athan-Buddy-Setup-0.1.1.exe" --repo BadrElGezeri/athan-buddy
```

Keep a previous version installed, publish the newer stable release, and use **Settings → App updates → Check for updates**. Confirm the app displays the correct notes and opens only:

```text
https://github.com/BadrElGezeri/athan-buddy/releases/tag/vVERSION
```

The user downloads and runs the installer manually. Athan Buddy does not receive a download URL from GitHub and does not launch release assets.

## Optional future signing

If a publicly trusted Authenticode certificate or accepted SignPath Foundation subscription becomes available, add signing before the draft-release step. Keep the same manual GitHub page flow unless a separately reviewed executable updater is intentionally introduced.

If the GitHub account may be compromised, stop publishing, secure the account, rotate credentials, review recent workflow and release activity, and publish a security notice before resuming releases.
