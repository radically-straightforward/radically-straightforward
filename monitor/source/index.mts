#!/usr/bin/env node

import fs from "node:fs/promises";
import timers from "node:timers/promises";
import url from "node:url";
import * as commander from "commander";
import { got } from "got";
import * as Got from "got";
import nodemailer from "nodemailer";
import * as node from "@leafac/node";
import html from "@leafac/html";

const version = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf8")
).version;

await commander.program
  .name("monitor")
  .description("Radically Straightforward Monitoring")
  .argument("<configuration>", "Path to configuration file.")
  .version(version)
  .allowExcessArguments(false)
  .showHelpAfterError()
  .action(async (configuration: string) => {
    const application: {
      version: string;
      configuration: {
        monitors: {
          target: Got.OptionsOfUnknownResponseBody;
          email: {
            options: any;
            defaults: nodemailer.SendMailOptions;
          };
        }[];
        interval: number;
        got: Got.ExtendOptions;
      };
      log(...messageParts: string[]): void;
    } = {
      version,
      configuration: (await import(url.pathToFileURL(configuration).href))
        .default,
      log(...messageParts) {
        console.log([new Date().toISOString(), ...messageParts].join(" \t"));
      },
    };

    application.configuration.interval ??= 5 * 60 * 1000;

    const gotClient = got.extend(
      application.configuration.got ?? {
        timeout: {
          request: 5 * 1000,
        },
        retry: {
          limit: 5,
        },
      }
    );

    application.log(
      "MONITOR",
      application.version,
      "STARTING...",
      JSON.stringify(
        application.configuration.monitors.map((monitor) => monitor.target)
      )
    );

    const notifiedMonitors = new Set<
      typeof application["configuration"]["monitors"][number]
    >();

    (async () => {
      while (true) {
        for (const monitor of application.configuration.monitors) {
          application.log("STARTING...", JSON.stringify(monitor.target));

          try {
            const response = await gotClient(monitor.target);
            notifiedMonitors.delete(monitor);
            application.log(
              "SUCCESS",
              JSON.stringify(monitor.target),
              String(response.statusCode),
              JSON.stringify(response.timings)
            );
          } catch (error: any) {
            application.log(
              "ERROR",
              JSON.stringify(monitor.target),
              String(error),
              error?.stack
            );
            if (notifiedMonitors.has(monitor))
              application.log(
                "SKIPPING SENDING ALERT BECAUSE PREVIOUS ERROR HASN’T BEEN RESOLVED YET...",
                JSON.stringify(monitor.target)
              );
            else {
              try {
                const sentMessageInfo = await nodemailer
                  .createTransport(
                    monitor.email.options,
                    monitor.email.defaults
                  )
                  .sendMail({
                    subject: `⚠️ ‘${JSON.stringify(monitor.target)}’ IS DOWN`,
                    html: html`
                      <pre>
${String(error)}

${error?.stack}
</pre>
                    `,
                  });
                notifiedMonitors.add(monitor);
                application.log(
                  "ALERT SENT",
                  JSON.stringify(monitor.target),
                  sentMessageInfo.response ?? ""
                );
              } catch (error: any) {
                application.log(
                  "CATASTROPHIC ERROR TRYING TO SEND ALERT",
                  JSON.stringify(monitor.target),
                  String(error),
                  error?.stack
                );
              }
            }
          }

          application.log("FINISHED", JSON.stringify(monitor.target));
        }

        await timers.setTimeout(application.configuration.interval, undefined, {
          ref: false,
        });
      }
    })();

    await node.eventLoopActive();

    process.once("exit", () => {
      application.log("STOPPED");
    });

    await timers.setTimeout(10 * 1000, undefined, { ref: false });
    process.exit(1);
  })
  .parseAsync();
