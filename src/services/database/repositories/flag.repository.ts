import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FlagDocument, Flag } from 'src/modules/remote-config/schemas/flag.schema';
import { EntityRepository } from './entity.repository';


@Injectable()
export class FlagRepositoryService extends EntityRepository<FlagDocument> {
    constructor(
        @InjectModel(Flag.name) private readonly flagModel: Model<FlagDocument>,
    ) {
        super(flagModel);
    }
}
