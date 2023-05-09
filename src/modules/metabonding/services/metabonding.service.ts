import { Injectable } from '@nestjs/common';
import { scAddress } from 'src/config';
import { MetabondingStakingModel } from '../models/metabonding.model';
import { MetabondingAbiService } from './metabonding.abi.service';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';

@Injectable()
export class MetabondingService {
    constructor(
        private readonly metabondingAbi: MetabondingAbiService,
        private readonly tokenGetter: TokenGetterService,
    ) {}

    getMetabondingStaking(): MetabondingStakingModel {
        return new MetabondingStakingModel({
            address: scAddress.metabondingStakingAddress,
        });
    }

    async lockedAssetToken(): Promise<NftCollection> {
        const lockedAssetTokenID =
            await this.metabondingAbi.lockedAssetTokenID();
        return await this.tokenGetter.getNftCollectionMetadata(
            lockedAssetTokenID,
        );
    }
}
