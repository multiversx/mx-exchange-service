import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from './entity.repository';
import {
    SwapRoute,
    SwapRouteDocument,
} from 'src/modules/smart-router-evaluation/schemas/swap.route.schema';

@Injectable()
export class SwapRouteRepositoryService extends EntityRepository<SwapRouteDocument> {
    constructor(
        @InjectModel(SwapRoute.name)
        private readonly swapRouteModel: Model<SwapRouteDocument>,
    ) {
        super(swapRouteModel);
    }
}
