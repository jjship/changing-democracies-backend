import pinoPretty from 'pino-pretty';
import pino, { BaseLogger, Bindings, ChildLoggerOptions } from 'pino';

export { logger };
export type { Logger };

type Logger = BaseLogger & {
  child: (bindings: Bindings, options?: ChildLoggerOptions) => Logger;
};

const logLevel = process.env.LOG_LEVEL ?? 'info';

const logger =
  process.env.NODE_ENV === 'production'
    ? pino({ level: logLevel })
    : pino(
        { level: logLevel },
        pinoPretty({
          levelFirst: true,
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
        })
      );
