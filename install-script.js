// install-script.js
const fs = require("fs").promises;
const path = require("path");
const { spawn } = require("child_process");

const INSTALL_DIR = process.cwd();
const FILES_TO_FETCH = ["server.js", "package.json"];
let REPO_BASE = "https://raw.githubusercontent.com/npask/NovaPlay/main";
const isDevBeta = process.argv.includes("devbeta=true");

if (isDevBeta) {
  REPO_BASE = "https://raw.githubusercontent.com/npask/NovaPlay/developing";
  console.log("⚡ Running in DEV/BETA mode!");
}

const fetchFile = async (file) => {
  const res = await fetch(`${REPO_BASE}/${file}`);
  if (!res.ok) throw new Error(`Failed to fetch ${file}`);
  const data = await res.text();
  await fs.writeFile(path.join(INSTALL_DIR, file), data, "utf8");
  console.log(`✔ Downloaded ${file}`);
};

async function installDep(dep) {
  if (dep === "ffmpeg-static") {
    // Prüfen, ob ffmpeg installiert ist
    const check = spawn("ffmpeg", ["-version"]);
    check.on("error", () => console.warn("⚠ ffmpeg not found. Install manually."));
    check.on("exit", (code) => {
      if (code === 0) console.log("✔ ffmpeg available");
      else console.warn("⚠ ffmpeg not found. Install manually.");
    });
    return;
  }

  return new Promise((resolve) => {
    const npm = spawn("npm", ["install", dep, "--no-save", "--legacy-peer-deps", "--silent"], {
      stdio: "ignore"
    });
    npm.on("exit", (code) => {
      if (code === 0) console.log(`✔ ${dep} installed`);
      else console.error(`❌ Failed to install ${dep}`);
      resolve();
    });
  });
}

async function install() {
  console.log("📥 Installing NovaPlay...");

  // 1️⃣ Dateien holen
  for (const file of FILES_TO_FETCH) {
    try { await fetchFile(file); }
    catch (e) { console.error(`❌ Error downloading ${file}: ${e.message}`); }
  }

  // 2️⃣ Dependencies laden
  let pkg;
  try {
    const pkgData = await fs.readFile(path.join(INSTALL_DIR, "package.json"), "utf8");
    pkg = JSON.parse(pkgData);
  } catch (e) {
    console.error("❌ Cannot read package.json:", e.message);
    return;
  }

  const depNames = Object.keys(pkg.dependencies || {});

  // 3️⃣ Jede Dependency einzeln installieren
  for (const dep of depNames) await installDep(dep);

  console.log("\n✅ Installation complete!");
  console.log("Start server with: node server.js");
}

install();
