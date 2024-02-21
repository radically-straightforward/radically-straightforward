let gracefulTerminationEmitted = false;
for (const signal of [
  "SIGINT", // ⌃C
  "SIGQUIT", // ⌃\
  "SIGBREAK", // Windows / Ctrl+Break
  "SIGHUP", // Terminal closed
  "SIGTERM", // ‘kill’
  "SIGUSR2", // https://www.npmjs.com/package/nodemon
])
  process.on(signal, () => {
    if (gracefulTerminationEmitted) return;
    gracefulTerminationEmitted = true;
    setTimeout(() => {
      process.exit(1);
    }, 10 * 1000).unref();
    process.emit("gracefulTermination" as any);
  });
