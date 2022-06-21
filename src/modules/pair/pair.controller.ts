import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAdminGuard } from 'src/modules/auth/jwt.admin.guard';
import { CreatePairDto } from './dto/create.pair.dto';
import { PairRepositoryService } from './services/pair.repository.service';

@Controller()
export class PairController {
    constructor(
        private readonly pairRepositoryService: PairRepositoryService,
    ) {}

    @UseGuards(JwtAdminGuard)
    @Post('/pair/create')
    async createPair(@Body() createPairDto: CreatePairDto) {
        await this.pairRepositoryService.create(createPairDto);
    }

    @UseGuards(JwtAdminGuard)
    @Post('/pair/update')
    async updatePair(@Body() updatePairDto: CreatePairDto) {
        await this.pairRepositoryService.updatePair(updatePairDto);
    }
}
