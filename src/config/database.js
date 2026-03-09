require('dotenv').config();

const normalizeDialect = (dialect) => {
  if (!dialect) return dialect;
  return dialect === 'postgresql' ? 'postgres' : dialect;
};

const configuredDialect = normalizeDialect(process.env.DB_DIALECT);

module.exports = {
  development: {
    dialect: configuredDialect || 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    pool: {
      max: 1,
      min: 1,
      acquire: 60000,
      idle: 10000
    }
  },
  production: {
    use_env_variable: process.env.DATABASE_URL ? 'DATABASE_URL' : undefined,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: configuredDialect || 'postgres',
    logging: false,
    dialectOptions: configuredDialect === 'sqlite' ? undefined : {
      ssl: {
        require: process.env.DB_SSL !== 'false',
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  }
}; 