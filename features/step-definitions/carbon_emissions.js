// Functions and imports starts.
import { Given, When, Then } from '@wdio/cucumber-framework';
import { getTestData } from '../../utils/dataHelper.js';
import { getNameMail } from '../../utils/dataHelper.js';
import { expect, $, browser } from '@wdio/globals'
//import { handlePopupAccept, enterKeysinMSWORD , clickenterButton } from '../../utils/robotkey.js';
import { and } from 'wdio-wait-for';


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
  await browser.pause(2000);
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

async function selectDate(dateInputXpath, day, month, year) {
    const input = await $(dateInputXpath);
    await input.click();

    const monthDropdown = await $('.ui-datepicker-month');
    await monthDropdown.selectByVisibleText(month);

    const yearDropdown = await $('.ui-datepicker-year');
    await yearDropdown.selectByVisibleText(year);

    const dayElement = await $(`//a[text()="${day}"]`);
    await dayElement.click();
}



// Functions and imports ends.

Given('I launch the Chorus portal for {string}', async function(testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Launching Chorus portal for environment: ${testData.Env}`);
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
  console.log(`SCRIPTLOG:Selecting: Carbon Emissions`);
  await $('//div[@class="create-header"]/select').selectByVisibleText("Carbon Emissions");
  await browser.pause(2000);
  const btn = await $('(//button[normalize-space()="Create"])[5]');
  // Wait for DOM presence first
  await btn.waitForExist({ timeout: 20000 });
  // Scroll explicitly
  await btn.scrollIntoView({ block: 'center' });
  // Now wait for clickable instead of displayed
  await btn.waitForClickable({ timeout: 20000 });
  await btn.click();
  await $("//span[@class='p-accordion-header-text'][contains(text(),'Created Items')]").waitForDisplayed(5000);
  await browser.pause(3000);
});

When('I double click to open the created work item for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Opening work item: SAMPLEBA - EMISSIONS`);
  await $("(//div[@class='ui-card focused-card']//span[@class='awd-ba-type-data'][normalize-space()='SAMPLEBA - EMISSIONS'])[1]").doubleClick();
  await $("//div[text()=' SAMPLEBA - EMISSIONS ']").waitForDisplayed(3000);
  await browser.pause(3000); 
});

Then('select mode of travel as Flight. Fill the flight details and click on submit for {string}', async function (testcaseID) {
  testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Adding Primary Travel Details`);

  // Selecting Starting Location (PrimeNG p-dropdown)
  const startDropdown = await $('(//p-dropdown[@formcontrolname="selectDropdown"])[1]');
  // Wait for dropdown to be clickable
  await startDropdown.waitForClickable({ timeout: 20000 });
  // Open dropdown
  await startDropdown.click();
  // Wait for overlay panel to appear
  const dropdownPanel = await $('.p-dropdown-panel');
  await dropdownPanel.waitForDisplayed({ timeout: 10000 });
  // Select option
  const option = await $(`//div[contains(@class,'p-dropdown-panel')]//span[normalize-space()='${testData.startLoc}']`);
  await option.waitForClickable({ timeout: 10000 });
  await option.click();
  await browser.pause(2000); 

  // Adding Starting Date
  const stDate = await $('(//p-calendar[@formcontrolname="dateInput"])[1]//input');
  await stDate.waitForClickable({ timeout: 30000 });
  await highlight(stDate);
  // Clear safely
  await stDate.click();
  await browser.keys(['Control', 'a']);
  await browser.keys('Delete');
  // Set value (ensure correct format your app expects)
  await stDate.setValue(testData.stDate);  
  // Trigger blur if Angular validation requires it
  await browser.keys('Tab');
  await browser.pause(2000); 

  //Adding Purpose of Meeting
  //Need to look again as there are some issues
  const purpose = await $('//label[normalize-space()="Purpose of Call"]/following-sibling::div//input');
  await purpose.waitForExist({ timeout: 30000 });
  await highlight(purpose);
  await purpose.click();
  await browser.pause(2000);
  await browser.keys(testData.trPurpose);  

  //Selecting Destination Location
  const endDropdown = await $('(//p-dropdown[@formcontrolname="selectDropdown"])[2]');
  // Wait for dropdown to be clickable
  await endDropdown.waitForClickable({ timeout: 20000 });
  // Open dropdown
  await endDropdown.click();
  // Wait for overlay panel to appear
  const enddropdownPanel = await $('.p-dropdown-panel');
  await enddropdownPanel.waitForDisplayed({ timeout: 10000 });
  // Select option
  const endoption = await $(`//div[contains(@class,'p-dropdown-panel')]//span[normalize-space()='${testData.destLoc}']`);
  await endoption.waitForClickable({ timeout: 10000 });
  await endoption.click();
  await browser.pause(2000); 

  //Adding End Date
  const endDate = await $('(//p-calendar[@formcontrolname="dateInput"])[2]//input');
  await endDate.waitForClickable({ timeout: 30000 });
  await highlight(endDate);
  // Clear safely
  await endDate.click();
  await browser.keys(['Control', 'a']);
  await browser.keys('Delete');
  // Set value (ensure correct format your app expects)
  await endDate.setValue(testData.endDate);  
  // Trigger blur if Angular validation requires it
  await browser.keys('Tab');
  await browser.pause(2000); 

  //Selecting Flight option
  await $('//label[normalize-space()="Flight"]/preceding-sibling::input').click();
  await browser.pause(2000);

  //Selecting Economy option

   async function selectRadio(label) {
    const radio = await $(`//label[normalize-space()='${label}']/preceding-sibling::p-radiobutton//div[contains(@class,'p-radiobutton-box')]`);
    await radio.waitForClickable({ timeout: 30000 });
    await radio.scrollIntoView();
    await radio.click();
    }

  // Select Economy option
  await browser.execute(() => { document.body.style.zoom = '90%'; });
  await selectRadio("Economy");
  await browser.pause(2000);
  
  // adding Starting location
  const startlocDropdown = await $('(//strong[text()="Flight Details"]/../../../../..//p-dropdown[@formcontrolname="selectDropdown"])[1]');
  // Wait for dropdown to be clickable
  await startlocDropdown.waitForClickable({ timeout: 20000 });
  // Open dropdown
  await startlocDropdown.click();
  // Wait for overlay panel to appear
  const locdropdownPanel = await $('.p-dropdown-panel');
  await locdropdownPanel.waitForDisplayed({ timeout: 10000 });
  // Select option
  const optionloc = await $(`//div[contains(@class,'p-dropdown-panel')]//span[normalize-space()='${testData.stAirport}']`);
  await optionloc.waitForClickable({ timeout: 10000 });
  await optionloc.click();
  await browser.pause(2000); 

  // When the endloc was a textBox.
  // const endloc = await $('//strong[text()="Bus Details"]/../../../../..//label[normalize-space()="Destination Location"]//following-sibling::div//input');
  // await endloc.waitForExist({ timeout: 30000 });
  // await highlight(endloc);
  // //await endloc.scrollIntoView();
  // await endloc.click();
  // await browser.pause(2000);
  // await browser.keys(testData.destLoc);

  // adding Destination location 
  const endlocDropdown = await $('(//strong[text()="Flight Details"]/../../../../..//p-dropdown[@formcontrolname="selectDropdown"])[2]');
  // Wait for dropdown to be clickable
  await endlocDropdown.waitForClickable({ timeout: 20000 });
  // Open dropdown
  await endlocDropdown.click();
  // Wait for overlay panel to appear
  const endlocdropdownPanel = await $('.p-dropdown-panel');
  await endlocdropdownPanel.waitForDisplayed({ timeout: 10000 });
  // Select option
  const optionendloc = await $(`//div[contains(@class,'p-dropdown-panel')]//span[normalize-space()='${testData.endAirport}']`);
  await optionendloc.waitForClickable({ timeout: 10000 });
  await optionendloc.click();
  await browser.pause(2000); 
  
  // adding Distance travelled
  await $("//strong[text()='Flight Details']/../../../../..//label[normalize-space()='Distance Travelled (KM)']//following-sibling::div//input").setValue(testData.Distance);
   
  // Click submit
  const submitBtn = $("//button[normalize-space()='Submit']");
  await submitBtn.waitForClickable({ timeout: 30000 });
  await submitBtn.click();
  await browser.pause(2000);
})

Then('transaction will move to next step and will calculate the emission', async() => {
    // click canUpdate button under accordion
    // const canUpdateBtn = await $("//div[@aria-labelledby='p-accordiontab-1']//button[@class='canUpdate']");
    // await canUpdateBtn.waitForClickable({ timeout: 30000 });
    // await highlight(canUpdateBtn);
    // await canUpdateBtn.click();
    // await settlePage();
    // doubleClick item again
    await dblClick("//div[contains(@class,'create-results')]//div[@class='list-container']//div[@class='awd-item-content']");
    await browser.pause(2000);
    console.log(`SCRIPTLOG:Finished calculate the emission step`);   
})

Then('provide feedback and click on End button to end the transaction', async() => {
  console.log(`SCRIPTLOG:Starting provide feedback and click on End button to end the transaction`);
  await browser.pause(1000);
  const lockBtn = await $("//div[contains(text(),' SAMPLEBA - EMISSIONS ')]/..//button[@class='canUpdate']");
  await lockBtn.waitForDisplayed({ timeout: 30000 });
  await browser.execute((el) => {
      el.click();
  }, lockBtn);

   // pause and keep browser open
  //await browser.debug();

  // Add comments
  const comments = await $('//textarea[@formcontrolname="chorusCommentsInput"]');
  await comments.waitForExist({ timeout: 30000 });
  await highlight(comments);
  await comments.scrollIntoView();
  await comments.click();
  await browser.pause(2000);
  await browser.keys('Reviewed'); 

  // Click End
  const endBtn = $("//button[normalize-space()='End']");
  await endBtn.waitForClickable({ timeout: 30000 });
  await endBtn.click();
  await browser.pause(5000);

})

Then('select mode of travel as Bus. Fill the details and click on submit for {string}', async function (testcaseID) {
    testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Adding Primary Travel Details`);

  // Selecting Starting Location (PrimeNG p-dropdown)
  const startDropdown = await $('(//p-dropdown[@formcontrolname="selectDropdown"])[1]');
  // Wait for dropdown to be clickable
  await startDropdown.waitForClickable({ timeout: 20000 });
  // Open dropdown
  await startDropdown.click();
  // Wait for overlay panel to appear
  const dropdownPanel = await $('.p-dropdown-panel');
  await dropdownPanel.waitForDisplayed({ timeout: 10000 });
  // Select option
  const option = await $(`//div[contains(@class,'p-dropdown-panel')]//span[normalize-space()='${testData.startLoc}']`);
  await option.waitForClickable({ timeout: 10000 });
  await option.click();
  await browser.pause(2000); 

  // Adding Starting Date
  const stDate = await $('(//p-calendar[@formcontrolname="dateInput"])[1]//input');
  await stDate.waitForClickable({ timeout: 30000 });
  await highlight(stDate);
  // Clear safely
  await stDate.click();
  await browser.keys(['Control', 'a']);
  await browser.keys('Delete');
  // Set value (ensure correct format your app expects)
  await stDate.setValue(testData.stDate);  
  // Trigger blur if Angular validation requires it
  await browser.keys('Tab');
  await browser.pause(2000); 

  //Adding Purpose of Meeting
  //Need to look again as there are some issues
  const purpose = await $('//label[normalize-space()="Purpose of Call"]/following-sibling::div//input');
  await purpose.waitForExist({ timeout: 30000 });
  await highlight(purpose);
  await purpose.click();
  await browser.pause(2000);
  await browser.keys(testData.trPurpose);  

  //Selecting Destination Location
  const endDropdown = await $('(//p-dropdown[@formcontrolname="selectDropdown"])[2]');
  // Wait for dropdown to be clickable
  await endDropdown.waitForClickable({ timeout: 20000 });
  // Open dropdown
  await endDropdown.click();
  // Wait for overlay panel to appear
  const enddropdownPanel = await $('.p-dropdown-panel');
  await enddropdownPanel.waitForDisplayed({ timeout: 10000 });
  // Select option
  const endoption = await $(`//div[contains(@class,'p-dropdown-panel')]//span[normalize-space()='${testData.destLoc}']`);
  await endoption.waitForClickable({ timeout: 10000 });
  await endoption.click();
  await browser.pause(2000); 

  //Adding End Date
  const endDate = await $('(//p-calendar[@formcontrolname="dateInput"])[2]//input');
  await endDate.waitForClickable({ timeout: 30000 });
  await highlight(endDate);
  // Clear safely
  await endDate.click();
  await browser.keys(['Control', 'a']);
  await browser.keys('Delete');
  // Set value (ensure correct format your app expects)
  await endDate.setValue(testData.endDate);  
  // Trigger blur if Angular validation requires it
  await browser.keys('Tab');
  await browser.pause(2000); 

  //Selecting Bus option
  await $('//label[normalize-space()="Bus"]/preceding-sibling::input').click();
  await browser.pause(5000);

  // adding Starting location
  const stlocbus = await $('//strong[text()="Bus Details"]/../../../../..//label[normalize-space()="Starting Location"]//following-sibling::div//input');
  await stlocbus.waitForExist({ timeout: 30000 });
  await highlight(stlocbus);
  await stlocbus.scrollIntoView();
  await stlocbus.click();
  await browser.pause(2000);
  await browser.keys(testData.startLoc); 
  //await stloc.setValue(testData.startLoc);

  // adding Destination location
  const endloc = await $('//strong[text()="Bus Details"]/../../../../..//label[normalize-space()="Destination Location"]//following-sibling::div//input');
  await endloc.waitForExist({ timeout: 30000 });
  await highlight(endloc);
  //await endloc.scrollIntoView();
  await endloc.click();
  await browser.pause(2000);
  await browser.keys(testData.destLoc); 
  
  // adding Distance travelled
  await $("//strong[text()='Bus Details']/../../../../..//label[normalize-space()='Distance Travelled (KM)']//following-sibling::div//input").setValue(testData.Distance);
   
  // Click submit
  const submitBtn = $("//button[normalize-space()='Submit']");
  await submitBtn.waitForClickable({ timeout: 30000 });
  await submitBtn.click();
  await browser.pause(2000);
})

Then('select mode of travel as Train. Fill the details and click on submit for {string}', async function (testcaseID) {
    testData = getTestData(testcaseID); // Load data from Excel sheet matching TestCaseId row
  console.log(`SCRIPTLOG:Adding Primary Travel Details`);

  // Selecting Starting Location (PrimeNG p-dropdown)
  const startDropdown = await $('(//p-dropdown[@formcontrolname="selectDropdown"])[1]');
  // Wait for dropdown to be clickable
  await startDropdown.waitForClickable({ timeout: 20000 });
  // Open dropdown
  await startDropdown.click();
  // Wait for overlay panel to appear
  const dropdownPanel = await $('.p-dropdown-panel');
  await dropdownPanel.waitForDisplayed({ timeout: 10000 });
  // Select option
  const option = await $(`//div[contains(@class,'p-dropdown-panel')]//span[normalize-space()='${testData.startLoc}']`);
  await option.waitForClickable({ timeout: 10000 });
  await option.click();
  await browser.pause(2000); 

  // Adding Starting Date
  const stDate = await $('(//p-calendar[@formcontrolname="dateInput"])[1]//input');
  await stDate.waitForClickable({ timeout: 30000 });
  await highlight(stDate);
  // Clear safely
  await stDate.click();
  await browser.keys(['Control', 'a']);
  await browser.keys('Delete');
  // Set value (ensure correct format your app expects)
  await stDate.setValue(testData.stDate);  
  // Trigger blur if Angular validation requires it
  await browser.keys('Tab');
  await browser.pause(2000); 

  //Adding Purpose of Meeting
  //Need to look again as there are some issues
  const purpose = await $('//label[normalize-space()="Purpose of Call"]/following-sibling::div//input');
  await purpose.waitForExist({ timeout: 30000 });
  await highlight(purpose);
  await purpose.click();
  await browser.pause(2000);
  await browser.keys(testData.trPurpose);  

  //Selecting Destination Location
  const endDropdown = await $('(//p-dropdown[@formcontrolname="selectDropdown"])[2]');
  // Wait for dropdown to be clickable
  await endDropdown.waitForClickable({ timeout: 20000 });
  // Open dropdown
  await endDropdown.click();
  // Wait for overlay panel to appear
  const enddropdownPanel = await $('.p-dropdown-panel');
  await enddropdownPanel.waitForDisplayed({ timeout: 10000 });
  // Select option
  const endoption = await $(`//div[contains(@class,'p-dropdown-panel')]//span[normalize-space()='${testData.destLoc}']`);
  await endoption.waitForClickable({ timeout: 10000 });
  await endoption.click();
  await browser.pause(2000); 

  //Adding End Date
  const endDate = await $('(//p-calendar[@formcontrolname="dateInput"])[2]//input');
  await endDate.waitForClickable({ timeout: 30000 });
  await highlight(endDate);
  // Clear safely
  await endDate.click();
  await browser.keys(['Control', 'a']);
  await browser.keys('Delete');
  // Set value (ensure correct format your app expects)
  await endDate.setValue(testData.endDate);  
  // Trigger blur if Angular validation requires it
  await browser.keys('Tab');
  await browser.pause(2000); 

  //Selecting Train option
  await $('//label[normalize-space()="Train"]/preceding-sibling::input').click();
  await browser.pause(2000);
  
   // pause and keep browser open
  //await browser.debug();

  // adding Starting location
  const stloc = await $('//strong[text()="Train Details"]/../../../../..//label[normalize-space()="Starting Location"]//following-sibling::div//input');
  await stloc.scrollIntoView();
  await browser.pause(2000);
  await stloc.waitForExist({ timeout: 30000 });
  await highlight(stloc);
  await stloc.click();
  await browser.pause(2000);
  await browser.keys(testData.startLoc); 

  // adding Destination location
  const endloc = await $('//strong[text()="Train Details"]/../../../../..//label[normalize-space()="Destination Location"]//following-sibling::div//input');
  await endloc.waitForExist({ timeout: 30000 });
  await highlight(endloc);
  //await endloc.scrollIntoView();
  await endloc.click();
  await browser.pause(2000);
  await browser.keys(testData.destLoc); 
  
  // adding Distance travelled
  await $("//strong[text()='Train Details']/../../../../..//label[normalize-space()='Distance Travelled (KM)']//following-sibling::div//input").setValue(testData.Distance);
   
  // Click submit
  const submitBtn = $("//button[normalize-space()='Submit']");
  await submitBtn.waitForClickable({ timeout: 30000 });
  await submitBtn.click();
  await browser.pause(2000);
})

