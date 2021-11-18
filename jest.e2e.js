/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/test/*.e2e-spec.ts'],
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
};
