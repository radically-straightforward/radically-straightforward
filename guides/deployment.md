# Deployment

This guide teaches you how to install a project that uses Radically Straightforward on your server.

> **If you get stuck, please [open an issue](<https://github.com/radically-straightforward/radically-straightforward/issues/new?title=Issue%20in%20Deployment&body=**What%20did%20you%20try%20to%20do?**%0A%0A**What%20did%20you%20expect%20to%20happen?**%0A%0A**What%20really%20happened?**%0A%0A**What%20error%20messages%20(if%20any)%20did%20you%20run%20into?**%0A%0A**Please%20provide%20as%20much%20relevant%20context%20as%20possible%20(operating%20system,%20browser,%20and%20so%20forth):**>).**

## Installation

> **Note:** We rent servers from [DigitalOcean](https://www.digitalocean.com/), and register domains and manage DNS with [Namecheap](https://www.namecheap.com/).

1. Set DNS records that map your domain (or subdomain) to the IP address of your server. For example, `A EXAMPLE-APPLICATION.com 138.197.228.15`.

   > **Note:** We recommend that you use [DigitalOcean’s Reserved IP](https://docs.digitalocean.com/products/networking/reserved-ips/) feature so that in the future you may switch to a new machine with less downtime, because switching a Reserved IP to point to a new machine is faster than updating a DNS record.

2. On your server, download the application, configure it, and start it:

   ```console
   # mkdir -p example-application/
   # cd example-application/
   # wget "https://github.com/EXAMPLE-ORGANIZATION/EXAMPLE-APPLICATION/releases/download/v2.0.1/EXAMPLE-APPLICATION--ubuntu--v2.0.1.tar.gz"
   # tar -xzf EXAMPLE-APPLICATION--ubuntu--v2.0.1.tar.gz
   # cp EXAMPLE-APPLICATION/_/configuration/example.mjs configuration.mjs
   # nano configuration.mjs
   # cp EXAMPLE-APPLICATION/_/configuration/EXAMPLE-APPLICATION.service /etc/systemd/system/EXAMPLE-APPLICATION.service
   # systemctl daemon-reload
   # systemctl start EXAMPLE-APPLICATION
   # systemctl enable EXAMPLE-APPLICATION
   ```

   > **Note:** We recommend that you use [DigitalOcean’s Monitoring](https://docs.digitalocean.com/products/monitoring/) and [Uptime](https://docs.digitalocean.com/products/uptime/) features to alert you of any issues on the server.

## Backup and Migration

All the application data is stored under the `data/` directory. You may perform backups and migrations to new machines by copying that directory, for example:

```console
$ rsync -a --delete --progress root@EXAMPLE-APPLICATION.com:EXAMPLE-APPLICATION/data/ /path/to/backup/
```

## Upgrade

> **Always backup before an upgrade.**

> **Note:** For major updates there are breaking changing requiring extra steps which are documented in the changelog.

Download a new version of the application, replace it in the installation directory, and restart it:

```console
# rm -rf /root/EXAMPLE-APPLICATION--deploy/
# mkdir /root/EXAMPLE-APPLICATION--deploy/
# cd /root/EXAMPLE-APPLICATION--deploy/
# wget "https://github.com/EXAMPLE-ORGANIZATION/EXAMPLE-APPLICATION/releases/download/v2.0.1/EXAMPLE-APPLICATION--ubuntu--v2.0.2.tar.gz"
# tar -xzf ./EXAMPLE-APPLICATION--ubuntu--${{ github.ref_name }}.tar.gz
# systemctl stop EXAMPLE-APPLICATION
# mv /root/EXAMPLE-APPLICATION/EXAMPLE-APPLICATION/ /root/EXAMPLE-APPLICATION--deploy/EXAMPLE-APPLICATION--old/ || true
# mv /root/EXAMPLE-APPLICATION--deploy/EXAMPLE-APPLICATION/ /root/EXAMPLE-APPLICATION/EXAMPLE-APPLICATION/
# systemctl start EXAMPLE-APPLICATION
# systemctl enable EXAMPLE-APPLICATION
# rm -rf /root/EXAMPLE-APPLICATION--deploy/
```
