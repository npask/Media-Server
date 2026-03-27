// install-script.js
const fs = require("fs").promises;
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");

const INSTALL_DIR = process.cwd();
let REPO_BASE = "https://raw.githubusercontent.com/npask/NovaPlay/main";
const FILES_TO_FETCH = ["server.js", "package.json"];
const isDevBeta = process.argv.includes("devbeta=true");

if (isDevBeta) {
  REPO_BASE = "https://raw.githubusercontent.com/npask/NovaPlay/developing";
  console.log("⚡ Running in DEV/BETA mode!");
}

const ask = question => new Promise(resolve => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(question, ans => { rl.close(); resolve(ans); });
});

async function install() {
  console.log("📥 Installing NovaPlay...");

  // 🔹 1. Files herunterladen
  for (const file of FILES_TO_FETCH) {
    try {
      const url = `${REPO_BASE}/${file}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${file}`);
      const data = await res.text();
      await fs.writeFile(path.join(INSTALL_DIR, file), data, "utf8");
      console.log(`✔ Downloaded ${file}`);
    } catch (e) {
      console.error(`❌ Error downloading ${file}: ${e.message}`);
    }
  }

  // 🔹 2. Dependencies laden (immer frisch)
  let pkg;
  try {
    const pkgData = await fs.readFile(path.join(INSTALL_DIR, "package.json"), "utf8");
    pkg = JSON.parse(pkgData);
  } catch (e) {
    console.error("❌ Cannot read package.json:", e.message);
    return;
  }

  // Dependencies in einer Zeile
  let depNames = Object.keys({ ...pkg.dependencies });

  // 🔹 3. Jede Dependency einzeln installieren, ohne npm extra deps
  for (const dep of depNames) {
    try {
      console.log(`📦 Installing ${dep}...`);

      if (dep === "ffmpeg-static") {
        if (process.env.TERMUX_VERSION) {
          const ans = await ask("⚠ ffmpeg-static failed. Install system ffmpeg via 'pkg install ffmpeg'? [Y/n] ");
          if (ans.toLowerCase() === "y" || ans === "") {
            execSync("pkg install ffmpeg -y", { stdio: "inherit" });
            console.log("✔ ffmpeg installed via Termux pkg."); continue;
          } else { console.warn("⚠ Skipping ffmpeg-static. Thumbnails might not work."); continue; }
        } else if (process.platform === "linux") {
          const ans = await ask("⚠ ffmpeg-static failed. Try 'apt-get install ffmpeg'? [Y/n] ");
          if (ans.toLowerCase() === "y" || ans === "") {
            execSync("sudo apt-get update && sudo apt-get install -y ffmpeg", { stdio: "inherit" });
            console.log("✔ ffmpeg installed via apt-get."); continue;
          } else { console.warn("⚠ Skipping ffmpeg-static. Thumbnails might not work."); continue; }
        } else { console.warn("⚠ ffmpeg-static failed. Skipping installation."); continue; }
      }

      // Installiere nur das aktuelle Paket, keine Extras, keine Output
      execSync(`npm install ${dep} --no-save --legacy-peer-deps --silent`, { stdio: "ignore" });

      // Update die Liste frisch nach jeder Installation
      const updatedPkgData = await fs.readFile(path.join(INSTALL_DIR, "package.json"), "utf8");
      depNames = Object.keys({ ...JSON.parse(updatedPkgData).dependencies });

      console.log(`✔ ${dep} installed`);
    } catch (e) {
      console.error(`❌ Failed to install ${dep}: ${e.message}`);
    }
  }

  console.log("\n✅ Installation complete! Start server with: node server.js");
}

install();
