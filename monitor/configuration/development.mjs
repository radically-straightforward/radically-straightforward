export default {
  resources: ["https://leafac.com", "https://non-existent.leafac.com"],
  email: {
    options: {
      host: "localhost",
      port: 8001,
    },
    defaults: {
      from: "Monitor <monitor@leafac.com>",
      to: "Leandro Facchinetti <system-administrator@leafac.com>",
    },
  },
};
