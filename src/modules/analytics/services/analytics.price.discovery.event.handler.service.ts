import { DepositEventType } from '@elrondnetwork/elrond-sdk-erdjs-dex';
import { Injectable } from '@nestjs/common';
import { awsConfig } from 'src/config';
import { PriceDiscoveryGetterService } from 'src/modules/price-discovery/services/price.discovery.getter.service';
import { AWSTimestreamWriteService } from 'src/services/aws/aws.timestream.write';

@Injectable()
export class AnalyticsPriceDiscoveryEventHandlerService {
    constructor(
        private readonly priceDiscoveryGetter: PriceDiscoveryGetterService,
        private readonly awsTimestreamWrite: AWSTimestreamWriteService,
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

        await this.awsTimestreamWrite.ingest({
            TableName: awsConfig.timestream.tableName,
            data,
            Time: event.decodedTopics.timestamp,
        });
    }
}
