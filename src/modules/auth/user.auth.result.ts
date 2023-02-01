export declare class UserAuthResult {
    constructor(result?: Partial<UserAuthResult>);
    issued: number;
    expires: number;
    address: string;
    host: string;
    extraInfo?: any;
}
