const packageJson = require("../package.json");

function requireValue(name) {
  if (!process.env[name]?.trim()) throw new Error(`Release blocked: ${name} is not configured`);
}

if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
  throw new Error("Release blocked: package.json must contain a stable semantic version such as 0.2.0");
}

requireValue("GH_TOKEN");
requireValue("WINDOWS_PUBLISHER_NAME");

const hardwareBacked = Boolean(process.env.WINDOWS_CERTIFICATE_SUBJECT?.trim());
const fileBacked = Boolean(process.env.CSC_LINK?.trim() && process.env.CSC_KEY_PASSWORD?.trim());
if (!hardwareBacked && !fileBacked) {
  throw new Error("Release blocked: configure a Windows certificate-store subject or both CSC_LINK and CSC_KEY_PASSWORD");
}

if (process.env.RELEASE_VERSION && process.env.RELEASE_VERSION !== packageJson.version) {
  throw new Error(`Release blocked: requested ${process.env.RELEASE_VERSION}, but package.json is ${packageJson.version}`);
}

if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== "main") {
  throw new Error("Release blocked: public releases must run from the protected main branch");
}

console.log(`Release checks passed for Athan Buddy ${packageJson.version}`);
