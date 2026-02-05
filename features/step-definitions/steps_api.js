// Functions and imports starts.
import { Given, When, Then } from '@wdio/cucumber-framework';
import { getTestData } from '../../utils/dataHelper.js';
import { getNameMail } from '../../utils/dataHelper.js';
import { expect, $, browser } from '@wdio/globals'
//import { handlePopupAccept, enterKeysinMSWORD , clickenterButton } from '../../utils/robotkey.js';
import { and } from 'wdio-wait-for';

console.log('LOADED: coreChorus step definitions');

let testData = {};
let testData1 = {};
//const timeStamp = Date.now();
const timeStamp = getTimestampMMSS();

const userid = `AUTO${timeStamp}`;
const pickerImg = '';
const EmpName = `LUNATE_${timeStamp}`;
const ProjName = `ChorusProject_${timeStamp}`;

async function highlight(el) {
    if (!el) return;
    await browser.execute("arguments[0].style.border='3px solid #0101acff'", el);
    console.log("Highlighted element");
}

/**
 * timestamp DateTimeFormatter.ofPattern("mmss")
 */
function getTimestampMMSS() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return pad(now.getMinutes()) + pad(now.getSeconds());
}

/** Select option by partial text in a <select> (AutoHelper.selectByPartialText) */
async function selectByPartialText(selectEl, partial) {
  await highlight(selectEl);
  const opts = await selectEl.$$('option');
  for (const o of opts) {
    const txt = (await o.getText()) || '';
    if (txt.includes(partial)) {
      await selectEl.selectByVisibleText(txt);
      return txt;
    }
  }
  throw new Error(`No option including partial text: ${partial}`);
}

// ---- SmartClient idle + overlay waits ----
async function waitForSmartClientIdle(timeout = 30000, interval = 300) {
  await browser.waitUntil(async () => {
    return await browser.execute(() => {
      try {
        if (!window.isc || !isc.RPCManager) return true; // not a SmartClient page
        const busy = isc.RPCManager.numQueueRequests > 0;
        const pageLoading = isc.Page && isc.Page.isLoading;
        return !busy && !pageLoading;
      } catch {
        return true;
      }
    });
  }, { timeout, interval, timeoutMsg: 'SmartClient never went idle' });
}

async function waitForNoBlockUI(timeout = 30000, interval = 300) {
  const sel = [
    'div.p-blockui', 'div.p-dialog-mask', 'div.block-ui',
    'div.loader', 'div.loading', 'div.spinner', 'div.overlay'
  ].join(',');
  await browser.waitUntil(async () => {
    return await browser.execute((s) => {
      const els = Array.from(document.querySelectorAll(s));
      return els.every(el => {
        const style = window.getComputedStyle(el);
        const hidden = style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
        return hidden || el.offsetParent === null;
      });
    }, sel);
  }, { timeout, interval, timeoutMsg: 'Blocking overlay stayed visible' });
}

async function safeClick(selector, waitMs = 30000) {
  const el = await $(selector);
  await el.waitForExist({ timeout: waitMs });
  // pick first displayed if multiple match
  const candidates = await $$(selector);
  let target = el;
  for (const c of candidates) {
    if (await c.isDisplayed()) { target = c; break; }
  }
  await target.waitForClickable({ timeout: waitMs });
  await target.scrollIntoView({ block: 'center', inline: 'center' });
  await highlight(target);

  try {
    await target.click();
    return;
  } catch (e1) {}

  try {
    await target.moveTo();
    await target.click();
    return;
  } catch (e2) {}

  await browser.execute((node) => node.click(), target);
}

async function settlePage() {
  await browser.waitUntil(async () => (await browser.execute(() => document.readyState)) === 'complete', { timeout: 30000, interval: 200 }).catch(()=>{});
  await waitForSmartClientIdle().catch(()=>{});
  await waitForNoBlockUI().catch(()=>{});
}

async function dblClick(selector, waitMs = 30000) {
  const el = await $(selector);
  await el.waitForExist({ timeout: waitMs });
  await el.scrollIntoView({ block: 'center' });
  await highlight(el);
  try {
    // dispatch dblclick
    await browser.execute((node) => {
      const ev = new MouseEvent('dblclick', { view: window, bubbles: true, cancelable: true });
      node.dispatchEvent(ev);
    }, el);
  } catch {
    try { await el.doubleClick(); } catch (e) {} // best-effort
  }
}

// small utility: zoom (factor: 0.65 => 65%)
async function setZoom(factor) {
  await browser.execute((z) => { document.body.style.zoom = String(z); }, factor);
  await browser.pause(300);
}

// scroll to bottom
async function scrollToBottom() {
  await browser.execute(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' }));
  await browser.pause(300);
}

async function selectByVisibleText(selectSel, visibleText) {
  const sel = await $(selectSel);
  await sel.waitForExist({ timeout: 20000 });
  await highlight(sel);
  await sel.selectByVisibleText(visibleText);
  console.log(`Selected by visible text: ${visibleText}`);
}

async function slowSendKeys(selector, text, delay = 500, endKey = null) {
  console.log(`Typing "${text}" into: ${selector}`);
  const el = await $(selector);
  await el.waitForExist({ timeout: 60000 });
  await highlight(el);
  await el.click();

  // for (const ch of text) {
  //   await browser.keys(ch);
  //   await browser.pause(delay);
  // }

  // if (endKey) {
  //   console.log(`Sending key: ${endKey}`);
  //   await browser.keys(endKey);
  // }
await el.clearValue();
await el.setValue(text);

if (endKey) {
  await browser.keys(endKey);
}

}

// =======================
// API CAPTURE (WDIO v8 + Selenium SAFE)
// =======================

let page;
const capturedApis = [];
let captureEnabled = false;

async function enableApiCapture() {
    if (captureEnabled) return;

    // Attach Puppeteer to the existing browser
    const puppeteerBrowser = await browser.getPuppeteer();
    page = (await puppeteerBrowser.pages())[0];

    // Enable request interception
    await page.setRequestInterception(true);

    page.on('request', (request) => {
        const resourceType = request.resourceType();

       if (resourceType === 'xhr' || resourceType === 'fetch') {
            capturedApis.push({
                timestamp: new Date().toISOString(),
                method: request.method(),
                url: request.url(),
                headers: request.headers(),
                postData: request.postData() || null
            });
        }

        request.continue();
    });

    captureEnabled = true;
    console.log('API CAPTURE: Enabled via Puppeteer');
}

function resetApiCapture() {
    capturedApis.length = 0;
}

function getCapturedApis() {
    return [...capturedApis];
}

async function persistApis(tag = '') {
    const fs = await import('fs');
    const path = `./artifacts/apis_${Date.now()}${tag}.json`;

    fs.writeFileSync(path, JSON.stringify(capturedApis, null, 2));
    console.log(`API CAPTURE: Saved ${capturedApis.length} APIs → ${path}`);
}


// Functions and imports ends.

Given('I launch the Chorus portal for {string}', async function(testcaseID) {
  const testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Launching Chorus portal for environment: ${testData.Env}`);

    // 🔹 Enable API capture ONCE
  await enableApiCapture();
  resetApiCapture();
  
  await browser.maximizeWindow();
  await browser.url("https://awddev.trialclient1.awdcloud.co.uk/awd/portal/login.html")
  await expect(browser).toHaveUrl("https://awddev.trialclient1.awdcloud.co.uk/awd/portal/login.html")
  await expect(browser).toHaveTitle("Sign on to Chorus");
  await browser.pause(2000); 
});

When('I login with username and password for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Logging in with: ${testData.username} / ${testData.password}`);
  await $("#user-name").setValue(testData.username)
  await $("#password").setValue(testData.password)
  await $("#sign-on").click()
  await browser.pause(2000); 
});

When ('I create a new worklist', async function () {
  await $("//div[@class='ui-card-main-text'][contains(text(),'Worklist')]").waitForDisplayed(10000);
  console.log("SCRIPTLOG:Creating a new worklist...");
  await $("#create-btn").click();
  await $("//div[@class='ui-card-main-text'][normalize-space()='Create']").waitForDisplayed(3000);
  await browser.pause(3000)
});

Then('I select following options in the new worklist for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Selecting: ${testData.BusinessArea}, ${testData.WorkType}, ${testData.Status}`);
  await $("//select[@id='create-1-work-businessArea']").selectByVisibleText(testData.BusinessArea);
  await $("(//select[@id='create-1-work-workType'])[1]").selectByVisibleText(testData.WorkType);
  await browser.pause(3000);
  await $("//app-create-work[@createworkresource='CRTWORK']//button[@type='submit'][normalize-space()='Create']").waitForEnabled(2000);
  await $("//app-create-work[@createworkresource='CRTWORK']//button[@type='submit'][normalize-space()='Create']").click();
  await $("//span[@class='p-accordion-header-text'][contains(text(),'Created Items')]").waitForDisplayed(5000);
  await browser.pause(3000);
});

When('I double click to open the created work item for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Opening work item: ${testData.WorkType}`);
  await $("(//div[@class='ui-card focused-card']//span[@class='awd-ba-type-data'][normalize-space()='SAMPLEBA - "+testData.WorkType+"'])[1]").doubleClick();
  await $("//div[@class='ui-card-titlebar']//div[contains(text(),'SAMPLEBA - "+testData.WorkType+"')]").waitForDisplayed(3000);
  await browser.pause(3000);  
});

Then('I enter the email and complete the work for {string}', async function(testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:I enter the Email and complete the work: ${testData.Email}`);
  await $("//input[@awdname='EMAL']").setValue(testData.Email);
  await $("//button[@name='NextStep']").click();
  await browser.pause(2000);
});

Then('I enter the Email and proceed to work for {string}', async function(testcaseID) {
    testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
    console.log(`SCRIPTLOG:I enter the Email and complete the work: ${testData.Email}`);
    await browser.pause(1000);
    await $("//input[@awdname='EMAL']").setValue(testData.Email);
    await $("//button[@name='NextStep']").click();
    await browser.pause(4000);
});

Then('I accept the pop up in chrome dialog to open MS Word', async() => {
  await handlePopupAccept();
  await browser.pause(3000);  
});

Then('I click Next button in the MS Word opened', async() => {
  await enterKeysinMSWORD();
  await browser.pause(3000);  
});

When('I double click to open the first work item for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Opening work item: ${testData.WorkType}`);
  await $("(//div[@class='ui-card focused-card']//span[@class='awd-ba-type-data'][normalize-space()='SAMPLEBA - "+testData.WorkType+"'])[1]").doubleClick();
  await $("//div[@class='ui-card-titlebar']//div[contains(text(),'SAMPLEBA - "+testData.WorkType+"')]").waitForDisplayed(3000);
  await browser.pause(3000); 
});

When('I wait for table data to be displayed', async() => {
  await $("//table//tr[2]").waitForDisplayed(5000); 
  await browser.pause(3000);  
})

When('I add a new record to EmpTable1 for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Opening work item: ${testData.T1Empname}, ${testData.T1EmpId}, ${testData.T1EmpDOB},${testData.T1Empfulltime}`);
  await $("(//span[@class='add-row'][normalize-space()='Add Row'])[1]").waitForDisplayed();
  await $("(//span[@class='add-row'][normalize-space()='Add Row'])[1]").click();
  await $("//div[@class='heading title']").waitForDisplayed(2000);
  await $("//div[@class='rowValue'][contains(text(),'Ename')]/following-sibling::div//input").setValue(testData.T1Empname);
  await $("//div[@class='rowValue'][contains(text(),'Eid')]/following-sibling::div//input").setValue(testData.T1EmpId);
  await browser.pause(3000); 
  await $("//span[normalize-space()='Save']").click();
  await $("//div[@class='heading title']").waitForDisplayed({reverse: true});
  await browser.pause(3000);  
});

When('I add a new record to EmpTable2 for {string}', async function (testcaseID) {
   testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
   console.log(`SCRIPTLOG:Opening work item: ${testData.T2Empname}, ${testData.T2EmpId}, ${testData.T2EmpDOB},${testData.T2Empfulltime}`);
   await $("(//span[@class='add-row'][normalize-space()='Add Row'])[2]").waitForDisplayed();
   await $("(//span[@class='add-row'][normalize-space()='Add Row'])[2]").click();
   await $("//div[@class='heading title']").waitForDisplayed(2000);
   await $("//div[@class='rowValue'][contains(text(),'A1')]/following-sibling::div//input").setValue(testData.T2Empname);
   await $("//div[@class='rowValue'][contains(text(),'A2')]/following-sibling::div//input").setValue(testData.T2EmpId);
   await browser.pause(3000); 
   await $("//span[normalize-space()='Save']").click();
   await $("//div[@class='heading title']").waitForDisplayed({reverse: true});
   await browser.pause(3000);  
})

When('I select newly created record for {string}', async (s) => {
  const records = await $$("(//table[@role='grid'])[1]//tbody/tr").getElements();
    const recCounter = await records.length;
    await $("(//table[@role='grid'])[1]//tbody/tr["+recCounter+"]/td[2]").click()
    const records2 = await $$("(//table[@role='grid'])[1]//tbody/tr").getElements();
    const recCounter2 = await records2.length;
    await $("(//table[@role='grid'])[2]//tbody/tr["+recCounter2+"]/td[1]//div[@role='checkbox']").click();
    await browser.pause(3000); 
})

When('I click submit button to complete the entry', async() => {
    await $("//button[normalize-space()='Submit']").waitForDisplayed();
    await $("//button[normalize-space()='Submit']").click();
    await browser.pause(5000); 
})

When('I select records from the two tables', async() => {
    await $("//div[contains(text(),'Emptable1')]").waitForDisplayed(5000);
    await $("(//table)[1]/tbody/tr[1]//div[@role='checkbox']").click();
    await $("(//table)[2]/tbody/tr[2]//div[@role='checkbox']").click();
    await browser.pause(3000);  
})

Then('I select Document type from form for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Selecting from Document type form: ${testData.DocumentType}`);
  await $("//span[text()='Document']/parent::label//select").selectByVisibleText(testData.DocumentType); // select the Document Type as Generic Testing Letter
  await $("//button[@name='Next']").click();
  await browser.pause(4000);
})


Then('I enter Main Recipient email id for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Entering Main Email Id: ${testData.MainEmail1}`);
  await $("//span[text()='From']/../../following-sibling::div//input[@name='emailAddress']").setValue(testData.MainEmail1);
  await browser.pause(3000);  
})

Then('I enter Additional Recipient email id for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Entering Main Email Id: ${testData.AdditionalEmail1}`);
  await $("//span[text()='* Additional Recipient']/../..//div//select[@name='delivery']").selectByVisibleText("Email"); //selecting Email option from drop down list
  await $("//span[text()='* Additional Recipient']/../following-sibling::div//input[@name='emailAddress']").setValue(testData.AdditionalEmail1); // adding Additional email address
  await $("//span[text()='* Additional Recipient']/../preceding-sibling::div//input[@name='name']").setValue(testData.AdditionalName1); // adding additional name field
  // await $("//button[@name='Next']").click(); // clicking the Next button
  // need to add the error checks here when the email checking functionality works. Now the email checks are not happening bewcause its an old code.
  await browser.pause(3000);  
})

Then('I enter multiple usenames and passwords for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID);
  console.log(`SCRIPTLOG:Number of Users: ${testData.numberofusers}`);
  await $("//span[text()='* Additional Recipient']/../..//div//select[@name='delivery']").selectByVisibleText("Email"); //selecting Email option from drop down list
  for (let i=0; i<testData.numberofusers; i++) {
    testData1 = getNameMail(i); // Load data from Excel sheet matching TestCaseId row
    console.log(`Main Email : ${testData1.MainEmail}`);
    console.log(`Additional Email : ${testData1.AdditionalEmail}`);
    console.log(`AdditionalName : ${testData1.AdditionalName}`);
    await $("//span[text()='From']/../../following-sibling::div//input[@name='emailAddress']").setValue(testData1.MainEmail); // adding Main email address
    await $("//span[text()='* Additional Recipient']/../following-sibling::div//input[@name='emailAddress']").setValue(testData1.AdditionalEmail); // adding Additional email address
    await $("//span[text()='* Additional Recipient']/../preceding-sibling::div//input[@name='name']").setValue(testData1.AdditionalName); // adding additional name field
    await browser.pause(5000);
  }
  await browser.pause(3000);

  // 🔹 API validation
  const apis = getCapturedApis();

  console.log(`Captured ${apis.length} APIs`);

  expect(apis.length).toBeGreaterThan(0);

  // const quoteApi = apis.find(a =>
  //     a.url.includes('/quote') || a.url.includes('/scheme')
  // );

  // expect(quoteApi).toBeDefined();

  // 🔹 Persist for audit/debug
  await persistApis('_chorus_process');
  
})


Given('I launch the UX Builder portal', async() => {
  await browser.maximizeWindow();
  await browser.url("https://awddev.trialclient1.awdcloud.co.uk/awd/workspace/#WSUXBLDR")
  await browser.pause(3000);
  await expect(browser).toHaveUrl("https://awddev.trialclient1.awdcloud.co.uk/awd/portal/login.html?workspaceTarget=WSUXBLDR");
  await browser.pause(3000);
  //await expect(browser).toHaveTitle("UX Builder"); // if we are running along with previous TCs.
  await expect(browser).toHaveTitle("Sign on to Chorus"); // if we are running a single TC,
})

When('I create a New Project', async () => {
  testData = getTestData(TestCase7);
  console.log(`SCRIPTLOG:Project Name: ${testData.ProjectName}`);
  await expect(browser).toHaveTitle("UX Builder");
  // Switch to iframe
  const iframeElement = $("//iframe[@src ='https://awddev.trialclient1.awdcloud.co.uk/builder/index.html?workspaceTarget=WSUXBLDR']");
  await browser.switchFrame(iframeElement);
  // Click "create new"
  const createNewBtn = $("span.create-new");
  await createNewBtn.click();
  try {
        // Generate timestamp in yyyyMMdd_HHmmss format
        //const now = new Date();
        //const pad = n => n.toString().padStart(2, '0');
        //const timeStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_` +`${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        // Project Name input
        const projectName = $('#projectName');
        await projectName.waitForExist({ timeout: 30000 });
        await projectName.setValue('Chrousproject' + timeStamp);
        // Title input
        const title = $('#title');
        await title.waitForExist({ timeout: 30000 });
        await title.setValue('title');
        // Description input
        const description = $('#description');
        await description.waitForExist({ timeout: 30000 });
        await description.setValue('description');
        // Dropdown open
        const appType = $('#appType');
        await appType.waitForClickable({ timeout: 30000 });
        await appType.click();
        // Select "Public Application"
        const publicApp = $("//span[text()='Public Application']");
        await publicApp.waitForClickable({ timeout: 30000 });
        await publicApp.click();
        // Change zoom to 70%
        await browser.execute(() => { document.body.style.zoom = '70%'; });
        // Pause 5s
        await browser.pause(5000);
        // Click submit
        const submitBtn = $("//button[@type='submit']");
        await submitBtn.waitForClickable({ timeout: 30000 });
        await submitBtn.click();
        // Pause 5s
        await browser.pause(5000);
        // Change zoom back to 90%
        await browser.execute(() => { document.body.style.zoom = '90%'; });
        console.log("Done");
        await browser.pause(5000);
    } catch (err) {
        console.error("Error:", err);
    } 
})

When('I drag and drop sourceElement and TargetElement for {string}', async function(testcaseID) {
  testData = getTestData(testcaseID);
    // Define selectors
  const elem = $("//span[text()='Section']/ancestor::ngx-dnd-item");
  const target =$("div.ngx-dnd-container.gu-empty[ngxdroppable]") ;
  
  // drag and drop one element
  await elem.dragAndDrop(target)
  await browser.pause(2000);
  await $('//span[contains(text(),"Sections")]/..').click();
  console.log("Drag and drop1 Section completed successfully!");
  
  // drag and drop second element
  const source1 = $('//span[text()="Text"]/ancestor::ngx-dnd-item');
  const target1 = $('div.ngx-dnd-container.gu-empty[ngxdroppable]');
  await source1.dragAndDrop(target1)
  console.log("Drag and drop2 Text completed successfully!");

  //publish and confirm
  await browser.pause(2000);
  await $('//span[contains(text(),"Publish")]/..').click();
  await browser.pause(2000);
  await $('//span[contains(text(),"Confirm")]/..').click();
  
  //click on the X button
  //await $('//div[@id="user-menu-btn"]//svg-icon//*[@id="Layer_1"]').click();
  await $('//*[local-name() = "path" and starts-with(@d, "M57.7,50")]').click();
  console.log("Close completed successfully!");

  //drag and drop third element - This is not working as it is silently failing after the form is published.
  await browser.pause(2000);
  await $('//span[contains(text(),"Sections")]/..').click();
  console.log("Clicked on Sections");
  //const source2 = $("//span[text()='Section']/ancestor::ngx-dnd-item");
  const source2 = $('//span[text()="Col 2"]/ancestor::ngx-dnd-item');
  //const source2 = $('//span[text()="Text"]/ancestor::ngx-dnd-item');
  await source2.scrollIntoView();
  //await source2.waitForDisplayed({ timeout: 5000 });
  const target2 = $("//ngx-dnd-container//ancestor::ngx-dnd-container//ngx-dnd-container");
  await target2.scrollIntoView();
  //await target2.waitForDisplayed({ timeout: 5000 });
  await source2.dragAndDrop(target2);
  //await source2.dragAndDrop({ x: 50, y: 50 });
  console.log("Drag and drop 3 completed successfully!");
  // Pause to visually verify
  await browser.pause(3000);
})


When('I create a New Project for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID);
  console.log(`SCRIPTLOG:Project Name: ${testData.ProjectName}`);
  await expect(browser).toHaveTitle("UX Builder");
  // Switch to iframe
  const iframeElement = $("//iframe[@src ='https://awddev.trialclient1.awdcloud.co.uk/builder/index.html?workspaceTarget=WSUXBLDR']");
  await browser.switchFrame(iframeElement);
  // Click "create new"
  const createNewBtn = $("span.create-new");
  await createNewBtn.click();
  //await $("#projectName").setValue(testData.ProjectName); // adding Project Name
  await $("#projectName").setValue(ProjName);

  await browser.pause(3000);
  // Title input
  const title = $('#title');
  await title.waitForExist({ timeout: 30000 });
  await title.setValue('title');
  // Description input
  const description = $('#description');
  await description.waitForExist({ timeout: 30000 });
  await description.setValue('description');
  // Dropdown open
  const appType = $('#appType');
  await appType.waitForClickable({ timeout: 30000 });
  await appType.click();
  // Select "Public Application"
  const publicApp = $("//span[text()='Public Application']");
  await publicApp.waitForClickable({ timeout: 30000 });
  await publicApp.click();
  // Change zoom to 70%
  await browser.execute(() => { document.body.style.zoom = '70%'; });
  // Pause 5s
  await browser.pause(5000);
  // Click submit
  const submitBtn = $("//button[@type='submit']");
  await browser.pause(5000);
  await submitBtn.waitForClickable({ timeout: 30000 });
  await submitBtn.click();
  // Pause 5s
  await browser.pause(5000);
  // Change zoom back to 90%
  await browser.execute(() => { document.body.style.zoom = '90%'; });
  console.log("Done");
  await browser.pause(5000);
})

When('I click on Home, Templates tab and open the published Template for {string}', async function(testcaseID){
  // Click on the Projects Tab, may need to rewrite for Home tab later.
  testData = getTestData(testcaseID);
  console.log(`SCRIPTLOG:Project Name: ${testData.ProjectName}`);
  await $('//button[@class="btn btn-lg btn-toolbar"]').click(); //clicking on Home Button
  await browser.pause(3000);
  await $('//span[contains(text(),"Projects")]').click(); // Clicking on Projects Button
  await browser.pause(3000);
  //await $('//div[@class="p-tabview-panels"]//input[starts-with(@class, "search-box")]').setValue(testData.ProjectName); // adding Chrorus projectname
  await $('//div[@class="p-tabview-panels"]//input[starts-with(@class, "search-box")]').setValue(ProjName);
  await browser.pause(3000);
  await $('//*[@id="ic_edit"]').click();//click on view/edit button
  await browser.pause(3000);
})

When('I drag and drop more items to the published Template for {string}', async function(testcaseID) {
  testData = getTestData(testcaseID);
  // Define selectors
  await browser.pause(5000);
  await $('//span[contains(text(),"Sections")]/..').click();
  const source1 = $("//span[text()='Section']/ancestor::ngx-dnd-item"); 
  //const target1 =$("//ngx-dnd-container//ancestor::ngx-dnd-container//ngx-dnd-container") ;
  const target1 =$("//ngx-dnd-container[contains(@class, 'section') and contains(@class, 'custom-section')]") ;
  
  console.log("Drag and drop4 Section about to start");

  await source1.scrollIntoView();
  await target1.scrollIntoView();
  
  // drag and drop one element - this works sometimes , not always.
  await source1.dragAndDrop(target1);

  console.log("Drag and drop4 Section completed successfully!");
  
  // //await $('//span[contains(text(),"Continue")]/parent::button').click(); // Clicking on Continue Button
  // await browser.pause(3000);
  // await $('//span[text()="Continue"]/..').click(); // Clicking on Continue Button

  // //drag and drop element
  // //const source2 = $('//span[text()="Text"]/ancestor::ngx-dnd-item');
  // //const target2 = $('div.ngx-dnd-container.gu-empty[ngxdroppable]');
  // //await source2.dragAndDrop(target2)
  // //console.log("Drag and drop2 Text completed successfully!");

  // //publish and confirm
  // await browser.pause(2000);
  // await $('//span[contains(text(),"Publish")]/..').click();
  // await browser.pause(2000);
  // await $('//span[contains(text(),"Confirm")]/..').click();

  // //click on the X button
  // //await $('//div[@id="user-menu-btn"]//svg-icon//*[@id="Layer_1"]').click();
  // await $('//*[local-name() = "path" and starts-with(@d, "M57.7,50")]').click();
  // console.log("Close completed successfully!");
  // await browser.pause(5000);
})

Given('Login into Chorus with username and password', async() => {
  await browser.maximizeWindow();

    // 🔹 Enable API capture ONCE
  await enableApiCapture();
  resetApiCapture();

  await browser.url("https://awddev.trialclient1.awdcloud.co.uk/awd/portal/login.html")
  await expect(browser).toHaveUrl("https://awddev.trialclient1.awdcloud.co.uk/awd/portal/login.html")
  await expect(browser).toHaveTitle("Sign on to Chorus");
  await $("#user-name").setValue("JPANICKE")
  await $("#password").setValue("Ai4P@ssword5")
  await $("#sign-on").click()
  await browser.pause(5000);
})

Then('Navigate to the Administration workspace', async() => {
  // Navigate to processor URL (driver.navigate().to in Java)
  
  // const workspaceButton = await $('//div[@id="workspace-menu-btn"]/div');
  // await workspaceButton.waitForClickable({ timeout: 30000 });
  // await highlight(workspaceButton);
  // await workspaceButton.click();

  // const AdminButton = await $('//div[text()="Administration"]/ancestor::a');
  // await AdminButton.waitForClickable({ timeout: 30000 });
  // await highlight(AdminButton);
  // await AdminButton.click();
  
  await browser.newWindow('https://awddev.trialclient1.awdcloud.co.uk/awd/portal/processor.html');
  // await browser.url('https://awddev.trialclient1.awdcloud.co.uk/awd/portal/processor.html');
  await browser.pause(5000);
  console.log("Navigated to processor URL");
  console.log('Page Title:', await browser.getTitle());
});
  
Then('Navigate to Manage-Work Place-User-Search for and select user from the list', async() => {

  // Click Manage -> Work Place -> User
  const manageLink = await $('//a[text()="Manage"]');
  await manageLink.waitForClickable({ timeout: 30000 });
  await highlight(manageLink);
  await manageLink.click();
  console.log("Clicked Manage");

  const workPlaceLink = await $('//a[text()="Work Place"]');
  await workPlaceLink.waitForClickable({ timeout: 30000 });
  await highlight(workPlaceLink);
  await workPlaceLink.click();
  console.log("Clicked Work Place");

  const userLink = await $('//a[text()="User"]');
  await userLink.waitForClickable({ timeout: 30000 });
  await highlight(userLink);
  await userLink.click();
  console.log("Clicked User");

})

Then('Rename the fields to your new users info', async() => {
  // Filter AUTOTEST
  await browser.pause(2000);
  const userIdFilter = await $('//input[@id="awdadmin_wp_u_userid_flt_txt"]');
  await userIdFilter.waitForExist({ timeout: 30000 });
  await highlight(userIdFilter);
  await userIdFilter.setValue('AUTOTEST');
  await browser.pause(2000);

  const filterBtn = await $('//button[@id="awdadmin_wp_u_userid_flt_btn"]');
  await filterBtn.waitForClickable({ timeout: 30000 });
  await highlight(filterBtn);
  await filterBtn.click();
  await browser.pause(2000);

  const userIdList = await $('//select[@id="awdadmin_wp_u_userid_lst"]');
  await userIdList.waitForExist({ timeout: 30000 });
  await highlight(userIdList);
  await userIdList.selectByVisibleText('AUTOTEST - tester test');
  await browser.pause(2000);

  // Fill form
  //const userid = `AUTO${timeStamp}`;

  const userIdTxt = await $('//input[@id="awdadmin_wp_u_userid_txt"]');
  await userIdTxt.waitForExist({ timeout: 30000 });
  await highlight(userIdTxt);
  await userIdTxt.clearValue();
  await userIdTxt.setValue(userid);
  await browser.pause(2000);

  const pwdTxt = await $('//input[@id="awdadmin_wp_u_password_txt"]');
  await pwdTxt.waitForExist({ timeout: 30000 });
  await highlight(pwdTxt);
  await pwdTxt.setValue('Micky$007');
  await browser.pause(2000);

  const aliasTxt = await $('//input[@id="awdadmin_wp_u_user_alias_txt"]');
  await aliasTxt.waitForExist({ timeout: 30000 });
  await highlight(aliasTxt);
  await aliasTxt.clearValue();
  await aliasTxt.setValue(userid);
  await browser.pause(2000);

  const firstNameTxt = await $('//input[@id="awdadmin_wp_u_first_name_txt"]');
  await firstNameTxt.waitForExist({ timeout: 30000 });
  await highlight(firstNameTxt);
  await firstNameTxt.clearValue();
  await firstNameTxt.setValue(`AU${timeStamp}`);
  await browser.pause(2000);

  const middleNameTxt = await $('//input[@id="awdadmin_wp_u_middle_txt"]');
  await middleNameTxt.waitForExist({ timeout: 30000 });
  await highlight(middleNameTxt);
  await middleNameTxt.clearValue();
  await middleNameTxt.setValue('U');
  await browser.pause(2000);

  const lastNameTxt = await $('//input[@id="awdadmin_wp_u_last_name_txt"]');
  await lastNameTxt.waitForExist({ timeout: 30000 });
  await highlight(lastNameTxt);
  await lastNameTxt.clearValue();
  await lastNameTxt.setValue(`TO${timeStamp}`);
  await browser.pause(2000);

  // ForwardToQueue search
  const fwdSearch = await $('//a[@id="awdadmin_wp_u_forwardtoqueue_cmb_btnsearch"]');
  await fwdSearch.waitForClickable({ timeout: 30000 });
  await highlight(fwdSearch);
  await fwdSearch.click();

  await browser.pause(3000); // keep same as Java

  const wildcardTxt = await $('//input[@id="awdadmin_wildcard_txt"]');
  await wildcardTxt.waitForExist({ timeout: 30000 });
  await highlight(wildcardTxt);
  await wildcardTxt.setValue('JPANICKE');

  const dialogSearchBtn = await $('//button[@id="awdadmin_uslp_search_btn"]');
  await dialogSearchBtn.waitForClickable({ timeout: 30000 });
  await highlight(dialogSearchBtn);
  await dialogSearchBtn.click();
  await browser.pause(2000);

  const selectUserList = await $('//select[@id="awdadmin_wp_uselect_userid_lst"]');
  await selectUserList.waitForExist({ timeout: 30000 });
  await highlight(selectUserList);
  await selectUserList.selectByVisibleText('JPANICKE - Panicker, John');
  await browser.pause(2000);

  const okBtn = await $('//button[@id="awdadmin_wp_uselect_ok_btn"]');
  await okBtn.waitForClickable({ timeout: 30000 });
  await highlight(okBtn);
  await okBtn.click();
  await browser.pause(2000);
})

Then('Select Insert', async() => {
  // Insert User
  const insertUserBtn = await $('//button[@title="Insert a User"]');
  await insertUserBtn.waitForClickable({ timeout: 30000 });
  await highlight(insertUserBtn);
  await insertUserBtn.click();
  console.log('Clicked "Insert a User"');
})


Then('From the Work Place Menu select User ID Profile Clone', async() => {
  // Back to Work Place
  const workPlaceLink2 = await $('//a[text()="Work Place"]');
  await workPlaceLink2.waitForClickable({ timeout: 30000 });
  await highlight(workPlaceLink2);
  await workPlaceLink2.click();
})


Then('Search for and Select the From User and the To User as your user created', async() => {
  // ---- Java used AutoHelper.safeClick here ----
  await safeClick('//a[normalize-space(.)="User ID Profile Clone"]');

  const fromUserFilter = await $('//input[@id="awdadmin_wp_uipc_fromuser_flt_txt"]');
  await fromUserFilter.waitForExist({ timeout: 30000 });
  await highlight(fromUserFilter);
  await fromUserFilter.setValue('JPANICKE');
  await browser.pause(3000);
  const fromUserList = await $('//select[@id="awdadmin_wp_uipc_lstfromuser"]');
  await fromUserList.waitForExist({ timeout: 30000 });
  await selectByPartialText(fromUserList, 'JPANICKE');
})

Then('Check All User Privileges and Roles checkboxes', async() => {
  const cbxAllPriv = await $('//input[@id="awdadmin_wp_uipc_cbxalluserprivileges"]');
  await cbxAllPriv.waitForClickable({ timeout: 30000 });
  await highlight(cbxAllPriv);
  await cbxAllPriv.click();
  await browser.pause(1000);

  const cbxRoles = await $('//input[@id="awdadmin_wp_uipc_cbxroles"]');
  await cbxRoles.waitForClickable({ timeout: 30000 });
  await highlight(cbxRoles);
  await cbxRoles.click();
  await browser.pause(1000);

  const toUserFilter = await $('//input[@id="awdadmin_wp_uipc_touser_flt_txt"]');
  await toUserFilter.waitForExist({ timeout: 30000 });
  await highlight(toUserFilter);
  //await toUserFilter.setValue(userid.substring(0, 8)); // UserId only has 8 chars
  await toUserFilter.setValue(userid);
  await browser.pause(1000);

  const toUserList = await $('//select[@id="awdadmin_wp_uipc_lsttouser"]');
  await toUserList.waitForExist({ timeout: 30000 });
  //await selectByPartialText(toUserList, userid.substring(0, 8)); // UserId only has 8 chars
  await selectByPartialText(toUserList, userid);
  await browser.pause(1000);
})

Then('Click Clone', async() => {
  const cloneBtn = await $('//button[@id="awdadmin_wp_uipc_btnclone"]');
  await cloneBtn.waitForClickable({ timeout: 30000 });
  await highlight(cloneBtn);
  await cloneBtn.click();
  await browser.pause(1000);
})

Then('System displays a message that the Clone was completed', async() => {
    const notifyText = await $('//p[@id="awdadmin_wp_uipc_modnotifyuser_dlg_dstcontent_p"]');
    await notifyText.waitForExist({ timeout: 30000 });
    await highlight(notifyText);
    console.log('Notify text:', await notifyText.getText());
    await browser.pause(1000);
})

Then('Select Continue', async() => {
  const continueBtn = await $('//input[@id="awdadmin_wp_uipc_modnotifyuser_dlg_onClickContinue"]');
  await continueBtn.waitForClickable({ timeout: 30000 });
  await highlight(continueBtn);
  await continueBtn.click();
  await browser.pause(3000);
})


Then('Navigate to Manage Workplace Communications user', async() => {
  // Back to Work Place
  const workPlaceLink3 = await $('//a[text()="Work Place"]');
  await workPlaceLink3.waitForClickable({ timeout: 30000 });
  await highlight(workPlaceLink3);
  await workPlaceLink3.click();
  await browser.pause(3000);
  // ---- Java used AutoHelper.safeClick here ----
  await safeClick('//a[normalize-space(.)="Communications User"]');
})


Then('Click on Create New User', async() => {
  // Switch to iframe (AutoHelper.switchToIframe)
  const iframe = await $("//iframe[@src='https://awddev.trialclient1.awdcloud.co.uk/awd/portal/gui/apps/communications/index.html?r=COMMUSR']");
  await iframe.waitForExist({ timeout: 30000 });
  //await highlight(iframe);
  await browser.switchFrame(iframe);

  // Inside iframe
  const createNewUser = await $('//td[text()="Create New User"]');
  await createNewUser.waitForClickable({ timeout: 30000 });
  await highlight(createNewUser);
  await createNewUser.click();
})


Then('In the ID field enter your userid which you created above', async() => {
  const commUserId = await $('//input[@name="userId"]');
  await commUserId.waitForExist({ timeout: 30000 });
  await highlight(commUserId);
  //await commUserId.setValue(userid.substring(0, 8)); //becasuse UserID has only 8 chars
  await commUserId.setValue(userid);
  await browser.pause(2000);
  const commUserName = await $('//input[@name="userName"]');
  await commUserName.waitForClickable({ timeout: 30000 });
  await highlight(commUserName);
  await commUserName.click();
  const pickerImg = await $('(//table[contains(@class,"selectItemControl")]//td//img[contains(@class,"comboBoxItemPicker")])[3]');
  await pickerImg.waitForExist({ timeout: 8000 });
  await pickerImg.scrollIntoView({ block: 'center' });
  await highlight(pickerImg);
  try {
  await pickerImg.click();
  console.log('Picker image clicked');
  } catch {
  await browser.execute(el => el.click(), pickerImg);
  console.log('Picker clicked via JS fallback');
  }
  await browser.pause(2000);
})

Then('Select Administrator from the Roles dropdown', async() => {
  const admin = await $('//div[text()="Administrator"]');
  //const admin = await $('//*[@id="isc_3D"]');
  await admin.waitForExist({ timeout: 30000 });
  await highlight(admin);
  await admin.click();
  //await admin.selectByVisibleText("Client Administrator")
  await browser.pause(5000);
})

Then('Select Save', async() => {
  const saveBtn = await $('//div[text()="Save"]');
  await saveBtn.waitForClickable({ timeout: 30000 });
  await highlight(saveBtn);
  await saveBtn.click();
  await browser.pause(3000);
  await waitForSmartClientIdle();
  await waitForNoBlockUI();
})

Then('I enable the Status of the new user to Available', async() => {
  // Navigate to processor URL (driver.navigate().to in Java)
  await browser.url('https://awddev.trialclient1.awdcloud.co.uk/awd/portal/processor.html');
  await browser.pause(3000);
  console.log("Navigated to processor URL");
  console.log('Page Title:', await browser.getTitle());

  // Click Manage -> Work Place -> User
  const manageLink = await $('//a[text()="Manage"]');
  await manageLink.waitForClickable({ timeout: 30000 });
  await highlight(manageLink);
  await manageLink.click();
  console.log("Clicked Manage");

  const workPlaceLink = await $('//a[text()="Work Place"]');
  await workPlaceLink.waitForClickable({ timeout: 30000 });
  await highlight(workPlaceLink);
  await workPlaceLink.click();
  console.log("Clicked Work Place");

  const userLink = await $('//a[text()="User"]');
  await userLink.waitForClickable({ timeout: 30000 });
  await highlight(userLink);
  await userLink.click();
  console.log("Clicked User");

  // Filter New User
  const userIdFilter = await $('//input[@id="awdadmin_wp_u_userid_flt_txt"]');
  await userIdFilter.waitForExist({ timeout: 30000 });
  await highlight(userIdFilter);
  await userIdFilter.setValue(userid);
  await browser.pause(2000);

  const filterBtn = await $('//button[@id="awdadmin_wp_u_userid_flt_btn"]');
  await filterBtn.waitForClickable({ timeout: 30000 });
  await highlight(filterBtn);
  await filterBtn.click();
  await browser.pause(2000);

  const toUserList = await $('//*[@id="awdadmin_wp_u_userid_lst"]');
  await toUserList.waitForExist({ timeout: 30000 });
  await selectByPartialText(toUserList, userid);
  await browser.pause(1000);

  // Select Available Button
  const availableBtn = await $('//*[@id="awdadmin_wp_u_available_rbt"]');
  await availableBtn.waitForClickable({ timeout: 30000 });
  await highlight(availableBtn);
  await availableBtn.click();
  await waitForSmartClientIdle();
  await waitForNoBlockUI();

  // Click Update Button
  const updateBtn = await $('//*[@id="awdadmin_wp_u_update_btn"]');
  await updateBtn.waitForClickable({ timeout: 30000 });
  await highlight(updateBtn);
  await updateBtn.click();
  await waitForSmartClientIdle();
  await waitForNoBlockUI();
  await browser.pause(3000);
})

Then('Communications user should be created and you are now good to login with the user to use communications', async() => {
  //  Close current browser session and start a new one
  await browser.reloadSession(); // closes the existing browser and opens a fresh session

  //  Open a new blank window (optional, since reloadSession already gives a new one)
  await browser.newWindow('about:blank');
  await browser.maximizeWindow();

  //  Go to login page
  await browser.url("https://awddev.trialclient1.awdcloud.co.uk/awd/portal/login.html");

  //  Validate URL and title
  await expect(browser).toHaveUrl("https://awddev.trialclient1.awdcloud.co.uk/awd/portal/login.html");
  await expect(browser).toHaveTitle("Sign on to Chorus");

  //  Perform login
  await $("#user-name").setValue(userid);
  await $("#password").setValue('Micky$007');
  await $("#sign-on").click();

  //  Pause for visibility
  await browser.pause(5000);
  console.log('ChorusDemo7 flow completed (stabilized).');

  // 🔹 API validation
  const apis = getCapturedApis();

  console.log(`Captured ${apis.length} APIs`);

  expect(apis.length).toBeGreaterThan(0);

  // 🔹 Persist for audit/debug
  await persistApis('_chorus_process');

})





Given('I launch the Chorus portal', async() => {
  console.log(`SCRIPTLOG:Launching Chorus portal for environment`);
  await browser.maximizeWindow();
  await browser.url("https://awddev.lunate.ae-bpchorus.com/awd/portal/login.html?workspaceTarget=WSPROCSR")
  await expect(browser).toHaveUrl("https://awddev.lunate.ae-bpchorus.com/awd/portal/login.html?workspaceTarget=WSPROCSR")
  await expect(browser).toHaveTitle("Sign on to Chorus");
  await browser.pause(2000); 
})

When('I login with username and password', async() => {
  console.log(`SCRIPTLOG:Logging in with username and password:`);
  await $("#user-name").setValue("JPANICK")
  await $("#password").setValue("Ai4P@ssword2")
  await $("#sign-on").click()
  await browser.pause(5000);
})

When('I create a new lunate worklist', async() => {
  await $("//div[@class='ui-card-main-text'][contains(text(),'Worklist')]").waitForDisplayed(10000);
  console.log("SCRIPTLOG:Creating a new worklist...");
  await $("#create-btn").click();
  await $("//div[@class='ui-card-main-text'][normalize-space()='Create']").waitForDisplayed(3000);
  await browser.pause(3000)
})


Then('I select different options in the new worklist', async() => {
  console.log(`SCRIPTLOG: Selecting different options in the new Lunate worklist`);

  // Select business area, workType, status
  await selectByVisibleText("//app-create-work[@createworkresource='CRTWORK']//select[@id='create-1-work-businessArea']", 'LUNATE');
  await browser.pause(3000);
  
  await selectByVisibleText("//app-create-work[@createworkresource='CRTWORK']//select[@id='create-1-work-workType']", 'ERONBOARD');
  await browser.pause(3000);
  
  await selectByVisibleText("//app-create-work[@createworkresource='CRTWORK']//select[@id='create-1-work-status']", 'CREATED');
  await browser.pause(3000);
    
  // Submit
  const submitBtn = await $("//app-create-work[@createworkresource='CRTWORK']//button[@type='submit']");
  await submitBtn.waitForClickable({ timeout: 30000 });
  await highlight(submitBtn);
  await submitBtn.click();
  await settlePage();

});

Then('I double click to open the created work item', async() => {
  console.log(`SCRIPTLOG:Opening work item`);
  await dblClick("//div[contains(@class,'create-results')]//div[@class='list-container']//div[@class='awd-item-content']");
  await browser.pause(5000);
})

Then('I close the worklist.', async() => {
  const closeSelector = "//div[contains(text(),'LUNATE - ERONBOARD')]/../../..//*[@src='assets/icons/close.svg']";
  await browser.pause(4000);
  const closeEl = await $(closeSelector); await closeEl.waitForExist({ timeout: 20000 });
  await highlight(closeEl);
  await browser.pause(1000);
  await closeEl.click();
  await settlePage();
  await browser.pause(3000);
})

Then('I lock the worklist and then open the worklist', async() => {
  // click canUpdate button under accordion
  const canUpdateBtn = await $("//div[@aria-labelledby='p-accordiontab-1']//button[@class='canUpdate']");
  await canUpdateBtn.waitForClickable({ timeout: 30000 });
  await highlight(canUpdateBtn);
  await canUpdateBtn.click();
  await settlePage();
  // doubleClick item again
  await dblClick("//div[contains(@class,'create-results')]//div[@class='list-container']//div[@class='awd-item-content']");
  await browser.pause(2000);
})

Then('I click Yes and click on Next Step', async() => {
  // Click Continue (input value 'CONTINUE' -> following sibling div)
  const continueSibling = await $("//input[@value='CONTINUE']//following-sibling::div");
  await continueSibling.waitForClickable({ timeout: 30000 });
  await highlight(continueSibling);
  await continueSibling.click();
  await settlePage();
  await browser.pause(3000);

  // Next Step
  const nextStep = await $("//button[text()='Next Step']");
  await nextStep.waitForClickable({ timeout: 30000 });
  await highlight(nextStep);
  await nextStep.click();
  await settlePage();
  await browser.pause(3000);
})

Then('Give Employer Name and Details and click on Next Step', async() => {
  // Fill Business Name
  //const EmpName = `LUNATE_${timeStamp}`;
  const businessName = await $("//input[@title='Business Name']");
  await businessName.waitForExist({ timeout: 30000 });
  await highlight(businessName);
  await businessName.setValue(EmpName);
  await browser.pause(3000);

  // scroll down and zoom out
  await scrollToBottom();
  await setZoom(0.65);

  // safeClick Next Step (use safeClick where Java used AutoHelper.safeClick)
  await safeClick("//button[text()='Next Step']", 30000);
  await settlePage();
})

Then('Complete Employer Onboarding form Click OK and select Next', async() => {
  // Click Next
  const nextBtn = await $("//button[text()='Next']");
  await nextBtn.waitForClickable({ timeout: 30000 });
  await highlight(nextBtn);
  await nextBtn.click();
  await settlePage();
  await browser.pause(3000);

  // reset zoom, pause, click Next twice per original flow
  await setZoom(1);
  await browser.pause(5000);
  await nextBtn.waitForClickable({ timeout: 30000 });
  await highlight(nextBtn);
  await nextBtn.click();
  await browser.pause(5000);
})

Then('Review KYC Documents prior to Employer Registration , click Yes and Next', async() => {
  // Click menu button for Created Items entry
  const createdMenuBtn = await $("//span[contains(text(),'Created Items')]/../../../../../following-sibling::div//div[@class='awd-item-menu-btn']//button");
  await createdMenuBtn.waitForClickable({ timeout: 30000 });
  await highlight(createdMenuBtn);
  await createdMenuBtn.click();
  await browser.pause(3000);
})

Then('from Onboarding task, search for Parents and Open the Lunate Case', async() => {
  // Click Search for Parent
  const searchForParent = await $("//span[contains(text(),'Search for Parent')]");
  await searchForParent.waitForClickable({ timeout: 30000 });
  await highlight(searchForParent);
  await searchForParent.click();
  await browser.pause(5000);

  // Click triangle arrow
  const triangle = await $("//div[@class='search-for-parent']//button//svg-icon[contains(@src,'triangle-arrow')]");
  await triangle.waitForClickable({ timeout: 30000 });
  await highlight(triangle);
  await triangle.click();
  await browser.pause(5000);

  // click action-menu for Holdregs entry and view history
  const actionMenu = await $("//div[text()='Search For Parent']/../../../../..//div[contains(text(),' Holdregs')]/../../..//button//*[@src='assets/icons/action-menu.svg']");
  await actionMenu.waitForClickable({ timeout: 30000 });
  await highlight(actionMenu);
  await actionMenu.click();
  await browser.pause(3000);

  const viewHistory = await $("//span[contains(text(),'View History')]");
  await viewHistory.waitForClickable({ timeout: 30000 });
  await highlight(viewHistory);
  await viewHistory.click();
  await browser.pause(3000);

  // Click Process tab/button
  const processBtn = await $("//span[text()='Process']");
  await processBtn.waitForClickable({ timeout: 30000 });
  await highlight(processBtn);
  await processBtn.click();
  await browser.pause(5000);

  // close two times near LUNATE - ERONBOARD (per original)
  const closeSelector = "//div[contains(text(),'LUNATE - ERONBOARD')]/../../..//*[@src='assets/icons/close.svg']";
  const closeEls = await $$(closeSelector);
    for (let i = 0; i < Math.min(closeEls.length, 2); i++) {
      const ce = closeEls[i];
      if (await ce.isDisplayed()) {
        await highlight(ce);
        try { await ce.click(); } catch { await browser.execute(el => el.click(), ce); }
      }
    }
  await settlePage();
})

Then('Lock the Employee Onboard Work Item and Move the Work Item to Completed.', async() => {
  console.log(`SCRIPTLOG: Lock the Employee Onboard Work Item and Move the Work Item to Completed.`);
  // double click item again
  await dblClick("//div[contains(@class,'create-results')]//div[@class='list-container']//div[@class='awd-item-content']");
  await browser.pause(2000);

  // click canUpdate for LUNATE - ERONBOARD
  const canUpdateSelector = "//div[contains(text(),'LUNATE - ERONBOARD')]/..//button[@class='canUpdate']";
  const canUpdateEl = await $(canUpdateSelector); await canUpdateEl.waitForClickable({ timeout: 30000 });
  await highlight(canUpdateEl); await canUpdateEl.click();
  await browser.pause(2000);

  // safeClick input value 'COMPLETED'
  await safeClick("//input[@value='COMPLETED']", 30000);
  await browser.pause(5000);
  console.log(`SCRIPTLOG: Selecting the Work Item to Completed.`);

  // adjust zoom and safeClick NextStep and doubleClick item (per original)
  await setZoom(0.65);
  await safeClick("//button[text()='NextStep']", 30000);
  await setZoom(1);
  await browser.pause(2000);
  await dblClick("//div[contains(@class,'create-results')]//div[@class='list-container']//div[@class='awd-item-content']");
  await browser.pause(4000);
})

Then('Click to Open up the Completed Work Item', async() => {
  // Close and open Created Items menu again
  const closeSelector = "//div[contains(text(),'LUNATE - ERONBOARD')]/../../..//*[@src='assets/icons/close.svg']";
  const createdMenuBtn = await $("//span[contains(text(),'Created Items')]/../../../../../following-sibling::div//div[@class='awd-item-menu-btn']//button");
  await $(closeSelector).then(async el => { await el.waitForExist({ timeout: 20000 }); try { await el.click(); } catch { await browser.execute(node => node.click(), el); } });
  await $(createdMenuBtn).then(async el => { await el.waitForClickable({ timeout: 30000 }); await highlight(el); await el.click(); });
  await settlePage();
})

Then('Click on Refresh Lunate Case and Close it', async function() {
  // View Data and capture Object Key
  await safeClick("//span[contains(text(),'View Data')]", 30000);
  await settlePage();
  this.Ob_Key = await $("//td[contains(text(),'Object Key')]/following-sibling::td").then(async el => { await el.waitForExist({ timeout: 20000 }); return el.getText(); });
  console.log('obkey_', this.Ob_Key);
  const closeSelector = "//div[contains(text(),'LUNATE - ERONBOARD')]/../../..//*[@src='assets/icons/close.svg']";
  // close create/popups
  await $(closeSelector).then(async el => { await el.waitForExist({ timeout: 20000 }); try { await el.click(); } catch { await browser.execute(node => node.click(), el); } });
  await $("//div[contains(text(),' Create ')]/../../..//*[@src='assets/icons/close.svg']").then(async el => { await el.waitForExist({ timeout: 20000 }); try { await el.click(); } catch { await browser.execute(node => node.click(), el); } });
})


Then('I create a new worklist with Work Type as ERONBOARD and Status as ONBOARDPCK', async() => {
  // Create again with ONBOARDPCK
  await $('#create-btn').then(async el => { await el.waitForClickable({ timeout: 30000 }); await highlight(el); await el.click(); });
  await selectByVisibleText("//app-create-work[@createworkresource='CRTWORK']//select[contains(@id,'work-businessArea')]", 'LUNATE');
  await browser.pause(2000);
  await selectByVisibleText("//app-create-work[@createworkresource='CRTWORK']//select[contains(@id,'work-workType')]", 'ERONBOARD');
  await browser.pause(2000);
  await selectByVisibleText("//app-create-work[@createworkresource='CRTWORK']//select[contains(@id,'work-status')]", 'ONBOARDPCK');
  await browser.pause(2000);
  await $("//app-create-work[@createworkresource='CRTWORK']//button[@type='submit']").then(async el => { await el.waitForClickable({ timeout: 30000 }); await highlight(el); await el.click(); });
  await settlePage();
})

Then('I DoubleClick to Open it and Lock it.', async() => {
  // doubleClick, click close
  await dblClick("//div[contains(@class,'create-results')]//div[@class='list-container']//div[@class='awd-item-content']");
  await browser.pause(2000);
  const closeSelector = "//div[contains(text(),'LUNATE - ERONBOARD')]/../../..//*[@src='assets/icons/close.svg']";
  await $(closeSelector).then(async el => { await el.waitForExist({ timeout: 20000 }); try { await el.click(); } catch { await browser.execute(node => node.click(), el); } });
  await browser.pause(3000);
  await dblClick("//div[contains(@class,'create-results')]//div[@class='list-container']//div[@class='awd-item-content']");
  await browser.pause(8000);
})

Then('Click Add To Query and Click Search to find the Object Key', async() => {
  // safeClick canUpdate
  await safeClick("//div[contains(text(),'LUNATE - ERONBOARD')]/..//button[@class='canUpdate']", 30000);
  await browser.pause(3000);

  // fill Business Name again
  await $("//input[@title='Business Name']").then(async el => { await el.waitForExist({ timeout: 30000 }); await highlight(el); await el.setValue(EmpName); });
  await setZoom(0.65);
  await safeClick("//button[text()='Next Step']", 30000);
  await browser.pause(2000);
})

Then('Paste the Object Key and Link it.', async function () {
  // Enter this.Ob_Key into Original work object key input
  await $("//span[text()='Original work object key']/following-sibling::input").then(async el => { await el.waitForExist({ timeout: 20000 }); await highlight(el); await el.setValue(this.Ob_Key); });
})

Then('Click Next and Check employer details created on Percana', async() => {
  // Link -> Next -> Next
  await $("//button[text()='Link']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await highlight(el); await el.click(); });
  await $("//button[text()='Next']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await highlight(el); await el.click(); });
  await browser.pause(2000);
  await $("//button[text()='Next']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await highlight(el); await el.click(); });
  await browser.pause(2000);
})

Then('Click Yes to Question of Good Order and Enter Comments', async() => {
  // Click Yes
  await $("//input[@value='Yes']/following-sibling::div").then(async el => { await el.waitForClickable({ timeout: 20000 }); await highlight(el); await el.click(); });
  await safeClick("//button[text()='NextStep']", 30000);

  // Comments
  await $("//textarea[@awdname='comments']").then(async el => { await el.waitForExist({ timeout: 20000 }); await highlight(el); await el.setValue('Comments_' + EmpName); });
  await safeClick("//button[text()='NextStep']", 30000);
  await browser.pause(2000);
})

Then('Get the Object Key and open up a new Processor screen login as a new user.', async() => {
  // Logout sequence (first user)
  await $("//div[@id='user-menu-btn']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await highlight(el); await el.click(); });
  await $("//span[text()='Log Out']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await highlight(el); await el.click(); });
  await browser.pause(2000);
  
  console.log('Alert step');
  await browser.pause(2000);
  await browser.reloadSession();
  await browser.pause(2000);
  await setZoom(1);

  // Navigate and login as second user
  await browser.url('https://awddev.lunate.ae-bpchorus.com/awd/wsprocsr/index.html');
  await settlePage();
  await browser.maximizeWindow();
  console.log('Page Title:', await browser.getTitle());
  await $('#user-name').then(async el => { await el.waitForExist({ timeout: 20000 }); await highlight(el); await el.setValue('MMAHADE'); });
  await $('#password').then(async el => { await el.waitForExist({ timeout: 20000 }); await highlight(el); await el.setValue('Micky$007'); });
  await $('#sign-on').then(async el => { await el.waitForClickable({ timeout: 20000 }); await highlight(el); await el.click(); });
  await browser.pause(2000);
})

Then('Click on Search Retrieve Object and provide the Key.', async() => {
  // Search flow as second user
  await safeClick("//button[@id='search-btn']", 30000);
  await setZoom(0.65);
  await browser.pause(2000);
  await selectByVisibleText("//*[contains(text(),'Available Searches')]/..//select", 'Quick Search');
  await selectByVisibleText("//select[@name='fieldName']", 'BSNM - Legal Company Name');
  await selectByVisibleText("//select[@name='operation']", 'Like');
  await $("//input[@name='fieldValue']").then(async el => { await el.waitForExist({ timeout: 20000 }); await el.setValue(EmpName); });
  await browser.pause(3000);
  await $("//button[text()='Add to Query']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await el.click(); });
  await browser.pause(3000);
  await $("//button[text()='Search']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await el.click(); });
  await browser.pause(2000);
})

Then('Open up the activity which has KYC Docs Review activity', async() => {
  // double click Kyc Docs Review - Quality and perform actions
  await browser.pause(2000);
  await dblClick("//div[contains(text(),'Kyc Docs Review - Quality')]");
  await browser.pause(3000);
  await $("//button[contains(text(),'Lock')]").then(async el => { await el.waitForClickable({ timeout: 20000 }); await el.click(); });
  await browser.pause(2000);
})

Then('Click Ok on the review and quality check if KYC documents are ready to refer to GHAF Benefits', async() => {
  await safeClick("//button[text()='Next']", 30000);
  await browser.pause(2000);
})

Then('Pass the Quality Decision and Click on Refresh', async() => {
  await browser.pause(2000);
  await $("//input[@value='PASS']/following-sibling::div").then(async el => { await el.waitForClickable({ timeout: 20000 }); await highlight(el); await el.click(); });
  await browser.pause(2000);
  await $("//textarea[@name='Comments']").then(async el => { await el.waitForExist({ timeout: 20000 }); await el.setValue('Comments_' + EmpName); });
  await browser.pause(2000);
  await safeClick("//button[text()='NextStep']", 30000);
  await browser.pause(10000);

  //console.log('Before logout');
  
  // logout second user
  //await $("//div[@id='user-menu-btn']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await el.click(); });
  //await $("//span[text()='Log Out']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await el.click(); });
  //await browser.pause(2000);

  console.log('After logout');

  await browser.pause(2000);
  await browser.reloadSession();
  await browser.pause(2000);
  await setZoom(1);
  await browser.pause(2000);
})

Then('Login back as the original user select the Key', async() => {
  // final login back as JPANICK and do search/send email flows
  await browser.url('https://awddev.lunate.ae-bpchorus.com/awd/wsprocsr/index.html');
  await settlePage();
  await browser.maximizeWindow();
  await $('#user-name').then(async el => { await el.waitForExist({ timeout: 20000 }); await el.setValue('JPANICK'); });
  await $('#password').then(async el => { await el.waitForExist({ timeout: 20000 }); await el.setValue('Ai4P@ssword2'); });
  await $('#sign-on').then(async el => { await el.waitForClickable({ timeout: 20000 }); await el.click(); });
  await browser.pause(2000);
  await safeClick("//button[@id='search-btn']", 30000);
  await setZoom(0.65);
  await browser.pause(3000);
  await selectByVisibleText("//*[contains(text(),'Available Searches')]/..//select", 'Quick Search');
  await selectByVisibleText("//select[@name='fieldName']", 'BSNM - Legal Company Name');
  await selectByVisibleText("//select[@name='operation']", 'Like');
  await $("//input[@name='fieldValue']").then(async el => { await el.waitForExist({ timeout: 20000 }); await el.setValue(EmpName); });
  await browser.pause(3000);
  await $("//button[text()='Add to Query']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await el.click(); });
  await browser.pause(3000);
  await $("//button[text()='Search']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await el.click(); });
  await browser.pause(3000);
})

Then('Work Item has now passed the quality check and Send an email to GHAF Benefits', async() => {
    // double click Send Email To Lunate
    await dblClick("//div[contains(text(),'Send Email To Lunate')]");
    await browser.pause(3000);
    await safeClick("//div[contains(text(),'LUNATE - ERONBOARD')]/..//button[@class='canUpdate']", 30000);
    await safeClick("//input[@value='Write an email outside of Chorus']", 30000);
    await safeClick("//button[text()='Next']", 30000);
    await browser.pause(3000);

    // refresh-button triple click loop
    for (let i = 1; i <= 4; i++) {
      console.log('Click attempt #' + i);
      await safeClick("//div[contains(text(),'Search Results')]/../..//button[@class='refresh-button']", 30000);
      await browser.pause(1500);
    }
    await browser.pause(3000);

    // double click Hold
    await dblClick("//div[contains(text(),'Hold')]");
    await browser.pause(3000);
    await safeClick("//div[contains(text(),'LUNATE - ERONBOARD')]/..//button[@class='canUpdate']", 30000);
    await browser.pause(3000);
    await safeClick("//*[contains(text(),'Response from GHAF Benefits has been provided - Back to Process')]/..//input", 30000);

    // Comments and NextStep
    await (await $("//textarea[@title='Chorus Comments']")).waitForExist({ timeout: 20000 });
    await $("//textarea[@title='Chorus Comments']").setValue('Comments_' + EmpName);
    await safeClick("//button[text()='NextStep']", 30000);

    // refresh loop again triple
    for (let i = 1; i <= 4; i++) {
      console.log('Click attempt #' + i);
      await safeClick("//div[contains(text(),'Search Results')]/../..//button[@class='refresh-button']", 30000);
      await browser.pause(1500);
    }
    await browser.pause(2000);
})

Then('Click Lock and Write an email outside of Chorus and click Next', async() => {
  // double click Create Plan
    await dblClick("//div[contains(text(),'Create Plan')]");
    await browser.pause(3000);
    await safeClick("//div[contains(text(),'LUNATE - ERONBOARD')]/..//button[@class='canUpdate']", 30000);
    await browser.pause(3000);
    await safeClick("//*[contains(text(),'Approved')]/..//div", 30000);

    await (await $("//textarea[@title='Chorus Comments']")).waitForExist({ timeout: 20000 });
    await $("//textarea[@title='Chorus Comments']").setValue('Comments_' + EmpName);
    await safeClick("//button[text()='NextStep']", 30000);
    await browser.pause(2000);
    await safeClick("//button[text()='Next']", 30000);
    await browser.pause(2000);
    await safeClick("//input[@value='Send an email outside of Chorus']", 30000);
    await browser.pause(2000);
    await safeClick("//button[text()='Next']", 30000);
})

// Then('Select Response from GHAF Benefits has been provided.', async() => {
//   //await safeClick("//*[contains(text(),'Search Results')]/../..//button[@class='refresh-button']", 30000);
//   //await browser.pause(5000);

//   // refresh loop again triple
//     for (let i = 1; i <= 3; i++) {
//       console.log('Click attempt #' + i);
//       await safeClick("//div[contains(text(),'Search Results')]/../..//button[@class='refresh-button']", 30000);
//       await browser.pause(1000);
//     }

//   await browser.pause(3000);
//   await dblClick("//div[contains(text(),'Hold')]");
//   await browser.pause(3000);
// })

Then('Lock the work item and select Approved for GHAF Benefits and click Next', async() => {
  // logout and final flows (repeat pattern)
  // await (await $("//div[@id='user-menu-btn']")).waitForClickable({ timeout: 20000 });
  // await $("//div[@id='user-menu-btn']").click();
  // await (await $("//span[text()='Log Out']")).waitForClickable({ timeout: 20000 });
  // await $("//span[text()='Log Out']").click();
  await browser.pause(2000);
  await browser.reloadSession();
  await browser.pause(2000);
  await setZoom(1);
})


Then('Create plan on Percana', async() => {
      // navigate to home and login back as MMAHADE and run additional flows (similar to earlier)
  await browser.url('https://awddev.lunate.ae-bpchorus.com/awd/wsprocsr/index.html');
  await settlePage();
  await browser.maximizeWindow();
    // Login MMAHADE again
  await (await $('#user-name')).waitForExist({ timeout: 20000 });
  await $('#user-name').setValue('MMAHADE');
  await (await $('#password')).waitForExist({ timeout: 20000 });
  await $('#password').setValue('Micky$007');
  await (await $('#sign-on')).waitForClickable({ timeout: 20000 });
  await $('#sign-on').click();
  await browser.pause(2000);
  await safeClick("//button[@id='search-btn']", 30000);
  await setZoom(0.65);
  await browser.pause(2000);
  await selectByVisibleText("//*[contains(text(),'Available Searches')]/..//select", "Quick Search");
  await browser.pause(1000);
  await selectByVisibleText("//select[@name='fieldName']", "BSNM - Legal Company Name");
  await browser.pause(1000);
  await selectByVisibleText("//select[@name='operation']", "Like");
  await browser.pause(1000);
  await (await $("//input[@name='fieldValue']")).waitForExist({ timeout: 20000 });
  await $("//input[@name='fieldValue']").setValue(EmpName);
  await browser.pause(1000);
  await (await $("//button[text()='Add to Query']")).waitForClickable({ timeout: 20000 });
  await $("//button[text()='Add to Query']").click();
  await browser.pause(1000);
  await (await $("//button[text()='Search']")).waitForClickable({ timeout: 20000 });
  await $("//button[text()='Search']").click();
  
  // triple refresh loop
    for (let i = 1; i <= 5; i++) {
      console.log('Click attempt #' + i);
      await safeClick("//div[contains(text(),'Search Results')]/../..//button[@class='refresh-button']", 30000);
      await browser.pause(1500);
    }
  await browser.pause(3000);

  // double click Setupplnq, lock, next steps
  await dblClick("//div[contains(text(),' Setupplnq')]");
  await browser.pause(2000);
  await (await $("//button[contains(text(),'Lock')]")).waitForClickable({ timeout: 20000 });
  await $("//button[contains(text(),'Lock')]").click();
  await safeClick("//button[text()='Next']", 30000);
  await safeClick("//input[@value='PASS']/../div", 30000);
  await (await $("//textarea[@name='Comments']")).waitForExist({ timeout: 20000 });
  await $("//textarea[@name='Comments']").setValue('Comments_' + EmpName);
  await safeClick("//button[text()='NextStep']", 30000);

  // triple refresh loop
    for (let i = 1; i <= 4; i++) {
      console.log('Click attempt #' + i);
      await safeClick("//div[contains(text(),'Search Results')]/../..//button[@class='refresh-button']", 30000);
      await browser.pause(1500);
    }
  await browser.pause(3000);

})

Then('Open Work item and move to Completed', async() => {
  // Hold -> canUpdate -> Completed
  await dblClick("//div[contains(text(),'Hold')]");
  await browser.pause(3000);
  await safeClick("//div[contains(text(),'LUNATE - ERONBOARD')]/..//button[@class='canUpdate']", 30000);
  await browser.pause(3000);
  await safeClick("//input[@value='COMPLETED']", 30000);

  // Comments -> NextStep
  await (await $("//textarea[@title='Chorus Comments']")).waitForExist({ timeout: 20000 });
  await $("//textarea[@title='Chorus Comments']").setValue('Comments_' + EmpName);
  await safeClick("//button[text()='NextStep']", 30000);
  await browser.pause(3000);

    // triple refresh loop again
   for (let i = 1; i <= 4; i++) {
      console.log('Click attempt #' + i);
      await safeClick("//div[contains(text(),'Search Results')]/../..//button[@class='refresh-button']", 30000);
      await browser.pause(1500);
    }
    await browser.pause(3000);

  // double click End (second occurrence)
  await dblClick("(//div[contains(text(),'End')])[2]");
  await browser.pause(3000);

  // end of test flow

})

Then('Paste the Wrong Object Key and Link it.', async() => {
  // Enter this.Ob_Key into Original work object key input
  await $("//span[text()='Original work object key']/following-sibling::input").then(async el => { await el.waitForExist({ timeout: 20000 }); await highlight(el); await el.setValue("Wrong_Key"); });
  // Link -> Next -> Next
  await $("//button[text()='Link']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await highlight(el); await el.click(); });
  await browser.pause(3000);
  await $("//button[text()='Next']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await highlight(el); await el.click(); });
  await browser.pause(2000);
  await $("//button[text()='Next']").then(async el => { await el.waitForClickable({ timeout: 20000 }); await highlight(el); await el.click(); });
  await browser.pause(2000);
})

Given('the user login to the Chorus Portal', async() => {
  console.log(`SCRIPTLOG:Launching Chorus portal for environment`);
  await browser.maximizeWindow();
  await browser.url("https://awddev.trialclient1.awdcloud.co.uk/awd/portal/login.html")
  await expect(browser).toHaveUrl("https://awddev.trialclient1.awdcloud.co.uk/awd/portal/login.html")
  await expect(browser).toHaveTitle("Sign on to Chorus");
  await browser.pause(2000);
  console.log(`SCRIPTLOG:Logging in with username and password`);
  await $("#user-name").setValue("JPANICKE")
  await $("#password").setValue("Ai4P@ssword5")
  await $("#sign-on").click()
  await browser.pause(3000); 
})

When('they Search for the Work Item created', async() => {
  // Search
    await browser.execute(() => { document.body.style.zoom = '70%'; });
    console.log('Clicking Search button');
    await (await $('#search-btn')).waitForClickable({ timeout: 30000 });
    await $('#search-btn').click();

    await browser.execute(() => { document.body.style.zoom = '70%'; });
    await selectByVisibleText(
      "//label[normalize-space()='Available Searches']/../select",
      'Work Search'
    );

    await browser.pause(2000);

    await slowSendKeys(
      "//div[@id='businessArea_1_']//div//input[@type='text']",
      'SAMPLEBA',
      100,
      'Enter'
    );

    await browser.pause(2000);

    //Work Type
    await slowSendKeys(
      "//div[@id='workType_1_']//div//input[@type='text']",
      'DUEDILIGNC',
      100,
      'Enter'
    );

    await browser.pause(2000);

    await selectByVisibleText("//select[@id='OPER_1_']", 'GT - >');

    // Date now - 2 min
    const dt = new Date(Date.now() - 2 * 60000);
    const formatted =
      dt.getFullYear() +
      '-' +
      String(dt.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(dt.getDate()).padStart(2, '0') +
      '-' +
      String(dt.getHours()).padStart(2, '0') +
      '.' +
      String(dt.getMinutes()).padStart(2, '0');

    console.log('Using date filter:', formatted);
    await slowSendKeys("//input[@id='LDAT_1_']", formatted, 500);

    console.log('Clicking Search');
    await (await $('#Search_1_')).click();
    
    await browser.pause(4000); 
})

Then('they Open the Work Item and then Lock it', async() => {
    console.log('Opening first active card');
    await browser.execute(() => { document.body.style.zoom = '70%'; });
    await (
      await $("//div[@aria-labelledby='p-accordiontab-1']//button[@class='canUpdate']")
    ).click();

    console.log('Double-clicking SAMPLEBA - DUEDILIGNC');
    await browser.execute(() => { document.body.style.zoom = '70%'; });
    await (
      await $(
        "(//div[@id='active-cards-container']//div[contains(@id,'p-accordiontab')])[2]//span[normalize-space()='SAMPLEBA - DUEDILIGNC']"
      )
    ).doubleClick();

    await browser.pause(5000);
})
    

Then('they check the company name and registration number and Submit', async() => {
    // Window handling
    console.log('Handling popup window');
    await browser.execute(() => { document.body.style.zoom = '70%'; });
    const parent = await browser.getWindowHandle();
    const handles = await browser.getWindowHandles();

    // for (const h of handles) {
    //   await browser.switchToWindow(h);
    //   const title = await browser.getTitle();
    //   if (title.includes('Chorus Content Viewer')) {
    //     console.log('Closing window:', title);
    //     await browser.closeWindow();
    //     break;
    //   }
    // }


    if (handles.length > 1) {
      await browser.closeWindow();
      await browser.switchToWindow(parent);
    }

    await browser.switchToWindow(parent);
    console.log('Switched back to main window');
    await browser.execute(() => { document.body.style.zoom = '70%'; });
    await browser.pause(3000);
    console.log('Clicking Verify');
    await (await $("//button[normalize-space()='Verify']")).click();
    await browser.pause(2000);
})

Then('the System validate the company name and registration number, and generate a message if conditions are met', async() => {
    console.log('Submitting to create due diligence');
    await browser.execute(() => { document.body.style.zoom = '70%'; });
    await (
      await $("//button[normalize-space()='Submit for due diligence']")
    ).click();
    await browser.pause(2000);
})

Then('they open the new diligence transaction is created and attached to the main Case', async() => {
  console.log('Expanding child workflow');
    await browser.execute(() => { document.body.style.zoom = '70%'; });
    await (
      await $("//button[.//svg-icon[@src='assets/icons/triangle-arrow-down.svg']]")
    ).click();
    await browser.pause(5000);

    console.log('Opening Validate Company Info');
    await browser.execute(() => { document.body.style.zoom = '70%'; });
    await (await $("//div[contains(text(),' Validate Company Info')]")).doubleClick();
    await browser.pause(2000);

    console.log('Clicking canUpdate for DUEDILIGNC');
    await browser.execute(() => { document.body.style.zoom = '70%'; });
    await (
      await $("//div[contains(text(),'SAMPLEBA - DUEDILIGNC')]/..//button[@class='canUpdate']")
    ).click();
    await browser.pause(2000);
})

Then('they open the work item and review the questionnaire to ensure all details are captured correctly', async() => { 
    
    await browser.pause(5000);
    console.log('Double-clicking SAMPLEBA - DUEDILIGNC');
    await browser.execute(() => { document.body.style.zoom = '70%'; });
    await (
      await $(
        "(//div[@id='active-cards-container']//div[contains(@id,'p-accordiontab')])[2]//span[normalize-space()='SAMPLEBA - DUEDILIGNC']"
      )
    ).doubleClick();

    console.log('Locking workitem');
    await (await $("//div[contains(text(),'SAMPLEBA - DUEDILIGNC')]/..//button[@class='canUpdate']")).click();

    await browser.execute(() => { document.body.style.zoom = '70%'; });
    console.log('Clicking NextStep');
    await (await $("//button[@name='NextStep']")).click();
    await browser.pause(2000);
})

Then('they Select Accept and Click the Submit button to proceed with Comments', async() => {
    await browser.execute(() => { document.body.style.zoom = '60%'; });
    console.log('Entering comments');
    await slowSendKeys("//textarea[@awdname='comments']", 'Accepted', 50);
    await browser.pause(2000);

    console.log('Submitting NextStep');
    await browser.execute(() => { document.body.style.zoom = '60%'; });
    await (await $("//button[@name='NextStep']")).click();
    await browser.pause(2000);
})

Then('the system displays the alert to indicate that the case has legal issues and customer wants to proceed further', async() => {
    console.log('Accepting to proceed further');
    await browser.execute(() => { document.body.style.zoom = '60%'; });
    await (await $("//input[@value='Yes']")).click();
    await browser.pause(2000);

    console.log('Click Next');
    await browser.execute(() => { document.body.style.zoom = '60%'; });
    await (await $("//button[text()='Next']")).click();
    await browser.pause(2000);
})

Then('they Select Reject and Click the Submit button with Comments', async() => {

    console.log('Selecting Reject');
    await browser.execute(() => { document.body.style.zoom = '60%'; });
    await (await $("//label[@name='Reject']//div")).click();
    await browser.pause(2000);

    await browser.execute(() => { document.body.style.zoom = '60%'; });
    console.log('Entering comments');
    await slowSendKeys("//textarea[@awdname='comments']", 'Rejected because of Pending ongoing litigation', 50);
    await browser.pause(2000);

    console.log('Submitting NextStep');
    await browser.execute(() => { document.body.style.zoom = '60%'; });
    await (await $("//button[@name='NextStep']")).click();
    await browser.pause(2000);
})

