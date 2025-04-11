import {
    ElasticPagination,
    ElasticQuery,
    ElasticService,
    ElasticSortOrder,
    QueryType,
} from '@multiversx/sdk-nestjs-elastic';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CustomTermsQuery, TermFilter } from '../entities/terms.query';

export interface Block {
    hash: string;
    nonce: number;
    round: number;
    epoch: number;
    miniBlocksHashes: string[];
    miniBlocksDetails: MiniBlockDetails[];
    notarizedBlocksHashes?: string[];
    proposer: number;
    validators: number[];
    pubKeyBitmap: string;
    size: number;
    sizeTxs: number;
    timestamp: number;
    stateRootHash: string;
    prevHash: string;
    shardId: number;
    txCount: number;
    notarizedTxsCount: number;
    accumulatedFees: string;
    developerFees: string;
    epochStartBlock: boolean;
    searchOrder: number;
    gasProvided: string;
    gasRefunded: string;
    gasPenalized: number;
    maxGasLimit: string;
}

export interface MiniBlockDetails {
    firstProcessedTx: number;
    lastProcessedTx: number;
    senderShard: number;
    receiverShard: number;
    mbIndex: number;
    type: string;
    procType: string;
    txsHashes: string[];
    executionOrderTxsIndices: number[];
}

@Injectable()
export class ESBlocksService {
    constructor(
        private readonly elasticService: ElasticService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getBlockByTimestampAndShardId(
        timestamp: number,
        shardId: number,
    ): Promise<Block | undefined> {
        const pagination = new ElasticPagination();
        pagination.size = 1;
        const elasticQuery: ElasticQuery = new ElasticQuery().withPagination(
            pagination,
        );

        elasticQuery.filter = [
            QueryType.Range('timestamp', {
                key: 'gte',
                value: timestamp,
            }),
            new TermFilter('shardId', shardId),
        ];

        elasticQuery.sort = [
            { name: 'timestamp', order: ElasticSortOrder.ascending },
        ];

        const blocks: Block[] = await this.elasticService.getList(
            'blocks',
            '_search',
            elasticQuery,
        );

        return blocks.at(0);
    }

    async getBlockByHash(hash: string): Promise<Block | undefined> {
        const pagination = new ElasticPagination();
        pagination.size = 1;
        const elasticQuery: ElasticQuery = new ElasticQuery().withPagination(
            pagination,
        );

        elasticQuery.filter = [new TermFilter('_id', hash)];

        const blocks: Block[] = await this.elasticService.getList(
            'blocks',
            '_search',
            elasticQuery,
        );

        return blocks.at(0);
    }

    async getBlockByMiniBlockHash(
        miniBlockHash: string,
        shardId: number,
    ): Promise<Block | undefined> {
        const pagination = new ElasticPagination();
        pagination.size = 1;
        const elasticQuery: ElasticQuery = new ElasticQuery().withPagination(
            pagination,
        );

        elasticQuery.filter = [
            new CustomTermsQuery('miniBlocksHashes', [miniBlockHash]),
            new TermFilter('shardId', shardId),
        ];

        elasticQuery.sort = [
            { name: 'timestamp', order: ElasticSortOrder.ascending },
        ];

        const blocks: Block[] = await this.elasticService.getList(
            'blocks',
            '_search',
            elasticQuery,
        );

        return blocks.at(0);
    }
}
