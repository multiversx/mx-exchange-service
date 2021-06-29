export function base64DecodeBinary(str: string): Buffer {
    return Buffer.from(str, 'base64');
}

export function base64Decode(str: string): string {
    return base64DecodeBinary(str).toString('binary');
}
