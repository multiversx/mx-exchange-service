import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { currentRequestId } from './request.id';

const LOCAL_ENVIRONMENTS = ['development', 'test'];

const errorSanitizer = winston.format((info) => {
    // Sanitize splat args (extra arguments passed to logger.error)
    const splat = info[Symbol.for('splat') as any];
    if (Array.isArray(splat)) {
        for (let i = 0; i < splat.length; i++) {
            if (splat[i] instanceof Error || splat[i]?.stack) {
                splat[i] = {
                    message: splat[i].message,
                    ...(splat[i].code !== undefined && { code: splat[i].code }),
                    ...(splat[i].details && { details: splat[i].details }),
                };
            }
        }
    }
    // Remove stack trace from the info object itself
    if (info.stack) {
        delete info.stack;
    }
    return info;
});

const requestId = winston.format((info) => {
    const id = currentRequestId();
    if (id !== undefined) {
        info.requestId = id;
    }
    return info;
});

// Logger-level, so Error messages survive transport copies; no stacks.
export function loggerFormat(): winston.Logform.Format {
    return winston.format.errors();
}

// JSON lines in deployed environments; readable Nest format in dev and test.
export function consoleLogFormat(
    nodeEnv = process.env.NODE_ENV,
): winston.Logform.Format {
    if (!LOCAL_ENVIRONMENTS.includes(nodeEnv)) {
        return jsonLogFormat();
    }

    return winston.format.combine(
        winston.format.timestamp(),
        errorSanitizer(),
        requestId(),
        nestWinstonModuleUtilities.format.nestLike('xExchangeService', {
            colors: true,
            prettyPrint: true,
        }),
    );
}

// One JSON line per entry: log files, and the console when deployed.
export function jsonLogFormat(): winston.Logform.Format {
    return winston.format.combine(
        winston.format.timestamp(),
        errorSanitizer(),
        requestId(),
        winston.format.json(),
    );
}
