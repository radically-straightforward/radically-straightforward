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
        console.log([new Date().toISOString(), ...messageParts].join(" \t"));
      },
    };

    //     application.configuration.interval ??= 5 * 60 * 1000;

    //     application.log(
    //       "MONITOR",
    //       application.version,
    //       "STARTING...",
    //       JSON.stringify(application.configuration.targets),
    //     );

    //     process.once("exit", () => {
    //       application.log("STOPPED");
    //     });

    //     const notifiedTargets = new Set<
    //       (typeof application)["configuration"]["targets"][number]
    //     >();

    //     (async () => {
    //       while (true) {
    //         for (const monitor of application.configuration.monitors) {
    //           application.log("STARTING...", JSON.stringify(monitor.target));

    //           try {
    //             // timeout: {
    //             //   request: 5 * 1000,
    //             // },
    //             // retry: {
    //             //   limit: 5,
    //             // },
    //             const response = await gotClient(monitor.target);
    //             notifiedTargets.delete(monitor);
    //             application.log(
    //               "SUCCESS",
    //               JSON.stringify(monitor.target),
    //               String(response.statusCode),
    //               JSON.stringify(response.timings),
    //             );
    //           } catch (error: any) {
    //             application.log(
    //               "ERROR",
    //               JSON.stringify(monitor.target),
    //               String(error),
    //               error?.stack,
    //             );
    //             if (notifiedTargets.has(monitor))
    //               application.log(
    //                 "SKIPPING SENDING ALERT BECAUSE PREVIOUS ERROR HASN’T BEEN RESOLVED YET...",
    //                 JSON.stringify(monitor.target),
    //               );
    //             else {
    //               try {
    //                 const sentMessageInfo = await nodemailer
    //                   .createTransport(
    //                     monitor.email.options,
    //                     monitor.email.defaults,
    //                   )
    //                   .sendMail({
    //                     subject: `⚠️ ‘${JSON.stringify(monitor.target)}’ IS DOWN`,
    //                     html: html`<pre>
    // ${String(error)}

    // ${error?.stack}
    // </pre>`,
    //                   });
    //                 notifiedTargets.add(monitor);
    //                 application.log(
    //                   "ALERT SENT",
    //                   JSON.stringify(monitor.target),
    //                   sentMessageInfo.response ?? "",
    //                 );
    //               } catch (error: any) {
    //                 application.log(
    //                   "CATASTROPHIC ERROR TRYING TO SEND ALERT",
    //                   JSON.stringify(monitor.target),
    //                   String(error),
    //                   error?.stack,
    //                 );
    //               }
    //             }
    //           }

    //           application.log("FINISHED", JSON.stringify(monitor.target));
    //         }

    //         await timers.setTimeout(application.configuration.interval, undefined, {
    //           ref: false,
    //         });
    //       }
    //     })();

    //     await eventLoopActive;

    //     await timers.setTimeout(10 * 1000, undefined, { ref: false });
    //     process.exit(1);
  })
  .parseAsync();
