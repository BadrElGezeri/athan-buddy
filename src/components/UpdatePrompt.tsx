import { ArrowSquareOut, Sparkle } from "@phosphor-icons/react";
import type { Language, UpdateStatus } from "../types";
import { createTranslator } from "../i18n";
import { PrimaryButton, SecondaryButton } from "./Controls";

export function UpdatePrompt({
  status,
  language,
  dismissedVersion,
  onLater,
  onOpenRelease,
}: {
  status: UpdateStatus;
  language: Language;
  dismissedVersion: string | null;
  onLater(): void;
  onOpenRelease(): void;
}) {
  const t = createTranslator(language);
  const visible = status.phase === "available" && status.availableVersion !== dismissedVersion;
  if (!visible) return null;

  return (
    <aside className="update-prompt" role="dialog" aria-labelledby="update-prompt-title" aria-live="polite">
      <div className="update-prompt-mark"><Sparkle size={20} weight="fill" /></div>
      <div className="update-prompt-copy">
        <span>{t("newVersion")}</span>
        <h2 id="update-prompt-title">{t("versionAvailable", { version: status.availableVersion ?? "" })}</h2>
        <p>{status.releaseNotes || t("updateFallbackNotes")}</p>
        <small className="update-manual-note">{t("manualUpdateNotice")}</small>
        <div className="update-prompt-actions">
          <SecondaryButton onClick={onLater}>{t("later")}</SecondaryButton>
          <PrimaryButton onClick={onOpenRelease}><ArrowSquareOut size={17} /> {t("viewReleaseOnGitHub")}</PrimaryButton>
        </div>
      </div>
    </aside>
  );
}
