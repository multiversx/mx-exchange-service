import { base64Decode } from '../../../helpers/helpers';

export class GenericTransaction {
    hash = '';
    nonce = 0;
    value = 0;
    receiver = '';
    sender = '';
    data: string | undefined;

    private dataDecoded: string | undefined;
    private dataFunctionName: string | undefined;
    private dataArgs: string[] | undefined;

    private getDataDecoded(): string | undefined {
        if (!this.dataDecoded) {
            if (this.data) {
                this.dataDecoded = base64Decode(this.data);
            }
        }

        return this.dataDecoded;
    }

    public getDataFunctionName(): string | undefined {
        if (!this.dataFunctionName) {
            const decoded = this.getDataDecoded();
            if (decoded) {
                this.dataFunctionName = decoded.split('@')[0];
            }
        }

        return this.dataFunctionName;
    }

    public getDataArgs(): string[] | undefined {
        if (!this.dataArgs) {
            const decoded = this.getDataDecoded();
            if (decoded) {
                this.dataArgs = decoded.split('@').splice(1);
            }
        }

        return this.dataArgs;
    }
}
