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


Given('the user login to the Ai4Process travel inurance portal and enter details', async() => {
  console.log(`SCRIPTLOG: Opening up https://ai4process-travel-quote.lovable.app/ portal`);
  await browser.maximizeWindow();
  await browser.url("https://ai4process-travel-quote.lovable.app/")
  await expect(browser).toHaveTitle("Lovable App");
  await browser.pause(2000);

  // Select Destination
  
  const dropdownb = await $('//label[text()="Destination"]/../button[@role="combobox"]');
  await dropdownb.click();
  await highlight(dropdownb);
  //const dropdown = await $('//label[text()="Destination"]/../button[@role="combobox"]/../select')
  await dropdownb.waitForExist({ timeout: 30000 });
  await dropdownb.selectByVisibleText('Europe (Schengen)');
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Selected Destination`);

  // Select Nr. of Travellers
  
  const dropdowntrb = await $('(//button[@role="combobox"])[2]')
  await dropdowntrb.click()
  await highlight(dropdowntrb);
  //const dropdowntr = await $('(//button[@role="combobox"])[2]/../select')
  await dropdowntrb.waitForExist({ timeout: 30000 });
  await dropdowntrb.selectByVisibleText('1 traveller');
  await browser.pause(2000);
  console.log(`SCRIPTLOG: Nr. of Travellers`);

   // Enter Email
  const email = await $('//input[@type="email"]');
  await email.waitForExist({ timeout: 30000 });
  await highlight(email);
  await email.clearValue();
  await email.setValue('testuser@test.com');
  await browser.pause(2000);


})
