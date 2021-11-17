import BigNumber from 'bignumber.js';

export class EsdtTokenTopics {
    private readonly tokenID: string;
    private readonly nonce: number;
    private readonly amount: string;

    constructor(rawTopics: string[]) {
        this.tokenID = Buffer.from(rawTopics[0], 'base64').toString();
        this.nonce = parseInt(
            Buffer.from(rawTopics[1], 'base64').toString('hex'),
            16,
        );
        this.amount = new BigNumber(
            Buffer.from(rawTopics[2], 'base64').toString('hex'),
            16,
        ).toFixed();
    }

    toPlainObject() {
        return {
            tokenID: this.tokenID,
            amount: this.amount,
        };
    }
}
