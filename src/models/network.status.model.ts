class Data {
    erd_cross_check_block_height: string
    erd_current_round: number
    erd_epoch_number: number
    erd_highest_final_nonce: number
    erd_nonce: number
    erd_nonce_at_epoch_start: number
    erd_nonces_passed_in_current_epoch: number
    erd_round_at_epoch_start: number
    erd_rounds_passed_in_current_epoch: number
    erd_rounds_per_epoch: number
}
export class NetworkStatus {
    data: Data

    constructor(init?: Partial<NetworkStatus>) {
        Object.assign(this, init);
    }
}
