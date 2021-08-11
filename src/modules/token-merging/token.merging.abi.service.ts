import { Address, BytesValue, Interaction } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { GenericEsdtAmountPair } from 'src/modules/proxy/models/proxy.model';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { SmartContractType, TokensMergingArgs } from './dto/token.merging.args';

@Injectable()
export class TokenMergingAbiService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getNftDeposit(
        userAddress: string,
        smartContractType: SmartContractType,
        address?: string,
    ): Promise<GenericEsdtAmountPair[]> {
        const contract = await this.elrondProxy.getSmartContractByType(
            smartContractType,
            address,
        );
        const interaction: Interaction = contract.methods.getnftDeposit([
            BytesValue.fromHex(new Address(userAddress).hex()),
        ]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            if (queryResponse.returnData[0] === '') {
                return [];
            }

            const response = interaction.interpretQueryResponse(queryResponse);
            return response.firstValue.valueOf().map(value => {
                const depositedNft = value.valueOf();
                const genericEsdtAmountPair = new GenericEsdtAmountPair();
                genericEsdtAmountPair.tokenID = depositedNft.token_id.toString();
                genericEsdtAmountPair.tokenNonce = depositedNft.token_nonce.toNumber();
                genericEsdtAmountPair.amount = depositedNft.amount.toFixed();
                return genericEsdtAmountPair;
            });
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                TokenMergingAbiService.name,
                this.getNftDeposit.name,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getnftDepositMaxLen(args: TokensMergingArgs): Promise<BigNumber> {
        const contract = await this.elrondProxy.getSmartContractByType(
            args.smartContractType,
            args.address,
        );
        const interaction: Interaction = contract.methods.getnftDepositMaxLen(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);

            return response.firstValue.valueOf();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                TokenMergingAbiService.name,
                this.getnftDepositMaxLen.name,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getNftDepositAcceptedTokenIds(
        args: TokensMergingArgs,
    ): Promise<string[]> {
        const contract = await this.elrondProxy.getSmartContractByType(
            args.smartContractType,
            args.address,
        );
        const interaction: Interaction = contract.methods.getNftDepositAcceptedTokenIds(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);

            return response.firstValue.valueOf().map(value => value);
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                TokenMergingAbiService.name,
                this.getNftDepositAcceptedTokenIds.name,
                error,
            );
            this.logger.error(logMessage);
        }
    }
}
