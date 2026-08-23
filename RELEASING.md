# Releasing Athan Buddy safely

The updater reads published stable releases from `BadrElGezeri/athan-buddy`. Public releases must be Authenticode-signed. Do not publish the unsigned local QA installer.

## 1. Create and protect the GitHub repository

1. Create `https://github.com/BadrElGezeri/athan-buddy` as a public repository.
2. Push this project to the `main` branch.
3. Protect `main`: block force pushes and deletion, require the `Verify changes / build` check, and require pull requests when practical.
4. Enable two-factor authentication and register at least two passkeys or security keys on the owner account.
5. Under **Settings → General → Releases**, enable immutable releases.
6. Under **Settings → Security**, enable private vulnerability reporting.
7. Create a GitHub Actions environment named `production` and require manual approval for releases.

## 2. Obtain a Windows code-signing identity

As an individual developer in Egypt, obtain an Authenticode certificate from a certificate authority in Microsoft's trusted root program that supports identity validation in Egypt. Prefer a non-exportable hardware token or managed signing service.

The certificate subject shown by Windows is authoritative. It must exactly match `WINDOWS_PUBLISHER_NAME`; do not guess it from your display name.

### Recommended: hardware-backed local release

Install the certificate/token provider on a dedicated Windows release machine, then make the public certificate visible in the Windows certificate store. Set:

```powershell
$env:WINDOWS_PUBLISHER_NAME = "EXACT CERTIFICATE SUBJECT"
$env:WINDOWS_CERTIFICATE_SUBJECT = "UNIQUE SUBJECT SUBSTRING"
$env:GH_TOKEN = gh auth token
```

The private key never enters the repository or GitHub Actions. The token may ask for its PIN while Electron Builder signs the app, helper executables, installer, and uninstaller.

### Alternative: exportable PFX in protected GitHub Actions

Only use this if the certificate provider gives you an exportable PFX and you accept the larger key-exposure risk.

Configure:

- Repository variable `WINDOWS_PUBLISHER_NAME` with the exact certificate subject.
- Environment secret `WIN_CSC_LINK` containing the base64-encoded PFX or a protected download URL.
- Environment secret `WIN_CSC_KEY_PASSWORD` containing its password.
- Manual approval on the `production` environment.

Never commit a certificate, token PIN, PFX, password, or GitHub token.

## 3. Prepare a release

1. Choose a strictly newer semantic version, for example `0.1.1`.
2. Update `version` in `package.json` and run `pnpm install` so the lockfile records it.
3. Write short plain-text release notes describing user-visible features and fixes. These notes appear in the Athan Buddy update popup.
4. Run:

```powershell
pnpm audit --audit-level=high
pnpm build
```

5. Commit, review, and push the version change to protected `main`.

## 4A. Publish with the hardware-backed local flow

With the environment variables from section 2 set:

```powershell
pnpm build
pnpm release:win
```

This creates a draft GitHub release containing the signed installer, `latest.yml`, and blockmap. Before publishing:

```powershell
Get-AuthenticodeSignature "release\Athan-Buddy-Setup-0.1.1.exe" | Format-List
```

Confirm `Status` is `Valid` and the signer subject is the expected publisher. Then publish the draft on GitHub with the reviewed release notes. Once published with immutable releases enabled, its tag and assets cannot be replaced.

## 4B. Publish with the protected GitHub workflow

Open **Actions → Release signed Windows update → Run workflow** from `main`. Enter:

- The version already present in `package.json`.
- Plain-text release notes for the in-app announcement.

Approve the `production` environment. The workflow refuses to publish when the version, signing identity, or signing credentials are missing. It builds, signs, uploads a draft, generates a provenance attestation, and then publishes it.

## 5. Verify the update path

1. Keep a machine on the previous signed version.
2. Publish the new stable release.
3. In Athan Buddy, open **Settings → App updates → Check for updates**.
4. Confirm the release-note popup shows the correct version and notes.
5. Download, restart, and verify the installed version changed while prayer logs and settings remained intact.

Never test the only copy of a production signing credential in an unreviewed workflow. If the certificate or GitHub account may be compromised, stop publishing, revoke the certificate, secure the account, and issue a newly signed release after completing incident review.
