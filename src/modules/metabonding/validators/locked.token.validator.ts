import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { InputTokenModel } from 'src/models/inputToken.model';
import { MetabondingAbiService } from '../services/metabonding.abi.service';

@Injectable()
export class LockedTokenValidator implements PipeTransform {
    constructor(private readonly metabondingAbi: MetabondingAbiService) {}

    async transform(value: InputTokenModel, metadata: ArgumentMetadata) {
        const lockedAssetTokenID =
            await this.metabondingAbi.lockedAssetTokenID();

        if (lockedAssetTokenID !== value.tokenID || value.nonce === 0) {
            throw new UserInputError('invalid input tokens');
        }

        return value;
    }
}
