import robot from "robotjs";
import { expect, $, browser } from '@wdio/globals'


// Function to handle popup Accept
export async function handlePopupAccept() {
    // Give time for the popup to appear
    await browser.pause(1000);
    await robot.keyTap('tab');  // Focus Cancel
    await browser.pause(1000);
    await robot.keyTap('tab');  // Focus Cancel
    await browser.pause(1000);
    await robot.keyTap('enter'); // Press Cancel
}

export async function enterKeysinMSWORD(){
    await browser.pause(10000);
    await robot.keyToggle('alt', 'down');
    await robot.keyTap('y');
    await robot.keyToggle('alt', 'up');
    await browser.pause(1000);
    await robot.keyTap('2'); 
    await browser.pause(1000);
    await robot.keyTap('Y'); 
    await browser.pause(1000);
    await robot.keyTap('2'); 
}

export async function clickenterButton() {
    // Give time for the popup to appear
    await browser.pause(1000);
    await robot.keyTap('enter'); // Press Cancel
}
