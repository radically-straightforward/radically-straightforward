export default {
  // See ‘https://developer.mozilla.org/en-US/docs/Web/API/fetch#resource’.
  resources: [
    "https://example.com",
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
};
