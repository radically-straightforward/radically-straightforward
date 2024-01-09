import url from "node:url";
import * as commander from "commander";
import { got } from "got";
import * as Got from "got";
import nodemailer from "nodemailer";
import * as utilities from "@radically-straightforward/utilities";
import html from "@radically-straightforward/html";
import * as node from "@radically-straightforward/node";

const version = "1.0.0";

await commander.program
  .name("monitor")
  .description("👀 Monitor web applications and send email alerts")
  .argument("<configuration>", "Path to configuration file.")
  .version(version)
  .allowExcessArguments(false)
  .showHelpAfterError()
  .action(async (configuration: string) => {
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
      configuration: (await import(url.pathToFileURL(configuration).href))
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
    console.log("STOPPED.");
  })
  .parseAsync();
