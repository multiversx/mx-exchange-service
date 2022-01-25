import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAdminGuard } from 'src/modules/auth/jwt.admin.guard';
import { CreatePairDto } from './dto/create.pair.dto';
import { PairDBService } from './services/pair.db.service';

@Controller()
export class PairController {
    constructor(private readonly pairDbService: PairDBService) {}

    @UseGuards(JwtAdminGuard)
    @Post('/pair/create')
    async createPair(@Body() createPairDto: CreatePairDto) {
        await this.pairDbService.createPair(createPairDto);
    }

    @UseGuards(JwtAdminGuard)
    @Post('/pair/update')
    async updatePair(@Body() updatePairDto: CreatePairDto) {
        await this.pairDbService.updatePair(updatePairDto);
    }
}
