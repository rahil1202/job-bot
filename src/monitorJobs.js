import puppeteer from 'puppeteer';
import { CONFIG } from './config.js';
import { findChromePath } from './browserUtils.js';
import { isTargetJob } from './jobMatcher.js';
import { scrapeJobs } from './jobScraper.js';
import { applyForJob } from './jobApplicator.js';

let currentProfileIndex = 0;

export const monitorJobs = async () => {
    console.log("🚀 Starting Amazon Jobs Monitor...");
    console.log("Looking for the following positions:");
    CONFIG.TARGET_JOBS.forEach(job => console.log(`- ${job}`));
    
    const chromePath = await findChromePath();
    console.log(`Using Chrome from: ${chromePath}`);

    // Get current profile to use
    const profileToUse = CONFIG.CHROME_PROFILES[currentProfileIndex];
    
    // Update index for next run (cycle through profiles)
    currentProfileIndex = (currentProfileIndex + 1) % CONFIG.CHROME_PROFILES.length;
    
    console.log(`Using Chrome profile: ${profileToUse}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            executablePath: chromePath,
            defaultViewport: null,
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--start-maximized',
                `--user-data-dir=${CONFIG.USER_DATA_DIR}`,
                `--profile-directory=${profileToUse}`
            ]
        });

        const page = await browser.newPage();
        // Set a more recent user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        // Add randomized typing and movement behavior
        await page.evaluateOnNewDocument(() => {
            // Override the navigator.webdriver property to prevent detection
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false
            });
        });

        while (true) {
            try {
                console.log("\n🔍 Checking for warehouse positions...");
                
                // Add a random delay to mimic human behavior
                const randomDelay = Math.floor(Math.random() * 5000) + 5000;
                console.log(`Waiting ${randomDelay}ms before next check...`);
                await new Promise(resolve => setTimeout(resolve, randomDelay));
                
                await page.goto(CONFIG.AMAZON_JOBS_URL, { 
                    waitUntil: "domcontentloaded",
                    timeout: 60000 
                });
                
                // Wait a bit after page load for any dynamic content
                await new Promise(resolve => setTimeout(resolve, 3000));

                const jobs = await scrapeJobs(page);
                console.log(`Found ${jobs.length} total positions`);
                
                const matchingJobs = jobs.filter(job => isTargetJob(job.title, CONFIG.TARGET_JOBS));

                if (matchingJobs.length > 0) {
                    console.log(`✅ Found ${matchingJobs.length} matching positions!`);
                    
                    for (const job of matchingJobs) {
                        console.log(`Processing: ${job.title}`);
                        
                        // Add random delay between processing jobs
                        const jobDelay = Math.floor(Math.random() * 10000) + 5000;
                        console.log(`Waiting ${jobDelay}ms before next job...`);
                        await new Promise(resolve => setTimeout(resolve, jobDelay));
                        // Click on the job element
                        const jobElements = await page.$$('.hvh-careers-emotion-1pll7m0');
                        if (jobElements.length > job.index) {
                            console.log(`Found ${jobElements.length} job elements, clicking on element at index ${job.index}`);
                            
                            try {
                                // Take a screenshot before clicking
                                // await page.screenshot({ path: `before-job-click-${Date.now()}.png` });
                                
                                // New approach: Click and wait for navigation simultaneously
                                console.log("Clicking job and waiting for navigation...");
                                
                                try {
                                    // Use Promise.all to handle both click and navigation
                                    await Promise.all([
                                        // This waits for navigation with a less strict condition
                                        page.waitForNavigation({ 
                                            timeout: 30000, 
                                            waitUntil: "domcontentloaded" 
                                        }).catch(err => {
                                            console.log("Navigation timeout, but proceeding anyway...");
                                        }),
                                        // This clicks the job element
                                        jobElements[job.index].click()
                                    ]);
                                    
                                    console.log("Navigation completed");
                                } catch (clickError) {
                                    console.error(`Error during click and navigation: ${clickError.message}`);
                                    // Continue anyway
                                }
                                
                                // Give the page some time to settle
                                await new Promise(resolve => setTimeout(resolve, 5000));
                                
                                // Log the current URL to help with debugging
                                const currentUrl = await page.url();
                                console.log(`Current page URL: ${currentUrl}`);
                                
                                // Add a screenshot for debugging
                                // await page.screenshot({ path: `job-details-page-${Date.now()}.png` });
                                
                                // Verify we're on the job details page by checking for elements
                                console.log("Checking if we're on the job details page...");
                                const onJobPage = await page.evaluate(() => {
                                    return !!document.querySelector('#jobDetailApplyButtonDesktop') || 
                                        !!document.querySelector('.jobDetailScheduleDropdown') ||
                                        !!document.querySelector('[data-testid="job-detail-apply-button"]') ||
                                        document.title.includes('Job Details');
                                });
                                
                                if (onJobPage) {
                                    console.log("Successfully navigated to job details page");
                                } else {
                                    console.log("May not be on job details page - continuing anyway");
                                    // Wait a bit longer in case page is still loading
                                    await new Promise(resolve => setTimeout(resolve, 5000));
                                }
                                
                                // Now look for shift selection with improved error handling
                                console.log("Looking for shift selection dropdown...");
                                
                                // Check if shift selection is present before interacting
                                const hasShiftDropdown = await page.evaluate(() => {
                                    // Look for different possible selectors for the dropdown
                                   const selectors = [
                                        '.jobDetailScheduleDropdown.hvh-careers-emotion-1uzwmf0',
                                        '.jobDetailScheduleDropdown',
                                        '[data-testid="shift-preference-dropdown"]',
                                        'select[name="shift"]',
                                        '[aria-label="Select shift"]',
                                        '.scheduleFlyoutSelection', // Adding the class from your screenshot
                                        '.hvh-careers-emotion-wp352q' // Adding the class from your screenshot
                                    ];
                                    
                                    for (const selector of selectors) {
                                        if (document.querySelector(selector)) {
                                            return selector;
                                        }
                                    }
                                    return null;
                                });
                                
                                if (hasShiftDropdown) {
                                    console.log(`Shift dropdown found with selector: ${hasShiftDropdown}`);
                                    // Wait a moment before interacting\
                                    await new Promise(resolve => setTimeout(resolve, 4000));
                                    
                                    try {
                                        await page.click(hasShiftDropdown);
                                        
                                        await new Promise(resolve => setTimeout(resolve, 4000));                                     
                                       
                                        // Look for dropdown options with a more comprehensive approach
                                        console.log("Looking for shift options...");
                                        const optionsExist = await page.evaluate(() => {
            // First try the specific selector structure from screenshot
                                                const shiftItems = document.querySelectorAll('.hvh-careers-emotion-1ewhhfh');
                                                if (shiftItems && shiftItems.length > 0) {
                                                    return { selector: '.hvh-careers-emotion-1ewhhfh', count: shiftItems.length };
                                                }
                                                
                                                // Alternative: try getting the first shift container
                                                // scheduleDetails hvh-careers-emotion-15qbkvn
                                                const shiftContainer = document.querySelector('.hvh-careers-emotion-15qbkvn');
                                                if (shiftContainer) {
                                                    // Get the first clickable child element
                                                    const firstShift = shiftContainer.querySelector('div[role="button"]') || 
                                                                    shiftContainer.querySelector('div.pointer') ||
                                                                    shiftContainer.firstElementChild;
                                                    
                                                    if (firstShift) {
                                                        // Add a data attribute so we can select it
                                                        firstShift.setAttribute('data-first-shift', 'true');
                                                        return { selector: '[data-first-shift="true"]', count: 1 };
                                                    }
                                                }
                                                
                                                // Fallback to other selectors
                                                const optionSelectors = [
                                                    'option',
                                                    'li[role="option"]',
                                                    '[role="option"]',
                                                    '.dropdown-item',
                                                    'div[role="button"]',
                                                    '.pointer'
                                                ];
                                                
                                                for (const selector of optionSelectors) {
                                                    const options = document.querySelectorAll(selector);
                                                    if (options.length > 0) {
                                                        return { selector, count: options.length };
                                                    }
                                                }
                                                
                                                return null;
                                            });
                                            
                                            if (optionsExist) {
                                                console.log(`Found ${optionsExist.count} shift options with selector: ${optionsExist.selector}`);
                                                
                                                // Click the first option
                                                await page.click(`${optionsExist.selector}:first-of-type`);
                                                console.log("Clicked first shift option");
                                                
                                                // Take screenshot after clicking
                                                // await page.screenshot({ path: `after-shift-selection-${Date.now()}.png` });
                                                
                                                // Give it a moment to register the selection
                                                await new Promise(resolve => setTimeout(resolve, 3000));
                                            } else {
                                                console.log("Could not find shift options using standard selectors. Trying direct approach...");
                                                
                                                // Try a more direct approach using the page structure we can see in the screenshot
                                                await page.evaluate(() => {
                                                    // Try to find and click the first shift item by looking at the DOM structure
                                                    const shiftItems = document.querySelectorAll('div.pointer');
                                                    if (shiftItems && shiftItems.length > 0) {
                                                        shiftItems[0].click();
                                                        return true;
                                                    }
                                                    
                                                    // Another approach - find anything that looks like a shift item
                                                    const allDivs = document.querySelectorAll('div');
                                                    for (const div of allDivs) {
                                                        if (div.innerText && div.innerText.includes('Flexible Shifts')) {
                                                            div.click();
                                                            return true;
                                                        }
                                                    }
                                                    
                                                    return false;
                                                });
                                                
                                                // Wait for selection to register
                                                await new Promise(resolve => setTimeout(resolve, 3000));
                                                // await page.screenshot({ path: `direct-shift-selection-${Date.now()}.png` });
                                            }
                                        } catch (dropdownError) {
                                            console.error(`Error interacting with dropdown: ${dropdownError.message}`);
                                            // Continue anyway to try the apply button
                                        }
                                    } else {
                                        console.log("No shift dropdown found. Will proceed directly to apply button...");
                                    }
                                
                                // Take screenshot after shift selection attempt
                                // await page.screenshot({ path: `after-shift-selection-${Date.now()}.png` });
                                
                                // Now look for the apply button with improved detection
                                console.log("Looking for apply button...");
                                const applyButtonSelector = await page.evaluate(() => {
                                    // Check multiple possible selectors
                                    const buttonSelectors = [
                                        '#jobDetailApplyButtonDesktop',
                                        '[data-testid="job-detail-apply-button"]',
                                        'a.apply-button',
                                        'button.apply-button',
                                        'a[href*="apply"]',
                                        'button:contains("Apply")',
                                        '.hvh-careers-emotion-[class*="applyButton"]'
                                    ];
                                    
                                    for (const selector of buttonSelectors) {
                                        try {
                                            const button = document.querySelector(selector);
                                            if (button) {
                                                return selector;
                                            }
                                        } catch (e) {
                                            // Ignore errors from invalid selectors
                                        }
                                    }
                                    
                                    // Look for buttons with "Apply" text
                                    const buttons = Array.from(document.querySelectorAll('button, a.button, a.btn'));
                                    for (const button of buttons) {
                                        if (button.innerText.toLowerCase().includes('apply')) {
                                            // Return an identifier we can use to find this element
                                            button.setAttribute('data-test-apply-button', 'true');
                                            return '[data-test-apply-button="true"]';
                                        }
                                    }
                                    
                                    return null;
                                });
                                
                                if (applyButtonSelector) {
                                    console.log(`Apply button found with selector: ${applyButtonSelector}`);
                                    
                                    // Wait a moment before clicking
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    
                                    try {
                                        // Click the apply button, opening in new tab
                                        await page.evaluate((selector) => {
                                            const applyButton = document.querySelector(selector);
                                            if (applyButton) {
                                                // Ensure it opens in a new tab
                                                applyButton.setAttribute('target', '_blank');
                                                applyButton.click();
                                            }
                                        }, applyButtonSelector);

                                        await page.screenshot({ path: `successful-apply-button-click-${Date.now()}.png` });
                                        
                                        console.log("✅ Application process initiated - waiting a few seconds before final screenshot...");

                                        // Wait a few seconds before taking final screenshot
                                        await new Promise(resolve => setTimeout(resolve, 10000));

                                        // Take final screenshot
                                        await page.screenshot({ path: `application-completed-${Date.now()}.png` });

                                        console.log("✅ Bot execution stopped - browser left open as requested");

                                        // Return from the function instead of disconnecting browser and exiting process
                                        return;
                                        
                                    } catch (applyError) {
                                        console.error(`Error clicking apply button: ${applyError.message}`);
                                        // await page.screenshot({ path: `apply-button-error-${Date.now()}.png` });
                                    }
                                } else {
                                    console.log("No apply button found using standard selectors. Taking screenshot and searching page content...");
                                    // await page.screenshot({ path: `no-apply-button-${Date.now()}.png` });
                                    
                                    // Try a different approach - look at page text
                                    const pageHasApplyText = await page.evaluate(() => {
                                        return document.body.innerText.toLowerCase().includes('apply');
                                    });
                                    
                                    if (pageHasApplyText) {
                                        console.log("Page contains 'apply' text but button not found with selectors.");
                                    }
                                }
                                
                            } catch (error) {
                                console.error(`Error processing job: ${error.message}`);
                                // await page.screenshot({ path: `error-state-${Date.now()}.png` });
                            }
                            
                            // Go back to the search results if we haven't returned yet
                            console.log("Returning to search results...");
                            try {
                                await page.goBack({ waitUntil: "domcontentloaded", timeout: 30000 });
                                // Wait for the search page to load
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            } catch (backError) {
                                console.error(`Error going back: ${backError.message}`);
                                // If going back fails, navigate to the search URL again
                                await page.goto(CONFIG.AMAZON_JOBS_URL, { 
                                    waitUntil: "domcontentloaded",
                                    timeout: 60000 
                                });
                                // Wait for the search page to load
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            }
                        } else {
                            console.error(`Could not find element for job index ${job.index}`);
                        }
                    }
                }

                console.log("❌ No matching positions found or unable to apply. Waiting to retry...");
                // Random delay between retries to appear more human-like
                const retryDelay = Math.floor(Math.random() * 10000) + CONFIG.REFRESH_INTERVAL;
                console.log(`Waiting ${retryDelay/1000} seconds before next check...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                
            } catch (error) {
                console.error("Error during job search:", error.message);
                // await page.screenshot({ path: `search-error-${Date.now()}.png` });
                await new Promise(resolve => setTimeout(resolve, 60000));
            }
        }
    } catch (error) {
        console.error("Fatal error:", error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};