import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePairDto } from '../dto/create.pair.dto';
import { Pair, PairDocument } from '../schemas/pair.schema';

@Injectable()
export class PairDBService {
    constructor(
        @InjectModel(Pair.name) private readonly pairModel: Model<PairDocument>,
    ) {}

    async createPair(createPairDto: CreatePairDto): Promise<Pair> {
        const createdPair = await this.pairModel.create(createPairDto);
        return createdPair;
    }

    async updatePair(updatePairDto: CreatePairDto): Promise<void> {
        await this.pairModel
            .updateOne(
                { address: updatePairDto.address },
                { type: updatePairDto.type },
            )
            .exec();
    }

    async getPairType(pairAddress: string): Promise<string> {
        const pair = await this.pairModel
            .findOne()
            .where('address')
            .equals(pairAddress)
            .exec();

        return pair ? pair.type : 'Custom';
    }
}
