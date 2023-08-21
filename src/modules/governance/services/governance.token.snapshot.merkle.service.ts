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
        rootHash: string,
    ): Promise<MerkleTreeUtils> {
        return (
            GovernanceTokenSnapshotMerkleService.merkleTrees[rootHash] ||
            this.createMerkleTree(rootHash)
        );
    }

    async getAddressBalance(
        roothash: string,
        address: string,
    ): Promise<string> {
        const merkleTree = await this.getMerkleTree(
            roothash,
        );
        return merkleTree.getLeaves().find(leaf => leaf.address === address)?.balance ?? '0';
    }

    private async createMerkleTree(
        rootHash: string,
    ): Promise<MerkleTreeUtils> {
        const jsonContent: string = await promises.readFile(`./src/snapshots/${rootHash}.json`, {
            encoding: 'utf8',
        });
        const leaves = JSON.parse(jsonContent);
        const newMT = new MerkleTreeUtils(leaves);
        if (newMT.getRootHash() !== `0x${rootHash}`) {
            throw new Error("Computed root hash doesn't match the provided root hash.");
        }

        GovernanceTokenSnapshotMerkleService.merkleTrees[rootHash] = newMT;
        return newMT;
    }
}
