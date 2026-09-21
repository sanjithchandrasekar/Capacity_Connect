const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  try {
    await page.goto('http://localhost:5173/trainee/courses/037420d5-7e4e-48fc-96b7-16b881fbd35a', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (err) {
    console.error('FAILED TO LOAD:', err);
  }
  
  await browser.close();
})();
