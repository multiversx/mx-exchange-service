export const TRIGGER_TASK_EVENT = 'taskRunner.triggerTask';

export enum RunnerTasks {
    FEES_COLLECTOR_REDISTRIBUTE_REWARDS = 'FEES_COLLECTOR_REDISTRIBUTE_REWARDS',
    FEES_COLLECTOR_SWAP_TOKENS = 'FEES_COLLECTOR_SWAP_TOKENS',
    XOXNO_CLAIM_REFERRAL_FEES = 'XOXNO_CLAIM_REFERRAL_FEES',
}

export enum BroadcastStatus {
    success = 'success',
    error = 'error',
    fail = 'fail',
    skip = 'skip',
}
