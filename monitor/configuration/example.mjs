export default {
  // See ‘https://github.com/sindresorhus/got/blob/main/documentation/2-options.md’.
  targets: [
    { url: "https://example.com" },
    // ...
  ],

  // See ‘https://nodemailer.com/smtp/’.
  email: {
    options: {
      host: "smtp.example.com",
      auth: {
        user: "username",
        pass: "password",
      },
    },
    defaults: {
      from: "Monitor <monitor@example.com>",
      to: "System Administrator <system-administrator@example.com>",
    },
  },

  // [OPTIONAL] The interval between checks in milliseconds.
  // interval: 5 * 60 * 1000,
};
