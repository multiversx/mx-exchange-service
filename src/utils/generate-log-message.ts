enum LogType {
    GET = 'get',
    SET = 'set',
    DELETE = 'delete',
    COMPUTE = 'compute',
}

export const generateLogMessage = (
    className: string,
    methodName: string,
    messageKey: string,
    error: any,
    logType?: LogType,
) => {
    const path = `${className}.${methodName}`;
    const message = logType
        ? `An error occurred while ${logType} ${messageKey}`
        : `An error occurred while ${messageKey}`;
    return [message, error, path];
};

export const generateGetLogMessage = (
    className: string,
    methodName: string,
    messageKey: string,
    error: any,
) => {
    return generateLogMessage(
        className,
        methodName,
        messageKey,
        error,
        LogType.GET,
    );
};

export const generateSetLogMessage = (
    className: string,
    methodName: string,
    messageKey: string,
    error: any,
) => {
    return generateLogMessage(
        className,
        methodName,
        messageKey,
        error,
        LogType.SET,
    );
};

export const generateDeleteLogMessage = (
    className: string,
    methodName: string,
    messageKey: string,
    error: any,
) => {
    return generateLogMessage(
        className,
        methodName,
        messageKey,
        error,
        LogType.DELETE,
    );
};

export const generateComputeLogMessage = (
    className: string,
    methodName: string,
    messageKey: string,
    error: any,
) => {
    return generateLogMessage(
        className,
        methodName,
        messageKey,
        error,
        LogType.COMPUTE,
    );
};
