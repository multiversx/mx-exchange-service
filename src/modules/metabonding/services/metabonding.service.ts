import { Injectable } from '@nestjs/common';
import { scAddress } from 'src/config';
import { MetabondingStakingModel } from '../models/metabonding.model';

@Injectable()
export class MetabondingService {
    getMetabondingStaking(): MetabondingStakingModel {
        return new MetabondingStakingModel({
            address: scAddress.metabondingStakingAddress,
        });
    }
}
