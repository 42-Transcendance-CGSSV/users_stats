module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    verbose: true,
    silent: false,
}; 