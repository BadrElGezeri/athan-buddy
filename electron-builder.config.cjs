const publisherName = process.env.WINDOWS_PUBLISHER_NAME?.trim();
const certificateSubjectName = process.env.WINDOWS_CERTIFICATE_SUBJECT?.trim();

module.exports = {
  appId: "com.athanbuddy.desktop",
  productName: "Athan Buddy",
  asar: true,
  directories: {
    output: "release",
    buildResources: "build",
  },
  files: [
    "dist/**/*",
    "electron/**/*",
    "assets/brand/**/*",
    "package.json",
  ],
  publish: [
    {
      provider: "github",
      owner: "BadrElGezeri",
      repo: "athan-buddy",
      releaseType: "draft",
    },
  ],
  electronFuses: {
    runAsNode: false,
    enableCookieEncryption: true,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
    loadBrowserProcessSpecificV8Snapshot: false,
    grantFileProtocolExtraPrivileges: false,
  },
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    icon: "build/icon.ico",
    artifactName: "Athan-Buddy-Setup-${version}.${ext}",
    verifyUpdateCodeSignature: true,
    ...(publisherName ? { publisherName: [publisherName] } : {}),
    ...(certificateSubjectName ? {
      signtoolOptions: {
        certificateSubjectName,
        signingHashAlgorithms: ["sha256"],
      },
    } : {}),
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Athan Buddy",
    runAfterFinish: true,
    deleteAppDataOnUninstall: false,
  },
};
