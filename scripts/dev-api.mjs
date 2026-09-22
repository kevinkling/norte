import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };

// go run corre dentro del módulo (backend/). Las rutas relativas de
// SQLITE_PATH se resuelven desde la raíz, que es desde donde se lanza pnpm.
if (!env.SQLITE_PATH) {
  env.SQLITE_PATH = path.join(root, "data", "norte.db");
} else if (!path.isAbsolute(env.SQLITE_PATH)) {
  env.SQLITE_PATH = path.resolve(root, env.SQLITE_PATH);
}

const child = spawn("go", ["run", "./cmd/norte-api"], {
  cwd: path.join(root, "backend"),
  stdio: "inherit",
  env,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
