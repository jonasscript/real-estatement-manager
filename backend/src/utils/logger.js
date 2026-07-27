const fs = require('fs');
const path = require('path');

// Every console.* call in the app (routes, services, cronjobschedule, etc.)
// gets mirrored to backend/logs/app-YYYY-MM-DD.log, in addition to the terminal.
const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function currentLogFile() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOGS_DIR, `app-${date}.log`);
}

function formatArg(arg) {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  try {
    return JSON.stringify(arg, null, 2);
  } catch (error) {
    return String(arg);
  }
}

function writeToFile(level, args) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${args.map(formatArg).join(' ')}\n`;
  fs.appendFile(currentLogFile(), line, (error) => {
    if (error) {
      process.stderr.write(`No se pudo escribir el log: ${error.message}\n`);
    }
  });
}

let patched = false;

function patchConsole() {
  if (patched) return;
  patched = true;

  ['log', 'info', 'warn', 'error', 'debug'].forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      writeToFile(level === 'log' ? 'info' : level, args);
    };
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });
}

patchConsole();

module.exports = { LOGS_DIR };
