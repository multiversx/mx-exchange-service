export const TRIGGER_TASK_EVENT = 'taskRunner.triggerTask';

export enum RunnerTasks {
    FEES_COLLECTOR_REDISTRIBUTE_REWARDS = 'FEES_COLLECTOR_REDISTRIBUTE_REWARDS',
    SWAP_TOKENS = 'SWAP_TOKENS',
}

export enum BroadcastStatus {
    success = 'success',
    error = 'error',
    fail = 'fail',
    skip = 'skip',
}
