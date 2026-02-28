module.exports = {
  apps: [
    {
      name: "saas-backend",
      cwd: "/home/ubuntu/app/backend",
      script: "index.js",
      node_args: "--experimental-modules",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
        FRONTEND_ORIGIN: "http://localhost",   // Nginx proxies, so same-origin
      },
    },
  ],
};
