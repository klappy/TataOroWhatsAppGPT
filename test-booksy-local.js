#!/usr/bin/env node

/**
 * Local test script for Booksy appointment scraping
 * Run with: node test-booksy-local.js
 * 
 * This uses the same scraping logic as production but with:
 * - Visible browser window
 * - Detailed logging
 * - Slower execution to observe behavior
 */

import { chromium } from 'playwright';

const BOOKSY_URL = "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999";

class BooksyScraper {
  constructor(page, options = {}) {
    this.page = page;
    this.debug = options.debug || false;
  }

  log(...args) {
    if (this.debug) {
      console.log(`[${new Date().toISOString()}]`, ...args);
    }
  }

  async getAvailableSlots(serviceName) {
    this.log(`🚀 Starting appointment detection for: ${serviceName}`);
    
    try {
      // Navigate to Booksy page
      this.log('📍 Navigating to Booksy URL...');
      await this.page.goto(BOOKSY_URL, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Wait for initial load
      this.log('⏳ Waiting for page to stabilize...');
      await this.page.waitForTimeout(3000);
      
      // Take screenshot of initial state
      await this.page.screenshot({ path: 'booksy-1-initial.png' });
      this.log('📸 Screenshot saved: booksy-1-initial.png');
      
      // Try to find and click the service
      this.log(`🔍 Looking for service: ${serviceName}`);
      
      // Strategy 1: Click on Book button near the service name
      const bookClicked = await this.clickBookButton(serviceName);
      
      if (!bookClicked) {
        this.log('❌ Could not find Book button for service');
        return { error: 'Service not found', serviceName };
      }
      
      // Wait for calendar/modal to appear
      this.log('📅 Waiting for calendar to load...');
      await this.page.waitForTimeout(3000);
      
      // Take screenshot after clicking Book
      await this.page.screenshot({ path: 'booksy-2-after-book.png' });
      this.log('📸 Screenshot saved: booksy-2-after-book.png');
      
      // Check if we need to select the service first
      const serviceSelected = await this.selectServiceIfNeeded(serviceName);
      
      if (serviceSelected) {
        await this.page.waitForTimeout(2000);
        await this.page.screenshot({ path: 'booksy-3-service-selected.png' });
        this.log('📸 Screenshot saved: booksy-3-service-selected.png');
      }
      
      // Now extract available slots
      const slots = await this.extractAvailableSlots();
      
      this.log(`✅ Found ${slots.length} available slots`);
      
      return {
        serviceName,
        slots,
        totalSlots: slots.length,
        scrapedAt: new Date().toISOString()
      };
      
    } catch (error) {
      this.log('❌ Error during scraping:', error.message);
      await this.page.screenshot({ path: 'booksy-error.png' });
      return {
        error: error.message,
        serviceName,
        screenshot: 'booksy-error.png'
      };
    }
  }
  
  async clickBookButton(serviceName) {
    try {
      // Find all potential book buttons
      const buttons = await this.page.$$('button, a, div[role="button"]');
      
      for (const button of buttons) {
        const text = await button.textContent();
        
        // Look for Book button associated with our service
        if (text && text.includes('Book')) {
          // Check if this button is near our service name
          const nearService = await button.evaluate((el, service) => {
            // Look in parent elements for the service name
            let parent = el.parentElement;
            let depth = 0;
            while (parent && depth < 5) {
              if (parent.textContent.includes(service)) {
                return true;
              }
              parent = parent.parentElement;
              depth++;
            }
            return false;
          }, serviceName);
          
          if (nearService) {
            this.log(`🎯 Found Book button for ${serviceName}: "${text.trim()}"`);
            await button.click();
            return true;
          }
        }
      }
      
      // Fallback: Just click any Book button
      this.log('⚠️ Could not find service-specific Book button, trying generic...');
      const genericBook = await this.page.$('button:has-text("Book")');
      if (genericBook) {
        await genericBook.click();
        return true;
      }
      
      return false;
    } catch (error) {
      this.log('❌ Error clicking book button:', error.message);
      return false;
    }
  }
  
  async selectServiceIfNeeded(serviceName) {
    try {
      // Check if we're in a service selection modal
      const serviceOptions = await this.page.$$('[class*="service"], [data-testid*="service"]');
      
      if (serviceOptions.length > 0) {
        this.log(`📋 Found ${serviceOptions.length} service options`);
        
        for (const option of serviceOptions) {
          const text = await option.textContent();
          if (text && text.includes(serviceName)) {
            this.log(`✅ Selecting service: ${text.trim()}`);
            await option.click();
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      this.log('⚠️ No service selection needed or error:', error.message);
      return false;
    }
  }
  
  async extractAvailableSlots() {
    const slots = [];
    
    try {
      // Wait for calendar to be visible
      const calendarVisible = await this.page.waitForSelector('.b-datepicker, [class*="calendar"], [class*="date-picker"]', {
        timeout: 5000,
        state: 'visible'
      }).catch(() => null);
      
      if (!calendarVisible) {
        this.log('❌ No calendar found');
        return slots;
      }
      
      this.log('📅 Calendar detected, extracting available days...');
      
      // Get all available days
      const availableDays = await this.page.$$('.b-datepicker-day:not(.b-datepicker-day-disabled), [class*="day"]:not([class*="disabled"])');
      
      this.log(`📅 Found ${availableDays.length} available days`);
      
      // For each available day
      for (let i = 0; i < Math.min(availableDays.length, 7); i++) {
        const day = availableDays[i];
        
        // Get day info
        const dayText = await day.textContent();
        const dayLabel = await day.getAttribute('aria-label') || dayText;
        
        this.log(`📅 Checking day: ${dayLabel}`);
        
        // Click the day
        await day.click();
        await this.page.waitForTimeout(1000);
        
        // Look for time period tabs
        const periods = ['Morning', 'Afternoon', 'Evening'];
        
        for (const period of periods) {
          const periodTab = await this.page.$(`button:has-text("${period}")`);
          
          if (periodTab) {
            this.log(`🕐 Clicking ${period} tab...`);
            await periodTab.click();
            await this.page.waitForTimeout(800);
          }
          
          // Extract time slots
          const timeButtons = await this.page.$$('button');
          
          for (const btn of timeButtons) {
            const text = await btn.textContent();
            
            // Check if this looks like a time
            if (text && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(text)) {
              const timeSlot = text.trim();
              
              // Check if button is enabled
              const isDisabled = await btn.evaluate(el => 
                el.disabled || 
                el.classList.contains('disabled') || 
                el.getAttribute('aria-disabled') === 'true'
              );
              
              if (!isDisabled) {
                slots.push({
                  date: dayLabel,
                  time: timeSlot,
                  period: periodTab ? period : 'All Day'
                });
                this.log(`✅ Found available slot: ${dayLabel} at ${timeSlot} (${period})`);
              }
            }
          }
        }
        
        // If no period tabs, just look for time buttons directly
        if (!slots.some(s => s.date === dayLabel)) {
          const allTimeButtons = await this.page.$$('button');
          
          for (const btn of allTimeButtons) {
            const text = await btn.textContent();
            
            if (text && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(text)) {
              const isDisabled = await btn.evaluate(el => 
                el.disabled || 
                el.classList.contains('disabled')
              );
              
              if (!isDisabled) {
                slots.push({
                  date: dayLabel,
                  time: text.trim(),
                  period: 'All Day'
                });
                this.log(`✅ Found available slot: ${dayLabel} at ${text.trim()}`);
              }
            }
          }
        }
      }
      
    } catch (error) {
      this.log('❌ Error extracting slots:', error.message);
    }
    
    return slots;
  }
}

// Main test function
async function runTest() {
  console.log('🚀 Starting Booksy scraper test...\n');
  
  const browser = await chromium.launch({
    headless: false, // See what's happening
    slowMo: 500, // Slow down actions to observe
    devtools: true // Open devtools
  });
  
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Create scraper instance
  const scraper = new BooksyScraper(page, { debug: true });
  
  // Test the scraper
  const serviceName = "Curly Adventure (Regular client)";
  console.log(`\n🔍 Testing service: ${serviceName}\n`);
  
  const result = await scraper.getAvailableSlots(serviceName);
  
  console.log('\n📊 RESULTS:');
  console.log(JSON.stringify(result, null, 2));
  
  // Keep browser open for inspection
  console.log('\n⏸️  Browser will stay open for 30 seconds for inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('\n✅ Test complete!');
}

// Run the test
runTest().catch(console.error);
