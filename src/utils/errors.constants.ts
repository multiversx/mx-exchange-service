export enum VmQueryError {
    BAD_ARRAY_LENGTH = 'bad array length',
    INVALID_FUNCTION = 'invalid function',
    FUNCTION_NOT_FOUND = 'function not found',
    INPUT_TOO_SHORT = 'storage decode error: input too short'
}

export function ErrorNotImplemented() {
    throw new Error("Method not implemented")
}

export function ErrorGetContractHandlerNotSet() {
    throw new Error("getContractHandler not set")
}
