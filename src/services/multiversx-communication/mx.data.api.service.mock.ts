export class MXDataApiServiceMock {
    async getTokenPrice(tokenTicker: string): Promise<number> {
        return 1;
    }
}
