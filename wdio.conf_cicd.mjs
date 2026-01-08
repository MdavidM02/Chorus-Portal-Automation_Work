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
        maxInstances: 4,
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: [
                '--headless=new',
                '--disable-gpu',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-application-cache',
                '--disable-cache',
                '--disk-cache-size=0',
                '--user-data-dir=C:\\Jenkins_Home\\ChromeProfile',
                '--lang=en-US',
                '--disable-popup-blocking',
                '--disable-default-apps',
            ],
            prefs: {
                'protocol_handler.external': false,
                'intl.accept_languages': 'en-US,en'
            },
            binary: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
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
        }]
    ],

    cucumberOpts: {
        require: ['./features/step-definitions/steps.js'],
        backtrace: false,
        requireModule: [],
        dryRun: false,
        failFast: false,
        name: [],
        snippets: true,
        source: true,
        strict: false,
        tagExpression: '@core-scenario2',
        timeout: 60000,
        ignoreUndefinedDefinitions: true
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
     * Ensures all browser windows are closed and session is terminated
     */
    afterScenario: async function () {
        if (browser.sessionId) {
            await browser.deleteSession();
        }
    }
}