import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { InputTokenModel } from 'src/models/inputToken.model';
import { EnergyAbiService } from '../services/energy.abi.service';

@Injectable()
export class LockedEnergyTokensValidationPipe implements PipeTransform {
    constructor(private readonly energyAbi: EnergyAbiService) {}

    async transform(value: InputTokenModel[], metadata: ArgumentMetadata) {
        const lockedTokenID = await this.energyAbi.lockedTokenID();
        const lockedTokens = [];

        if (!Array.isArray(value)) {
            lockedTokens.push(value);
        } else {
            lockedTokens.push(...value);
        }

        for (const lockedToken of lockedTokens) {
            if (
                lockedToken.tokenID !== lockedTokenID ||
                lockedToken.nonce < 1
            ) {
                throw new UserInputError('Invalid locked token');
            }
        }

        return value;
    }
}
