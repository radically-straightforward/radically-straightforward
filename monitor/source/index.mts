import url from "node:url";
import nodemailer from "nodemailer";
import * as utilities from "@radically-straightforward/utilities";
import html from "@radically-straightforward/html";

if (process.argv[2] === "--version" || process.argv[2] === "-v") {
  console.log("1.1.0");
  process.exit(0);
}

if (typeof process.argv[2] !== "string" || process.argv[2].trim() === "") {
  console.error("Missing configuration file.");
  process.exit(1);
}

const application: {
  version: string;
  configuration: {
    targets: Got.OptionsOfUnknownResponseBody[];
    email: {
      options: any;
      defaults: nodemailer.SendMailOptions;
    };
    interval: number;
  };
  log: (...messageParts: string[]) => void;
} = {
  version,
  configuration: (await import(url.pathToFileURL(process.argv[2]).href))
    .default,
  log: (...messageParts) => {
    utilities.log(new Date().toISOString(), ...messageParts);
  },
};

application.configuration.interval ??= 5 * 60 * 1000;

application.log(
  "MONITOR",
  application.version,
  "STARTING...",
  JSON.stringify(application.configuration.targets),
);

const alertedTargets = new Set<
  (typeof application)["configuration"]["targets"][number]
>();

const backgroundJob = utilities.backgroundJob(
  { interval: application.configuration.interval },
  async () => {
    for (const target of application.configuration.targets) {
      application.log("STARTING...", JSON.stringify(target));

      try {
        const response = await got({
          timeout: { request: 5 * 1000 },
          retry: { limit: 5 },
          ...target,
        });
        alertedTargets.delete(target);
        application.log(
          "SUCCESS",
          JSON.stringify(target),
          String(response.statusCode),
          JSON.stringify(response.timings),
        );
      } catch (error: any) {
        application.log(
          "ERROR",
          JSON.stringify(target),
          String(error),
          error?.stack,
        );
        if (alertedTargets.has(target))
          application.log(
            "SKIPPING SENDING ALERT BECAUSE PREVIOUS ERROR HASN’T BEEN RESOLVED YET...",
            JSON.stringify(target),
          );
        else
          try {
            const sentMessageInfo = await nodemailer
              .createTransport(application.configuration.email.options)
              .sendMail({
                ...application.configuration.email.defaults,
                subject: `⚠️ MONITOR: ‘${JSON.stringify(target)}’`,
                html: html`
                  <pre>
${String(error)}

${error?.stack}
</pre>
                `,
              });
            alertedTargets.add(target);
            application.log(
              "ALERT SENT",
              JSON.stringify(target),
              sentMessageInfo.response ?? "",
            );
          } catch (error: any) {
            application.log(
              "CATASTROPHIC ERROR TRYING TO SEND ALERT",
              JSON.stringify(target),
              String(error),
              error?.stack,
            );
          }
      }

      application.log("FINISHED.", JSON.stringify(target));
    }
  },
);

await node.shouldTerminate();

backgroundJob.stop();
application.log("STOPPED.");
