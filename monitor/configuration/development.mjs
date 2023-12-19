const email = {
  options: {
    streamTransport: true,
    buffer: true,
  },
  defaults: {
    from: "Monitor <monitor@leafac.com>",
    to: "Leandro Facchinetti <system-administrator@leafac.com>",
  },
};

export default {
  monitors: [
    {
      target: { url: "https://leafac.com" },
      email,
    },
    {
      target: { url: "https://non-existent.leafac.com" },
      email,
    },
  ],

  interval: 10 * 1000,
};
