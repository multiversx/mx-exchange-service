import BigNumber from 'bignumber.js';
import { GenericTransaction } from './generic.transaction';

export class ESDTTransferTransaction extends GenericTransaction {
    private dataESDTIdentifier: string | undefined;
    private dataESDTAmount: BigNumber | undefined;
    private dataEndpointName: string | undefined;
    private dataEndpointArgs: string[] | undefined;

    public getDataESDTIdentifier(): string | undefined {
        if (!this.dataESDTIdentifier) {
            const decoded = this.getDataArgs();
            if (decoded) {
                this.dataESDTIdentifier = Buffer.from(
                    decoded[0],
                    'hex',
                ).toString();
            }
        }
        return this.dataESDTIdentifier;
    }

    public getDataESDTAmount(): BigNumber | undefined {
        if (!this.dataESDTAmount) {
            const decoded = this.getDataArgs();
            if (decoded) {
                this.dataESDTAmount = new BigNumber(`0x${decoded[1]}`);
            }
        }
        return this.dataESDTAmount;
    }

    public getDataEndpointName(): string | undefined {
        if (!this.dataEndpointName) {
            const decoded = this.getDataArgs();
            if (decoded && decoded.length > 2) {
                this.dataEndpointName = Buffer.from(
                    decoded[2],
                    'hex',
                ).toString();
            }
        }
        return this.dataEndpointName;
    }

    public getDataEndpointArgs(): string[] | undefined {
        if (!this.dataEndpointArgs) {
            const decoded = this.getDataArgs();
            if (decoded && decoded.length > 2) {
                this.dataEndpointArgs = decoded.splice(2);
            }
        }
        return this.dataEndpointArgs;
    }
}
