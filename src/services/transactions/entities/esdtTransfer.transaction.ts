import BigNumber from 'bignumber.js';
import { GenericTransaction } from './generic.transaction';

enum TransferFunctionType {
    SWAP_FIXED_INPUT = 'swapTokensFixedInput',
    SWAP_FIXED_OUTPUT = 'swapTokensFixedOutput',
}

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

    // Extract endpoint name from data: ESDTTransfer@<tokenIdentifier>@<tokenAmount>@<EndpointName>@<Arg1>@...
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

    // Extract arguments from data: ESDTTransfer@<tokenIdentifier>@<tokenAmount>@<EndpointName>@<Arg1>@...
    public getDataEndpointArgs(): string[] | undefined {
        if (!this.dataEndpointArgs) {
            const decoded = this.getDataArgs();
            if (decoded && decoded.length > 3) {
                this.dataEndpointArgs = decoded.splice(3);
            }
        }
        return this.dataEndpointArgs;
    }

    public isSwapTransaction(): boolean {
        if (
            (this.getDataEndpointName() &&
                this.getDataEndpointName() ===
                    TransferFunctionType.SWAP_FIXED_INPUT) ||
            this.getDataEndpointName() ===
                TransferFunctionType.SWAP_FIXED_OUTPUT
        ) {
            return true;
        }
        return false;
    }
}
