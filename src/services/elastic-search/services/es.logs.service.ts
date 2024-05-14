import { SwapEvent } from '@multiversx/sdk-exchange';
import {
    ElasticQuery,
    ElasticSortOrder,
    QueryType,
} from '@multiversx/sdk-nestjs-elastic';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ElasticService } from 'src/helpers/elastic.service';
import { Logger } from 'winston';

@Injectable()
export class ESLogsService {
    constructor(
        private readonly elasticService: ElasticService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getTokenSwapsCount(
        startTimestamp: number,
        endTimestamp: number,
    ): Promise<Map<string, number>> {
        const swapEvents: SwapEvent[] = [];
        const tokensSwapCountMap: Map<string, number> = new Map();

        const [txLogsSwapFixedInput, txLogsSwapFixedOutput] = await Promise.all(
            [
                this.getTransactionsLogs(
                    'swapTokensFixedInput',
                    startTimestamp,
                    endTimestamp,
                ),
                this.getTransactionsLogs(
                    'swapTokensFixedOutput',
                    startTimestamp,
                    endTimestamp,
                ),
            ],
        );

        for (const transactionLogs of txLogsSwapFixedInput) {
            swapEvents.push(
                ...this.processSwapEvents(transactionLogs._source.events),
            );
        }

        for (const transactionLogs of txLogsSwapFixedOutput) {
            swapEvents.push(
                ...this.processSwapEvents(transactionLogs._source.events),
            );
        }

        for (const swapEvent of swapEvents) {
            const eventTopics = swapEvent.getTopics();

            if (tokensSwapCountMap.has(eventTopics.firstTokenID)) {
                const currentCount = tokensSwapCountMap.get(
                    eventTopics.firstTokenID,
                );
                tokensSwapCountMap.set(
                    eventTopics.firstTokenID,
                    currentCount + 1,
                );
            } else {
                tokensSwapCountMap.set(eventTopics.firstTokenID, 1);
            }
        }

        return tokensSwapCountMap;
    }

    private async getTransactionsLogs(
        eventName: string,
        startTimestamp: number,
        endTimestamp: number,
    ): Promise<any[]> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Nested('events', [
                QueryType.Match('events.identifier', eventName),
            ]),
        ];

        elasticQueryAdapter.filter = [
            QueryType.Range(
                'timestamp',
                {
                    key: 'gte',
                    value: startTimestamp,
                },
                {
                    key: 'lte',
                    value: endTimestamp,
                },
            ),
        ];

        elasticQueryAdapter.sort = [
            { name: 'timestamp', order: ElasticSortOrder.ascending },
        ];

        return await this.elasticService.getList(
            'logs',
            '',
            elasticQueryAdapter,
        );
    }

    private processSwapEvents(events: any[]): SwapEvent[] {
        const esdtSwapEvents: SwapEvent[] = [];

        for (const event of events) {
            switch (event.identifier) {
                case 'swapTokensFixedInput':
                    esdtSwapEvents.push(new SwapEvent(event));
                    break;
                case 'swapTokensFixedOutput':
                    esdtSwapEvents.push(new SwapEvent(event));
                    break;
                default:
                    break;
            }
        }

        return esdtSwapEvents;
    }
}
