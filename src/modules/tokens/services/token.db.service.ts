import { BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTokenDto } from '../dto/create.token.dto';
import { EsdtTokenDbModel, TokenDocument } from '../schemas/token.schema';

export class TokenDBService {
    constructor(
        @InjectModel(EsdtTokenDbModel.name)
        private readonly esdtTokenModel: Model<TokenDocument>,
    ) {}

    async createToken(
        createTokenDto: CreateTokenDto,
    ): Promise<EsdtTokenDbModel> {
        console.log(createTokenDto);
        const createdToken = await this.esdtTokenModel.create(createTokenDto);
        return createdToken;
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
        return esdtToken ? esdtToken.type : 'Experimental';
    }
}
