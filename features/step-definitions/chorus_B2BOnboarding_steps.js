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

// Functions and imports ends.


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

