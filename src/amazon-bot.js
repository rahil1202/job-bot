// const puppeteer = require("puppeteer");
// const path = require("path");
// const fs = require('fs');

// // Configuration
// const CONFIG = {
//     AMAZON_JOBS_URL: "https://hiring.amazon.com/app#/jobSearch",
//     // Array of job titles we're looking for
//     TARGET_JOBS: [
//         "Delivery Station Warehouse Associate",
//         "Fulfilment Station Warehouse Associate"
//     ],
//     USER_DATA_DIR: path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data'),
//     CHROME_PROFILE: "Profile 11",
//     REFRESH_INTERVAL: 30000,
//     USER_INFO: {
//         firstName: "John",
//         lastName: "Doe",
//         email: "johndoe@example.com",
//         phone: "1234567890",
//         resume: path.join(__dirname, "resume.pdf")
//     }
// };

// // Function to find Chrome executable
// function findChromePath() {
//     const commonPaths = [
//         'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
//         'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
//         process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
//         'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
//     ];

//     for (const path of commonPaths) {
//         if (fs.existsSync(path)) {
//             return path;
//         }
//     }
    
//     throw new Error('Chrome not found! Please install Chrome or provide the correct path.');
// }

// // Function to check if a job title matches our target jobs
// function isTargetJob(jobTitle) {
//     return CONFIG.TARGET_JOBS.some(targetJob => 
//         jobTitle.toLowerCase().includes(targetJob.toLowerCase())
//     );
// }

// async function monitorJobs() {
//     console.log("🚀 Starting Amazon Jobs Monitor...");
//     console.log("Looking for the following positions:");
//     CONFIG.TARGET_JOBS.forEach(job => console.log(`- ${job}`));
    
//     const chromePath = findChromePath();
//     console.log(`Using Chrome from: ${chromePath}`);

//     let browser;
//     try {
//         browser = await puppeteer.launch({
//             headless: false,
//             executablePath: chromePath,
//             defaultViewport: null,
//             ignoreDefaultArgs: ['--enable-automation'],
//             args: [
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--disable-dev-shm-usage',
//                 '--start-maximized',
//                 `--user-data-dir=${CONFIG.USER_DATA_DIR}`,
//                 `--profile-directory=${CONFIG.CHROME_PROFILE}`
//             ]
//         });

//         const page = await browser.newPage();
        
//         await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

//         while (true) {
//             try {
//                 console.log("\n🔍 Checking for warehouse positions...");
                
//                 await page.goto(CONFIG.AMAZON_JOBS_URL, { 
//                     waitUntil: "networkidle0",
//                     timeout: 60000 
//                 });

//                 // Wait for the job listings to load using the new selector
//                 await page.waitForSelector('.hvh-careers-emotion-1pll7m0', { 
//                     timeout: 20000 
//                 });

//                 // Scrape jobs with the updated selector
//                 const jobs = await page.evaluate(() => {
//                     const jobElements = document.querySelectorAll('.hvh-careers-emotion-1pll7m0');
//                     return Array.from(jobElements).map(job => {
//                         // Get the job title text
//                         const titleText = job.innerText || job.textContent;
//                         // Get the closest anchor tag that might contain the job link
//                         const linkElement = job.closest('a');
//                         return {
//                             title: titleText?.trim() || "No Title",
//                             link: linkElement?.href || null,
//                             // You might want to add more selectors for location, etc.
//                         };
//                     });
//                 });

//                 console.log(`Found ${jobs.length} total positions`);
                
//                 // Filter for our target jobs
//                 const matchingJobs = jobs.filter(job => isTargetJob(job.title));

//                 if (matchingJobs.length > 0) {
//                     console.log(`✅ Found ${matchingJobs.length} matching positions!`);
//                     matchingJobs.forEach(job => console.log(`Found: ${job.title}`));
                    
//                     for (const job of matchingJobs) {
//                         if (job.link) {
//                             await applyForJob(browser, job);
//                             await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
//                         }
//                     }
//                     return;
//                 }

//                 console.log("❌ No matching positions found. Waiting to retry...");
//                 await new Promise(resolve => setTimeout(resolve, CONFIG.REFRESH_INTERVAL));
                
//             } catch (error) {
//                 console.error("Error during job search:", error.message);
//                 await new Promise(resolve => setTimeout(resolve, 60000));
//             }
//         }
//     } catch (error) {
//         console.error("Fatal error:", error);
//     } finally {
//         if (browser) {
//             await browser.close();
//         }
//     }
// }

// async function applyForJob(browser, job) {
//     console.log(`\n📝 Attempting to apply for: ${job.title}`);
    
//     const page = await browser.newPage();
//     try {
//         await page.goto(job.link, { waitUntil: "networkidle0" });
        
//         // Wait for application form with timeout
//         await page.waitForSelector("form", { timeout: 30000 });
        
//         // Fill out form with random delays
//         const formFills = [
//             { selector: "input[name='firstName']", value: CONFIG.USER_INFO.firstName },
//             { selector: "input[name='lastName']", value: CONFIG.USER_INFO.lastName },
//             { selector: "input[name='email']", value: CONFIG.USER_INFO.email },
//             { selector: "input[name='phoneNumber']", value: CONFIG.USER_INFO.phone }
//         ];

//         for (const field of formFills) {
//             await page.type(field.selector, field.value, { delay: 100 });
//             await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
//         }

//         // Handle resume upload if present
//         const uploadSelector = "input[type='file']";
//         const uploadElement = await page.$(uploadSelector);
//         if (uploadElement) {
//             await uploadElement.uploadFile(CONFIG.USER_INFO.resume);
//             await new Promise(resolve => setTimeout(resolve, 1000));
//         }

//         // Submit application
//         await page.click(".apply-now");
//         await page.waitForNavigation({ waitUntil: "networkidle0" });
        
//         console.log("✅ Application submitted successfully!");
        
//     } catch (error) {
//         console.error(`❌ Failed to apply for ${job.title}:`, error.message);
//     } finally {
//         await page.close();
//     }
// }

// // Start the application
// monitorJobs().catch(console.error);