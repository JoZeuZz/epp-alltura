module.exports = {
  apps: [
    {
      name: "alltura-backend",
      cwd: "./backend",
      script: "src/index.js",
      node_args: "-r dotenv/config",
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "alltura-frontend",
      cwd: "./frontend",
      script: "cmd.exe",
      args: "/c npm run dev",
      interpreter: "none",
      env: {
        NODE_ENV: "development",
      }
    }
  ]
};