export default {
  resources: ["http://localhost:8000", "http://localhost:18000"],
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
