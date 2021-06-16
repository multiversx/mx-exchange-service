import { Injectable } from '@nestjs/common';
import { ProxyProvider, Address, SmartContract } from '@elrondnetwork/erdjs';
import { elrondConfig, abiConfig, scAddress } from '../../config';
import { AbiRegistry } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { UnlockMileStoneModel } from '../models/locked-asset.model';

@Injectable()
export class AbiLockedAssetService {
    private readonly proxy: ProxyProvider;

    constructor() {
        this.proxy = new ProxyProvider(
            elrondConfig.elrondApi,
            elrondConfig.proxyTimeout,
        );
    }

    async getContract(): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.lockedAssetFactory],
        });
        const abi = new SmartContractAbi(abiRegistry, ['LockedAssetFactory']);
        const contract = new SmartContract({
            address: new Address(scAddress.lockedAssetAddress),
            abi: abi,
        });

        return contract;
    }

    async getLockedTokenID(): Promise<string> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getLockedAssetTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);

        const lockedTokenID = result.firstValue.valueOf().toString();

        return lockedTokenID;
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getDefaultUnlockPeriod(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);

        const unlockMilestones: UnlockMileStoneModel[] = result.firstValue
            .valueOf()
            .map(unlockMilestone => {
                return {
                    epoch: unlockMilestone.unlock_epoch,
                    percent: unlockMilestone.unlock_percent,
                };
            });

        return unlockMilestones;
    }
}
