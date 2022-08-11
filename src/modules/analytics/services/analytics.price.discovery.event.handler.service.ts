import { DepositEventType } from '@elrondnetwork/erdjs-dex';
import { Injectable } from '@nestjs/common';
import { awsConfig, elrondData } from 'src/config';
import { PriceDiscoveryGetterService } from 'src/modules/price-discovery/services/price.discovery.getter.service';
import { AWSTimestreamWriteService } from 'src/services/aws/aws.timestream.write';
import { ElrondDataService } from 'src/services/elrond-communication/services/elrond-data.service';

@Injectable()
export class AnalyticsPriceDiscoveryEventHandlerService {
    constructor(
        private readonly priceDiscoveryGetter: PriceDiscoveryGetterService,
        private readonly awsTimestreamWrite: AWSTimestreamWriteService,
        private readonly elrondDataService: ElrondDataService,
    ) {}

    async handleEvent(event: DepositEventType): Promise<void> {
        const priceDiscoveryAddress = event.address;

        const [
            launchedTokenAmount,
            acceptedTokenAmount,
            launchedTokenPrice,
            acceptedTokenPrice,
            launchedTokenPriceUSD,
        ] = await Promise.all([
            this.priceDiscoveryGetter.getLaunchedTokenAmount(
                priceDiscoveryAddress,
            ),
            this.priceDiscoveryGetter.getAcceptedTokenAmount(
                priceDiscoveryAddress,
            ),
            this.priceDiscoveryGetter.getLaunchedTokenPrice(
                priceDiscoveryAddress,
            ),
            this.priceDiscoveryGetter.getAcceptedTokenPrice(
                priceDiscoveryAddress,
            ),
            this.priceDiscoveryGetter.getLaunchedTokenPriceUSD(
                priceDiscoveryAddress,
            ),
        ]);

        const data = [];
        data[priceDiscoveryAddress] = {
            launchedTokenAmount,
            acceptedTokenAmount,
            launchedTokenPrice,
            acceptedTokenPrice,
            launchedTokenPriceUSD,
        };

        await Promise.all([
            this.awsTimestreamWrite.ingest({
                TableName: awsConfig.timestream.tableName,
                data,
                Time: event.decodedTopics.timestamp,
            }),
            this.elrondDataService.ingestObject(
                elrondData.timescale.table,
                data,
                event.decodedTopics.timestamp,
            ),
        ]);
    }
}
