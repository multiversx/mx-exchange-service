export class Mutex {
    private locked: boolean;

    async lock(timeout = 50): Promise<void> {
        while (this.locked) {
            await new Promise(resolve => setTimeout(resolve, timeout));
        }
        this.locked = true;
    }

    async unlock(): Promise<void> {
        this.locked = false;
    }
}
