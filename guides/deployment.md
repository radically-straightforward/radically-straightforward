# Deployment

This guide teaches you how to install a project that uses Radically Straightforward on your server.

> **If you get stuck, please [open an issue](<https://github.com/radically-straightforward/radically-straightforward/issues/new?title=Issue%20in%20Deployment&body=**What%20did%20you%20try%20to%20do?**%0A%0A**What%20did%20you%20expect%20to%20happen?**%0A%0A**What%20really%20happened?**%0A%0A**What%20error%20messages%20(if%20any)%20did%20you%20run%20into?**%0A%0A**Please%20provide%20as%20much%20relevant%20context%20as%20possible%20(operating%20system,%20browser,%20and%20so%20forth):**>).**

> **Note:** We use [Namecheap](https://www.namecheap.com/) to get our domains and manage DNS and [DigitalOcean](https://www.digitalocean.com/) to rent our servers.

1. Set DNS records that map your domain (or subdomain) to the IP address of your server. For example, `A example-application.leafac.com 138.197.228.15`.

   > **Note:** We recommend that you use DigitalOcean’s Reserved IP feature so that in the future you may switch to a new machine with less downtime, because it’s faster to switch a Reserved IP to point to a new machine than it is to change a DNS record.

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

- Upgrades.
- Monitoring.
- Backup.
- Migrate to new machine.
