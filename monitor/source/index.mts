import url from "node:url";
import nodemailer from "nodemailer";
import * as utilities from "@radically-straightforward/utilities";
import html from "@radically-straightforward/html";

const configuration: {
  resources: Parameters<typeof fetch>[0][];
  email: {
    options: any;
    defaults: nodemailer.SendMailOptions;
  };
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
      const response = await fetch(resource, {
        signal: AbortSignal.timeout(60 * 1000),
      });
      if (!response.ok) throw new Error(`Response status ‘${response.status}’`);
      alerts.delete(resource);
      log("SUCCESS", String(response.status));
    } catch (error: any) {
      log("ERROR", String(error), error?.stack);
      if (alerts.has(resource))
        log("SKIPPING ALERT BECAUSE PREVIOUS ALERT HASN’T BEEN CLEARED YET...");
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
