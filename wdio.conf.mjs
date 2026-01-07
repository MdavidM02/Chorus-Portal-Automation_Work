import fs from 'node:fs/promises'
import { generate } from 'multiple-cucumber-html-reporter'
import cucumberJson from 'wdio-cucumberjs-json-reporter'
import allureReporter from '@wdio/allure-reporter'

export const config = {
    runner: 'local',
    specs: ['./features/**/*.feature'],
    exclude: [],
    maxInstances: 10,

    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: [
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-application-cache',
                '--disable-cache',
                '--disk-cache-size=0',
                `--user-data-dir=/tmp/chrome-profile-${Date.now()}`,
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
            disableMochaHooks: true,
            issueLinkTemplate: null,
            tmsLinkTemplate: null
        },]
    ],

    cucumberOpts: {
        require: ['./features/step-definitions/steps.js'],
        require: ['./features/step-definitions/chorus_B2BOnboarding_steps.js'],
        backtrace: false,
        requireModule: [],
        dryRun: false,
        failFast: false,
        name: [],
        snippets: true,
        source: true,
        strict: false,
        tagExpression: '@b2bonboarding-scenario1',
        timeout: 60000,
        strict: false,
        ignoreUndefinedDefinitions: true
    },

    // ===== Hooks =====

    /**
     * Runs once per scenario
     */
//     afterStep: async function (step, scenario, result, context) {
//         //Take screenshot for all steps (or only for failed steps)
//         const screenshot = await browser.takeScreenshot();
//         await allureReporter.addAttachment(
//            'Screenshot',
//            Buffer.from(screenshot, 'base64'),
//            'image/png'
//         );
//    },
    // other hooks can be added as needed

    afterStep: async function (step, scenario, result) {
    if (result.error) {
        const screenshot = await browser.takeScreenshot();
        await allureReporter.addAttachment(
            'Failure Screenshot',
            Buffer.from(screenshot, 'base64'),
            'image/png'
        );
    }
}

}
