import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';
import { InputTokenModel } from 'src/models/inputToken.model';
import { EnergyGetterService } from '../services/energy.getter.service';

@Injectable()
export class LockedEnergyTokensValidationPipe implements PipeTransform {
    constructor(private readonly energyGetter: EnergyGetterService) {}

    async transform(value: InputTokenModel[], metadata: ArgumentMetadata) {
        const lockedTokenID = await this.energyGetter.getLockedTokenID();
        const lockedTokens = [];

        console.log(metadata.metatype[0] instanceof InputTokenModel);
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
