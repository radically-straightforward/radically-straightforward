# Radically Straightforward · Monitor

**👀 Monitor web applications and send email alerts**

## Installation

Download from [GitHub Releases](https://github.com/radically-straightforward/radically-straightforward/releases).

## Usage

Create a configuration file based on [`example.mjs`](./configuration/example.mjs).

Call monitor from the command line passing the configuration file as a parameter:

```console
$ ./monitor/monitor ./configuration.mjs
```

`monitor` requests the `resources` every 5 minutes with a timeout of 1 minute and, if there’s an error, it sends an email alert.

For `monitor` to start on boot and to restart in case of failure, use the operating system’s process manager, for example, in Ubuntu use systemd, create `/etc/systemd/system/monitor.service` based on [`monitor.service`](./configuration/monitor.service), then start and enable the service:

```console
$ systemctl daemon-reload
$ systemctl start monitor
$ systemctl enable monitor
```
