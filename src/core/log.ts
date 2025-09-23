import Config from "miz/config/config.toml";
import dayjs from "dayjs";
import path from "path";
import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf } = format;

const logDir = path.join(Config.Log.dir, dayjs().format("YYYY-MM-DD"));

const logFormat = printf(
  ({ level, message, timestamp }) =>
    `[${timestamp}] [${level.toUpperCase()}]: ${message}`
);

const Logger = createLogger({
  level: Config.Log.level,
  format: combine(timestamp(), logFormat),
  transports: [
    new transports.Console(),
    new transports.File({
      dirname: logDir,
      filename: "error.log",
      level: "error",
    }),
    new transports.File({
      dirname: logDir,
      filename: "warn.log",
      level: "warn",
    }),
  ],
});

export { Logger };
