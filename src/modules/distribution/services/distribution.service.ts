import { Inject, Injectable } from '@nestjs/common';
import { scAddress } from '../../../config';
import { DistributionModel } from '../models/distribution.model';
import { AbiDistributionService } from './abi-distribution.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateGetLogMessage } from '../../../utils/generate-log-message';

@Injectable()
export class DistributionService {
    constructor(
        private abiService: AbiDistributionService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getDistributionInfo(): Promise<DistributionModel> {
        return new DistributionModel({
            address: scAddress.distributionAddress,
        });
    }

    async getDistributedLockedAssets(userAddress: string): Promise<string> {
        try {
            const distributedLockedAssets = await this.abiService.getDistributedLockedAssets(
                userAddress,
            );
            return distributedLockedAssets.toFixed();
        } catch (error) {
            const logMessage = generateGetLogMessage(
                DistributionService.name,
                this.getDistributedLockedAssets.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
