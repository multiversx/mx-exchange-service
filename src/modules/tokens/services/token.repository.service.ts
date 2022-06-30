import { BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from 'src/services/database/repositories/entity.repository';
import { CreateTokenDto } from '../dto/create.token.dto';
import { EsdtTokenDbModel, TokenDocument } from '../schemas/token.schema';

export class TokenRepositoryService extends EntityRepository<TokenDocument> {
    constructor(
        @InjectModel(EsdtTokenDbModel.name)
        private readonly esdtTokenModel: Model<TokenDocument>,
    ) {
        super(esdtTokenModel);
    }

    async updateToken(updateTokenDto: CreateTokenDto): Promise<void> {
        const updatedToken = await this.esdtTokenModel
            .findOneAndUpdate(
                {
                    tokenID: updateTokenDto.tokenID,
                },
                { type: updateTokenDto.type },
                {
                    useFindAndModify: false,
                },
            )
            .exec();

        if (!updatedToken) {
            throw new BadRequestException('Token does not exist');
        }
    }

    async getTokenType(tokenID: string): Promise<string> {
        const esdtToken = await this.esdtTokenModel
            .findOne()
            .where('tokenID')
            .equals(tokenID)
            .exec();
        return esdtToken ? esdtToken.type : 'Unlisted';
    }
}
