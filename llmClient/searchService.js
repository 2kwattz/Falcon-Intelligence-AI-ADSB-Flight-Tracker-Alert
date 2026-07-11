const puppeteer = require("puppeteer"); // Browser Automation
const { search } = require("duck-duck-scrape"); // Duck Duck Go Scraper

// Constants

const GOOGLE_SEARCH_QUERY = `https://www.google.com/search?q=`

const searchGoogle = async (query) => {

    // Launching browser instance
    const browser = await puppeteer.launch({
        timeout: 3000,
        headless: true,
        defaultViewport: null
    })
    
    try{
        // Creating new page
        const page = await browser.newPage();
        await page.goto(
            `${GOOGLE_SEARCH_QUERY}${encodeURIComponent(query)}`
        )}
    catch(error){
        console.error("[*] Error in performing automated google search ",error?.message || error)
    }
    finally {
        await browser.close();
    }
}

const searchDuckDuckGo = async (query) => {

    const results = await search(query);
    return results;
}

module.exports = {
    searchGoogle,
    searchDuckDuckGo
}