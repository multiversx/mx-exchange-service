import { Controller, Get, Header } from '@nestjs/common';
import { MexService } from '../services/mex.service';

@Controller('mex')
export class MexAnalyticsController {
    constructor(private readonly mexService: MexService) {}

    @Header('Content-Type', 'application/json')
    @Get('/price')
    async getPrice(): Promise<string> {
        const price = await this.mexService.getPrice();
        return price.toFixed(9);
    }
}
