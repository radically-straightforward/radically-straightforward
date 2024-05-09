# Setting Up for Development

This guide teaches you how to setup your development machine to work on a project that uses Radically Straightforward.

> **If you get stuck, please [open an issue](<https://github.com/radically-straightforward/radically-straightforward/issues/new?title=Issue%20in%20Setting%20Up%20for%20Development&body=**What%20did%20you%20try%20to%20do?**%0A%0A**What%20did%20you%20expect%20to%20happen?**%0A%0A**What%20really%20happened?**%0A%0A**What%20error%20messages%20(if%20any)%20did%20you%20run%20into?**%0A%0A**Please%20provide%20as%20much%20relevant%20context%20as%20possible%20(operating%20system,%20browser,%20and%20so%20forth):**>).**

1. Install the tools you need to work on Radically Straightforward applications:

   **Windows**

   Install [Chocolatey](https://chocolatey.org) and the following packages:

   ```console
   > choco install nodejs visualstudio2022-workload-vctools python git vscode
   ```

   **macOS**

   Install [Homebrew](https://brew.sh) and the following packages:

   ```console
   $ brew install node git visual-studio-code
   ```

   **Ubuntu**

   Install [Homebrew on Linux](https://docs.brew.sh/Homebrew-on-Linux) and the following packages:

   ```console
   $ brew install node git
   $ sudo snap install code --classic
   ```

   ***

   > **[Node.js](https://nodejs.org/):** A tool that allows you to run [JavaScript](https://javascript.info/), in which Radically Straightforward applications are written.
   >
   > **[Git](https://git-scm.com/):** A tool that allows you to manage the changes you make to the project that uses Radically Straightforward.
   >
   > **[Visual Studio Code](https://code.visualstudio.com/):** A text editor and terminal.

2. Setup Git:

   ```console
   $ git config --global user.name "YOUR NAME"
   $ git config --global user.email "YOUR-EMAIL@EXAMPLE.COM"
   $ git config --global init.defaultBranch main
   ```

3. [Create a GitHub account](https://github.com/signup) and [setup SSH keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

4. Install the following Visual Studio Code extensions:

   - **[ES6 String HTML](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html):** Syntax highlighting for SQL, HTML, CSS, and browser JavaScript as tagged templates.
   - **[Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode):** Integration with [Prettier](https://prettier.io), the code formatter used by Radically Straightforward applications.

5. Clone the codebase, install the dependencies, and run the application:

   ```console
   $ git clone git@github.com:EXAMPLE-ORGANIZATION/EXAMPLE-APPLICATION.git
   $ cd EXAMPLE-APPLICATION/
   $ npm install
   $ npm start
   ```

   Visit <https://localhost>.

6. If you need to test the application on a phone follow these steps:

   1. Establish a network connection between your development machine and the phone. The details of how to do that depends on your network, but often that amounts to having them on the same wifi. Take note of the name with which you may access the development machine from the phone, for example:

      ```console
      $ hostname
      YOUR-HOSTNAME
      ```

   2. Send the root TLS certificate from the development machine to the phone. You may use any file transferring tool between development machine and phone, for example, AirDrop. The location of the TLS certificate may be determined with the following command:

      ```console
      $ node --print "(async () => path.join((await import('@radically-straightforward/caddy')).dataDirectory(), 'pki/authorities/local/root.crt'))()"
      ```

   3. On the phone, **install** and **trust** the certificate. The details of how to do that depends on your phone.

   4. Run the application with the hostname that may be accessed by the phone, for example:

      ```console
      $ env HOSTNAME=YOUR-HOSTNAME.local npm start
      ```

   5. On the phone, visit `https://YOUR-HOSTNAME.local`.
