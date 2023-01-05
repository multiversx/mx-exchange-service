export const decodeTime = (time: string): [string, moment.unitOfTime.Base] => {
    const [timeAmount, timeUnit] = time.match(/[a-zA-Z]+|[0-9]+/g);
    return [timeAmount, timeUnit as moment.unitOfTime.Base];
};
