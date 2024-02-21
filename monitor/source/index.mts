import url from "node:url";
import nodemailer from "nodemailer";
import * as utilities from "@radically-straightforward/utilities";
import html from "@radically-straightforward/html";

if (typeof process.argv[2] !== "string" || process.argv[2].trim() === "") {
  console.error("Missing configuration file.");
  process.exit(1);
}

const configuration: {
  resources: string[];
  email: {
    options: any;
    defaults: nodemailer.SendMailOptions;
  };
  interval: number;
} = (await import(url.pathToFileURL(process.argv[2]).href)).default;

utilities.log(
  "MONITOR",
  "2.0.0",
  "STARTING...",
  JSON.stringify(configuration.resources),
);
process.once("beforeExit", () => {
  utilities.log("STOPPED.");
});

const alerts = new Set<(typeof configuration)["resources"][number]>();
utilities.backgroundJob({ interval: 5 * 60 * 1000 }, async () => {
  for (const resource of configuration.resources) {
    log("STARTING...");

    try {
      const abortController = new AbortController();
      setTimeout(() => {
        abortController.abort();
      }, 30 * 1000);
      const response = await fetch(resource, {
        signal: abortController.signal,
      });
      alerts.delete(resource);
      log("SUCCESS", String(response.status));
    } catch (error: any) {
      log("ERROR", String(error), error?.stack);
      if (alerts.has(resource))
        log(
          "SKIPPING SENDING ALERT BECAUSE PREVIOUS ERROR HASN’T BEEN RESOLVED YET...",
        );
      else
        try {
          const sentMessageInfo = await nodemailer
            .createTransport(configuration.email.options)
            .sendMail({
              ...configuration.email.defaults,
              subject: `⚠️ MONITOR: ‘${JSON.stringify(resource)}’`,
              html: html`
                <pre>
${String(error)}

${error?.stack}
</pre>
              `,
            });
          alerts.add(resource);
          log("ALERT SENT", sentMessageInfo.response ?? "");
        } catch (error: any) {
          log(
            "CATASTROPHIC ERROR TRYING TO SEND ALERT",
            String(error),
            error?.stack,
          );
        }
    }

    log("FINISHED.");

    function log(...messageParts: string[]) {
      utilities.log(JSON.stringify(resource), ...messageParts);
    }
  }
});
