export enum VmQueryError {
    BAD_ARRAY_LENGTH = 'bad array length',
    INVALID_FUNCTION = 'invalid function',
    FUNCTION_NOT_FOUND = 'function not found',
    INPUT_TOO_SHORT = 'storage decode error: input too short'
}

export const ErrorGetContractHandlerNotSet = new Error("getContractHandler not set");
export const ErrorNotImplemented = new Error("Not implemented");