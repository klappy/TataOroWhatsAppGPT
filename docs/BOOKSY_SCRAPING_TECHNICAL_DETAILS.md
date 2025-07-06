# Booksy Scraping Technical Details

## 🎯 Key Discoveries & HTML Patterns

### Modal & Iframe Structure

```html
<!-- Booking Modal -->
<div class="modal -widget -booking-widget -clean">
  <div class="modal__content">
    <div class="modal__body">
      <iframe
        data-testid="booking-widget"
        src="https://booksy.com/widget-2021/marketplace/index.html?..."
      >
      </iframe>
    </div>
  </div>
</div>
```

### Calendar Date Selection (CRITICAL)

```html
<!-- Calendar Swiper - Shows Available Days -->
<div class="swiper-container" data-testid="calendar-weekdays-swiper">
  <div class="swiper-wrapper">
    <!-- SELECTED DATE HAS THESE ATTRIBUTES -->
    <div
      class="swiper-slide swiper-slide-active"
      data-swiper-slide-index="1"
      data-selected="true"
      data-date="2025-07-07"
      <!--
      YYYY-MM-DD
      format
      --
    >
      data-month="July" data-year="2025">
      <span data-testid="calendar-swiper-slide-span">
        <a data-testid="weekday-button-07-07" class="active markerGreen chip">
          <div class="text-h5">Mon</div>
          <!-- Day of week -->
          <div data-testid="calendar-weekdays-swiper-slide-label">7</div>
          <!-- Day number -->
        </a>
      </span>
    </div>
  </div>
</div>
```

**SELECTORS FOR SELECTED DATE:**

- `.swiper-slide[data-selected="true"].active`
- `.swiper-slide.swiper-slide-active[data-selected="true"]`

**ATTRIBUTES TO EXTRACT:**

- `data-date`: YYYY-MM-DD format (e.g., "2025-07-07")
- `data-month`: Full month name (e.g., "July")
- `data-year`: Year (e.g., "2025")

### Time Slot Structure

```html
<!-- Time Slots Carousel -->
<div class="swiper-wrapper">
  <div class="swiper-slide">
    <a data-testid="time-slot-12-30-button">12:30 PM</a>
    <a data-testid="time-slot-12-45-button">12:45 PM</a>
    <a data-testid="time-slot-13-00-button">1:00 PM</a>
    <!-- etc... -->
  </div>
</div>
```

**SELECTORS FOR TIME SLOTS:**

- `a[data-testid^="time-slot-"]` (PROVEN WORKING)
- `.swiper-slide a` (backup)

### Service Book Button Structure

```html
<!-- Service with Book Button -->
<div>
  <h4 data-testid="service-name">Curly Adventure (Regular client)</h4>
  <!-- ... price/duration info ... -->
  <button data-testid="service-button">Book</button>
</div>
```

**SELECTOR FOR BOOK BUTTON:**

```javascript
page
  .locator('h4[data-testid="service-name"]')
  .filter({ hasText: serviceName })
  .locator("xpath=..")
  .locator("xpath=..")
  .locator('button[data-testid="service-button"]');
```

## 🐛 Common Bugs & Fixes

### Date Parsing Bug (CRITICAL!)

**WRONG:** Using `new Date("2025-07-07").toLocaleDateString()` - gives wrong day due to timezone issues
**RIGHT:** Extract day of week directly from HTML: `<div class="text-h5">Mon</div>`
**SOLUTION:** Use dayMap to convert "Mon" → "Monday", extract day number from `data-date` split

### Iframe Detection Hanging

**PROBLEM:** Complex modal detection loops cause timeouts
**SOLUTION:** Wait directly for `iframe[data-testid="booking-widget"]`

### Variable Scope Issues

**PROBLEM:** Variables defined inside try blocks aren't accessible in return statements
**SOLUTION:** Define variables outside try blocks

## 🔄 Proven Working Flow

1. **Navigate** to Booksy URL
2. **Wait** 3 seconds for page stabilization
3. **Find & Click** service Book button using data-testid selectors
4. **Wait** 5 seconds for booking interface to load
5. **Detect iframe** using `iframe[data-testid="booking-widget"]`
6. **Access iframe content** via `contentFrame()`
7. **Extract selected date** from calendar swiper active slide
8. **Extract time slots** using `a[data-testid^="time-slot-"]`

## 📝 Testing Commands

**Local Test:**

```bash
node test-booksy-local.js
```

**Production Test:**

```bash
curl -s "https://wa.tataoro.com/booksy/appointments?service=Curly%20Adventure%20(Regular%20client)" | jq '.'
```

**Debug Production:**

```bash
curl -s "https://wa.tataoro.com/booksy/debug-appointments?service=Curly%20Adventure%20(Regular%20client)" | jq '.steps.calendarState'
```

## 🚨 DO NOT FORGET AGAIN

- **Date Format**: `data-date="2025-07-07"` is July 7th, not July 6th!
- **Selected Date**: Look for `data-selected="true"` AND `class="active"`
- **Time Slots**: Use `a[data-testid^="time-slot-"]` - it works!
- **Iframe**: Direct selector `iframe[data-testid="booking-widget"]`
- **Variable Scope**: Define outside try blocks!

## 🎯 Success Indicators

- **17 time slots extracted** (12:30 PM to 4:30 PM)
- **Correct date** (Monday, July 7 not Sunday, July 6)
- **Iframe access** successful
- **No variable scope errors**
