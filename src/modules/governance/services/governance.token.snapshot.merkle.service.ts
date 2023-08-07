import { Inject, Injectable } from '@nestjs/common';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MerkleTreeUtils } from '../../../utils/merkle-tree/markle-tree.utils';
import { promises } from 'fs';

@Injectable()
export class GovernanceTokenSnapshotMerkleService {
    private static merkleTrees: MerkleTreeUtils[];

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        GovernanceTokenSnapshotMerkleService.merkleTrees = [];
    }

    async getMerkleTree(
        contractAddress: string,
        proposalId: number,
    ): Promise<MerkleTreeUtils> {
        const key = `${contractAddress}.${proposalId}`;
        return (
            GovernanceTokenSnapshotMerkleService.merkleTrees[key] ||
            this.createMerkleTree(
                contractAddress,
                proposalId
            )
        );
    }

    async getAddressBalance(
        contractAddress: string,
        proposalId: number,
        address: string,
    ): Promise<string> {
        const merkleTree = await this.getMerkleTree(
            contractAddress,
            proposalId
        );
        return merkleTree.getLeaves().find(leaf => leaf.address === address)?.balance ?? '0';
    }

    private async createMerkleTree(
        contractAddress: string,
        proposalId: number,
    ): Promise<MerkleTreeUtils> {
        const jsonContent: string = await promises.readFile(`./src/snapshots/${contractAddress}_${proposalId}.json`, {
            encoding: 'utf8',
        });
        const leaves = JSON.parse(jsonContent);
        const newMT = new MerkleTreeUtils(leaves);
        const key = `${contractAddress}.${proposalId}`;
        GovernanceTokenSnapshotMerkleService.merkleTrees[key] = newMT;
        return newMT;
    }
}
