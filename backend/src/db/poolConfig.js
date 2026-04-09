const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const getPoolConfig = () => {
  const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: parsePositiveInt(process.env.DB_POOL_MAX, 20),
    idleTimeoutMillis: parsePositiveInt(process.env.DB_POOL_IDLE_MS, 30000),
    connectionTimeoutMillis: parsePositiveInt(process.env.DB_POOL_CONN_TIMEOUT_MS, 2000),
  };

  const maxUses = parsePositiveInt(process.env.DB_POOL_MAX_USES, 0);
  if (maxUses > 0) {
    config.maxUses = maxUses;
  }

  return config;
};

module.exports = {
  getPoolConfig,
};
