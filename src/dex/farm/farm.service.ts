import { Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { ProxyProvider, Interaction } from '@elrondnetwork/erdjs';
import { elrondConfig, farmsConfig } from '../../config';
import { ContextService } from '../utils/context.service';
import { BigNumber } from 'bignumber.js';
import { TokenModel } from '../models/pair.model';
import { FarmModel } from '../models/farm.model';
import { CacheFarmService } from 'src/services/cache-manager/cache-farm.service';
import { AbiFarmService } from './abi-farm.service';
import { CalculateRewardsArgs } from './dto/farm.args';

@Injectable()
export class FarmService {
    private readonly proxy: ProxyProvider;

    constructor(
        private abiService: AbiFarmService,
        private cacheService: CacheFarmService,
        private context: ContextService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
    }

    async getFarmedToken(farmAddress: string): Promise<TokenModel> {
        const farmedTokenID = await this.getFarmedTokenID(farmAddress);
        return this.context.getTokenMetadata(farmedTokenID);
    }

    async getFarmToken(farmAddress: string): Promise<TokenModel> {
        const farmTokenID = await this.getFarmTokenID(farmAddress);
        return this.context.getTokenMetadata(farmTokenID);
    }

    async getAcceptedToken(farmAddress: string): Promise<TokenModel> {
        const acceptedTokenID = await this.getAcceptedTokenID(farmAddress);
        return this.context.getTokenMetadata(acceptedTokenID);
    }

    async getState(farmAddress: string): Promise<string> {
        const contract = await this.abiService.getContract(farmAddress);
        return await this.context.getState(contract);
    }

    async getFarms(): Promise<FarmModel[]> {
        const farms: Array<FarmModel> = [];
        for (const farmsAddress of farmsConfig) {
            const farm = new FarmModel();
            farm.address = farmsAddress;
            farms.push(farm);
        }

        return farms;
    }

    async getRewardsForPosition(args: CalculateRewardsArgs): Promise<string> {
        const farmedToken = await this.getFarmedToken(args.farmAddress);

        const rewards = await this.abiService.calculateRewardsForGivenPosition(
            args,
        );

        return this.context.fromBigNumber(rewards, farmedToken).toString();
    }

    private async getFarmedTokenID(farmAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getFarmedTokenID(
            farmAddress,
        );
        if (!!cachedData) {
            return cachedData.farmedTokenID;
        }

        const farmedTokenID = await this.abiService.getFarmedTokenID(
            farmAddress,
        );
        this.cacheService.setFarmedTokenID(farmAddress, {
            farmedTokenID: farmedTokenID,
        });
        return farmedTokenID;
    }

    private async getFarmTokenID(farmAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getFarmTokenID(farmAddress);
        if (!!cachedData) {
            return cachedData.farmTokenID;
        }

        const farmTokenID = await this.abiService.getFarmTokenID(farmAddress);
        this.cacheService.setFarmTokenID(farmAddress, {
            farmTokenID: farmTokenID,
        });
        return farmTokenID;
    }

    private async getAcceptedTokenID(farmAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getAcceptedTokenID(
            farmAddress,
        );
        if (!!cachedData) {
            return cachedData.acceptedTokenID;
        }

        const acceptedTokenID = await this.abiService.getAcceptedTokenID(
            farmAddress,
        );
        this.cacheService.setAcceptedTokenID(farmAddress, {
            acceptedTokenID: acceptedTokenID,
        });
        return acceptedTokenID;
    }
}
