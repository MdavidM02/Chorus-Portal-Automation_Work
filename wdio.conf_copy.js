exports.config = {
    runner: 'local',

    specs: [
        './features/**/*.feature'
    ],

    exclude: [],

    suites: {
        uxbuilder: {
            specs: ['./features/uxbuilder/**/*.feature'],
            //require: ['./features/step-definitions/uxbuilder.steps.js']
            require: ['./features/step-definitions/steps.js']
        },
        sscPortal: {
            specs: ['./features/sscPortal/**/*.feature'],
            //require: ['./features/step-definitions/sscPortal.steps.js']
            require: ['./features/step-definitions/steps.js']
        },
        coreChorus: {
            specs: ['./features/coreChorus/**/*.feature'],
            //require: ['./features/step-definitions/coreChorus.steps.js']
            require: ['./features/step-definitions/steps.js']
        },
        chorus_B2BOnboarding: {
            //specs: ['./features/chorus_B2BOnboarding/**/*.feature'],
            specs: ['./features/**/chorus_B2BOnboarding.feature'],
            //require: ['./features/step-definitions/chorus_B2BOnboarding.steps.js']
            require: ['./features/step-definitions/steps.js']
        }
    },

    maxInstances: 10,

    capabilities: [{
        browserName: 'chrome'
    }],

    logLevel: 'info',

    bail: 0,

    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    framework: 'cucumber',

    reporters: [['allure', { outputDir: 'allure-results' }]],

    cucumberOpts: {
        // IMPORTANT:
        // Step definitions are now loaded per suite
        require: [],

        backtrace: false,
        requireModule: [],
        dryRun: false,
        failFast: false,
        name: [],
        snippets: true,
        source: true,
        strict: false,
        tagExpression: '',
        timeout: 60000,
        ignoreUndefinedDefinitions: false
    }
};
