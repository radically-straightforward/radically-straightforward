export default {
  targets: [
    { url: "https://leafac.com" },
    { url: "https://non-existent.leafac.com" },
  ],
  email: {
    options: {
      streamTransport: true,
      buffer: true,
    },
    defaults: {
      from: "Monitor <monitor@leafac.com>",
      to: "Leandro Facchinetti <system-administrator@leafac.com>",
    },
  },
};
