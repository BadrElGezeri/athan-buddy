import { ArrowClockwise, DownloadSimple, Sparkle } from "@phosphor-icons/react";
import type { Language, UpdateStatus } from "../types";
import { createTranslator } from "../i18n";
import { PrimaryButton, SecondaryButton } from "./Controls";

export function UpdatePrompt({
  status,
  language,
  dismissedVersion,
  onLater,
  onDownload,
  onInstall,
}: {
  status: UpdateStatus;
  language: Language;
  dismissedVersion: string | null;
  onLater(): void;
  onDownload(): void;
  onInstall(): void;
}) {
  const t = createTranslator(language);
  const visible = ["available", "downloading", "ready"].includes(status.phase)
    && (status.phase !== "available" || status.availableVersion !== dismissedVersion);
  if (!visible) return null;

  const downloading = status.phase === "downloading";
  const ready = status.phase === "ready";

  return (
    <aside className="update-prompt" role="dialog" aria-labelledby="update-prompt-title" aria-live="polite">
      <div className="update-prompt-mark"><Sparkle size={20} weight="fill" /></div>
      <div className="update-prompt-copy">
        <span>{ready ? t("updateReady") : downloading ? t("downloadingUpdate") : t("newVersion")}</span>
        <h2 id="update-prompt-title">
          {ready ? t("restartForVersion", { version: status.availableVersion ?? "" }) : t("versionAvailable", { version: status.availableVersion ?? "" })}
        </h2>
        {!downloading && !ready && (
          <p>{status.releaseNotes || t("updateFallbackNotes")}</p>
        )}
        {downloading && (
          <div className="update-prompt-progress" aria-label={t("downloadProgress")}>
            <span style={{ width: `${status.percent ?? 0}%` }} />
            <small>{status.percent ?? 0}%</small>
          </div>
        )}
        <div className="update-prompt-actions">
          {status.phase === "available" && <SecondaryButton onClick={onLater}>{t("later")}</SecondaryButton>}
          {status.phase === "available" && <PrimaryButton onClick={onDownload}><DownloadSimple size={17} /> {t("downloadUpdate")}</PrimaryButton>}
          {ready && <PrimaryButton onClick={onInstall}><ArrowClockwise size={17} /> {t("restartAndInstall")}</PrimaryButton>}
        </div>
      </div>
    </aside>
  );
}
