module.exports = {
  apps: [
    {
      name: "absensi-smkn1",
      script: "npx",
      args: "tsx server.ts",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
