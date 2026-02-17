import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as fs from "fs";
import * as path from "path";

const certDir = path.join(
  process.env.HOME || "",
  ".office-addin-dev-certs"
);

function getHttpsOptions() {
  const certPath = path.join(certDir, "localhost.crt");
  const keyPath = path.join(certDir, "localhost.key");
  const caPath = path.join(certDir, "ca.crt");

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      ca: fs.existsSync(caPath) ? fs.readFileSync(caPath) : undefined,
    };
  }

  console.warn(
    "No dev certs found. Run: npx office-addin-dev-certs install"
  );
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        taskpane: "/taskpane.html",
      },
    },
  },
  server: {
    https: getHttpsOptions(),
    port: 3000,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});
