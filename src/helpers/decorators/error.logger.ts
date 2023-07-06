import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

interface IErrorLoggerOptions {
    className?: string;
    logArgs?: boolean;
}

const getErrorText = (
    methodName: string,
    options: IErrorLoggerOptions,
    ...args: any[]
) => {
    const defaultText = `Error executing ${
        options.className ? options.className + '.' + methodName : methodName
    }`;

    if (options.logArgs)
        return `${defaultText} with args ${args
            .map((arg) => JSON.stringify(arg))
            .join(', ')}`;

    return defaultText;
};

export function ErrorLoggerAsync(options?: IErrorLoggerOptions) {
    const loggerInjector = Inject(WINSTON_MODULE_NEST_PROVIDER);

    return function (
        target: any,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor,
    ) {
        loggerInjector(target, 'logger');

        const childMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const logger: LoggerService = this.logger;
            try {
                return await childMethod.apply(this, args);
            } catch (error) {
                logger.error(
                    getErrorText(String(propertyKey), options, ...args),
                    error.stack,
                    ErrorLoggerAsync.name,
                );
                throw error;
            }
        };
        return descriptor;
    };
}
