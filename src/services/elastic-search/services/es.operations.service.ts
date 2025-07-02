import {
    ElasticPagination,
    ElasticQuery,
    ElasticService,
    ElasticSortOrder,
    QueryType,
} from '@multiversx/sdk-nestjs-elastic';
import { Injectable } from '@nestjs/common';
import { TermFilter } from '../entities/terms.query';

export interface Operation {
    _search: string;
    miniBlockHash: string;
    receiver: string;
    sender: string;
    value: string;
    prevTxHash?: string;
    originalTxHash?: string;
    receiverShard: number;
    senderShard: number;
    data: string;
    timestamp: number;
    tokens: string[];
    esdtValues: string[];
    type: string;
    operation: string;
    function: string;
    epoch: number;
    originalSender?: string;
}

@Injectable()
export class ESOperationsService {
    constructor(private readonly elasticService: ElasticService) {}

    async getTransactionsBySenderAndData(
        sender: string,
        data: string,
        startTimestamp: number,
    ): Promise<Operation[]> {
        const pagination = new ElasticPagination();
        pagination.size = 10000;
        const elasticQuery: ElasticQuery = new ElasticQuery().withPagination(
            pagination,
        );

        elasticQuery.condition.must = [QueryType.Match('data', data)];

        elasticQuery.filter = [
            QueryType.Range('timestamp', {
                key: 'gte',
                value: startTimestamp,
            }),
            new TermFilter('sender', sender),
            new TermFilter('status', 'success'),
        ];

        elasticQuery.sort = [
            { name: 'timestamp', order: ElasticSortOrder.descending },
        ];

        const operations: Operation[] = await this.elasticService.getList(
            'operations',
            '_search',
            elasticQuery,
        );

        return operations;
    }

    async getOperationsByHash(txHash: string): Promise<Operation[]> {
        const pagination = new ElasticPagination();
        pagination.size = 100;
        const elasticQuery: ElasticQuery = new ElasticQuery().withPagination(
            pagination,
        );

        elasticQuery.condition.must = [
            QueryType.Should([
                QueryType.Match('_id', txHash),
                QueryType.Match('originalTxHash', txHash),
            ]),
        ];

        elasticQuery.sort = [
            { name: 'timestamp', order: ElasticSortOrder.descending },
        ];

        const operations: Operation[] = await this.elasticService.getList(
            'operations',
            '_search',
            elasticQuery,
        );

        return operations;
    }
}
