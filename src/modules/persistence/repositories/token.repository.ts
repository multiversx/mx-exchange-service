import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from 'src/services/database/repositories/entity.repository';
import { EsdtTokenDocument } from '../schemas/esdtToken.schema';
import { EsdtToken } from '../../tokens/models/esdtToken.model';

@Injectable()
export class TokenRepository extends EntityRepository<EsdtTokenDocument> {
    constructor(
        @InjectModel(EsdtToken.name)
        private readonly esdtTokenModel: Model<EsdtTokenDocument>,
    ) {
        super(esdtTokenModel);
    }

    getModel(): Model<EsdtTokenDocument> {
        return this.esdtTokenModel;
    }
}
