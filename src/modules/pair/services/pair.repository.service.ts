import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from 'src/services/database/repositories/entity.repository';
import { CreatePairDto } from '../dto/create.pair.dto';
import { Pair, PairDocument } from '../schemas/pair.schema';

@Injectable()
export class PairRepositoryService extends EntityRepository<PairDocument> {
    constructor(
        @InjectModel(Pair.name) private readonly pairModel: Model<PairDocument>,
    ) {
        super(pairModel);
    }

    async updatePair(updatePairDto: CreatePairDto): Promise<void> {
        const updatedPair = await this.pairModel
            .findOneAndUpdate(
                { address: updatePairDto.address },
                { type: updatePairDto.type },
                {
                    useFindAndModify: false,
                },
            )
            .exec();
        if (!updatedPair) {
            throw new BadRequestException('Pair does not exist');
        }
    }

    async getPairType(pairAddress: string): Promise<string> {
        const pair = await this.pairModel
            .findOne()
            .where('address')
            .equals(pairAddress)
            .exec();

        return pair ? pair.type : 'Jungle';
    }
}
