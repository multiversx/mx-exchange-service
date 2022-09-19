import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from './entity.repository';
import {
    SCAddress,
    SCAddressDocument,
} from '../../../modules/remote-config/schemas/sc-address.schema';


@Injectable()
export class SCAddressRepositoryService extends EntityRepository<
    SCAddressDocument
> {
    constructor(
        @InjectModel(SCAddress.name)
        private readonly scAddressModel: Model<SCAddressDocument>,
    ) {
        super(scAddressModel);
    }
}
