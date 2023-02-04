export class Mutex {
    private locked: boolean;

    async lock(): Promise<void> {
        while (this.locked) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        this.locked = true;
    }

    async unlock(): Promise<void> {
        this.locked = false;
    }
}
