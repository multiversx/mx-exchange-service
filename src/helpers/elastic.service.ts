import { Client } from '@elastic/elasticsearch';
import { Search } from '@elastic/elasticsearch/api/requestParams';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { generateComputeLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { buildElasticQuery } from './elastic.queries';
import { ElasticQuery } from './entities/elastic/elastic.query';

@Injectable()
export class ElasticService {
    private elasticClient: Client;
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.elasticClient = new Client({
            node: process.env.ELASTICSEARCH_URL,
        });
    }

    async getCount(
        collection: string,
        elasticQueryAdapter: ElasticQuery | undefined = undefined,
    ) {
        let elasticQuery;

        if (elasticQueryAdapter) {
            elasticQuery = buildElasticQuery(elasticQueryAdapter);
        }

        try {
            const result: any = await this.elasticClient.count({
                index: collection,
                body: {
                    query: elasticQuery.query,
                },
            });
            return result.body.count;
        } catch (error) {
            const logMessage = generateComputeLogMessage(
                ElasticService.name,
                this.getCount.name,
                'TX count',
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async scrollSearch(params: Search): Promise<any[]> {
        let response = await this.elasticClient.search(params);
        const hits = [];
        let scroll = 1;
        for (;;) {
            const sourceHits = response.body.hits.hits;

            if (sourceHits.length === 0) {
                break;
            }

            hits.push(...sourceHits);

            if (!response.body._scroll_id) {
                break;
            }

            response = await this.elasticClient.scroll({
                scroll_id: response.body._scroll_id,
                scroll: `${scroll}s`,
            });
            scroll += 1;
        }
        return hits;
    }

    async getList(
        collection: string,
        key: string,
        elasticQueryAdapter: ElasticQuery,
    ): Promise<any[]> {
        const elasticQuery = buildElasticQuery(elasticQueryAdapter);

        try {
            return await this.scrollSearch({
                index: collection,
                size: 10000,
                scroll: '5s',
                _source: [key],
                body: {
                    query: elasticQuery.query,
                },
            });
        } catch (error) {
            const logMessage = generateComputeLogMessage(
                ElasticService.name,
                this.getList.name,
                'TX list',
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
