import fs from 'node:fs/promises'
import { generate } from 'multiple-cucumber-html-reporter'
import cucumberJson from 'wdio-cucumberjs-json-reporter'
import allureReporter from '@wdio/allure-reporter'

export const config = {
    runner: 'local',
    specs: ['./features/**/*.feature'],
    exclude: [],
    maxInstances: 1,

    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: [
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-application-cache',
                '--disable-cache',
                '--disk-cache-size=0',
                '--lang=en-US',
                '--disable-popup-blocking',
                '--disable-default-apps',
            ],
            prefs: {
                'protocol_handler.external': false,
                'intl.accept_languages': 'en-US,en'
            }
        }
    }],

    logLevel: 'info',
    bail: 0,
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    framework: 'cucumber',

    reporters: [
        ['allure', {
            outputDir: 'allure-results',
            useCucumberStepReporter: true,
            disableMochaHooks: true,
            issueLinkTemplate: null,
            tmsLinkTemplate: null
        }]
    ],

    cucumberOpts: {
        // require: ['./features/step-definitions/steps.js'],
        require: [
        './features/step-definitions/carbon_emissions.js',
        //'./features/step-definitions/steps.js',
        //'./features/step-definitions/ancile_quote_steps.js',
        //'./features/step-definitions/ancile_quote_steps_api.js',
        //'./features/step-definitions/steps_api.js',
        ],
        backtrace: false,
        requireModule: [],
        dryRun: false,
        failFast: false,
        name: [],
        snippets: true,
        source: true,
        strict: false,
        tagExpression: '',
        timeout: 600000,
        ignoreUndefinedDefinitions: true
        //ignoreUndefinedDefinitions: false
    },

    // ===== Hooks =====

    /**
     * Take screenshot for EVERY step (passed or failed)
     */
    afterStep: async function (step, scenario, result) {
        const screenshot = await browser.takeScreenshot();

        const status = result.error ? 'FAILED' : 'PASSED';
        const stepName = step.text.replace(/[^a-zA-Z0-9 ]/g, '');

        await allureReporter.addAttachment(
            `${status} - ${stepName}`,
            Buffer.from(screenshot, 'base64'),
            'image/png'
        );
    },

    /**
     * Runs after each Cucumber scenario
     * Closes all browser windows and ends the session
     */
    // afterScenario: async function () {
    //     if (browser.sessionId) {
    //         await browser.deleteSession();
    //     }
    // }
}
