// Functions and imports starts.
import { Given, When, Then } from '@wdio/cucumber-framework';
import { getTestData } from '../../utils/dataHelper.js';
import { getNameMail } from '../../utils/dataHelper.js';
import { expect, $, browser } from '@wdio/globals'
//import { handlePopupAccept, enterKeysinMSWORD , clickenterButton } from '../../utils/robotkey.js';
import { and } from 'wdio-wait-for';

console.log('LOADED: Ancile Quote step definitions');

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

Given('the user opens up the goodtogoinsurance portal', async () => {
  console.log(`SCRIPTLOG: good to go insurance portal`);
  await browser.maximizeWindow();
  await browser.url("https://quote.goodtogoinsurance.com/quote/")
  await expect(browser).toHaveTitle("New Quotation");
  await browser.pause(2000);
})
When('they enter the relevant information required for new quote', async() => {

  await browser.execute(() => { document.body.style.zoom = '70%'; });

  // Enter Destination Country
   await slowSendKeys(
      "//input[@placeholder='Destination']",
      'United Kingdom',
      100,
      'Enter'
    );
    await browser.pause(2000);

   // Enter Start Date
    //await highlight('//input[@class="date form-control startDate hasDatepicker"]');
    await selectDate('//input[@class="date form-control startDate hasDatepicker"]', '25', 'Jan', '2026');
    await browser.pause(2000);

     // Enter End Date
    //await highlight('//input[@class="date form-control endDate hasDatepicker"]');
    await selectDate('//input[@class="date form-control endDate hasDatepicker"]', '30', 'Jan', '2026');
    await browser.pause(2000);

     // Enter DOB
      await slowSendKeys(
      "//*[@id='travellerDob0']",
      '01/05/1970',
      100,
      'Enter'
      );
      await browser.pause(2000);

    //Click on Continue.
    //await highlight("//button[@class='btn quotePrimaryButton nextQuotePageButton']");
    await $("//button[@class='btn quotePrimaryButton nextQuotePageButton']").click();
    await browser.pause(5000);
})

Then('they enter the medical declaration details', async() => {
  await browser.execute(() => { document.body.style.zoom = '70%'; });
   
  await $('//*[@id="medicalDeclarationPanel"]/h1').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Clicked on medical declaration panel`);

  await $('//*[@id="question838No"]/parent::label').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Clicked No for medical declaration Q1`);

  await $('//*[@id="question839No"]/parent::label').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Clicked No for medical declaration Q2`);

  await $('//*[@id="question840No"]/parent::label').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Clicked No for medical declaration Q3`);

  await $('//*[@id="question841No"]/parent::label').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Clicked No for medical declaration Q4`);
  
  await $('//*[@id="question842No"]/parent::label').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Clicked No for medical declaration Q5`);
  
  await $('//*[@id="question843No"]/parent::label').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Clicked No for medical declaration Q6`);

  await $('//button[@class="btn MedDecSubmit quotePrimaryButton nextQuotePageButton"]').click();
  await browser.pause(5000);
  console.log(`SCRIPTLOG: Clicked Continue for medical declaration page`);
})


Then('they select the required quote', async() => {

  await browser.execute(() => { document.body.style.zoom = '70%'; });

  await $('//*[@id="schemeChoicePanel"]/div[1]/div/div/h1').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Clicked on Quotes panel`);

  await $('(//button[contains(@class,"selectWhiteButton") and @type="submit"])[2]').click();
  await browser.pause(5000);
  console.log(`SCRIPTLOG: Selected 2nd option in the Quotes panel`);
 
})

Then('they select the optional cover extension', async() => {

  await browser.execute(() => { document.body.style.zoom = '70%'; });

  await $('//*[@id="additionalOptionsPanel"]/h1').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Clicked on Additional Cover options`);

  await $('//input[@type="checkbox" and @id="option_21x-1"]').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Selected 1st optional cover extension`);

  await $('//button[@class="btn  quotePrimaryButton nextQuotePageButton"]').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Clicked Continue in the Additional Cover options`);

})

Then('they enter traveller details', async() => {
  await browser.execute(() => { document.body.style.zoom = '70%'; });

  await $('//*[@id="personalDetailsPanel"]/h1').click();
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Clicked on Traveller Details panel`);

  const title = await $('//select[@id="traveller[0][title]"]');
  await title.waitForExist({ timeout: 30000 });
  await highlight(title);
  await title.selectByVisibleText('Mr');
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Selected title`);

  // Enter FN
  const fnTxt = await $('//input[@id="traveller[0][firstName]"]');
  await fnTxt.waitForExist({ timeout: 30000 });
  await highlight(fnTxt);
  await fnTxt.clearValue();
  await fnTxt.setValue('Test');
  await browser.pause(2000);

 // Enter LN
  const lnTxt = await $('//input[@id="traveller[0][lastName]"]');
  await lnTxt.waitForExist({ timeout: 30000 });
  await highlight(lnTxt);
  await lnTxt.clearValue();
  await lnTxt.setValue('User');
  await browser.pause(2000);

  // Enter PC
  const pcTxt = await $('//input[@id="postcode"]');
  await pcTxt.waitForExist({ timeout: 30000 });
  await highlight(pcTxt);
  await pcTxt.clearValue();
  await pcTxt.setValue('HA1 2JJ');
  await browser.pause(2000);
  
  //click on Search
  await $('//button[@id="find-address"]').click();
  await browser.pause(2000);

  //select Flat 22
  // await $('//*[@id="postcodeLookupSelect"]').click();
  // await browser.pause(2000);
  const pclookup = await $('//*[@id="postcodeLookupSelect"]');
  await pclookup.waitForExist({ timeout: 30000 });
  await highlight(pclookup);
  await pclookup.selectByVisibleText('Flat 22 Tempsford Court  Sheepcote Road Harrow');
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Selected Address`);

  // Enter Mobile
  const mobilenr = await $('//input[@id="mobile"]');
  await mobilenr.waitForExist({ timeout: 30000 });
  await highlight(mobilenr);
  await mobilenr.clearValue();
  await mobilenr.setValue('987654321');
  await browser.pause(2000);
  
  // Enter Phone
  const phonenr = await $('//input[@id="phone"]');
  await phonenr.waitForExist({ timeout: 30000 });
  await highlight(phonenr);
  await phonenr.clearValue();
  await phonenr.setValue('123456789');
  await browser.pause(2000);

  // Enter Email
  const email = await $('//input[@id="email"]');
  await email.waitForExist({ timeout: 30000 });
  await highlight(email);
  await email.clearValue();
  await email.setValue('testuser@test.com');
  await browser.pause(2000);
})
