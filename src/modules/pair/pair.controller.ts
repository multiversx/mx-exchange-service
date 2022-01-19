import { Body, Controller, Post } from '@nestjs/common';
import { CreatePairDto } from './dto/create.pair.dto';
import { PairDBService } from './services/pair.db.service';

@Controller()
export class PairController {
    constructor(private readonly pairDbService: PairDBService) {}

    @Post('/pair/create')
    async createPair(@Body() createPairDto: CreatePairDto) {
        await this.pairDbService.createPair(createPairDto);
    }

    @Post('/pair/update')
    async updatePair(@Body() updatePairDto: CreatePairDto) {
        await this.pairDbService.updatePair(updatePairDto);
    }
}
