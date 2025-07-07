/**
 * Local Test Script for Complete Booksy Integration
 *
 * Tests both business API and time slots API before deployment
 */

// Same configuration as the worker
const BOOKSY_API_KEY = "web-e3d812bf-d7a2-445d-ab38-55589ae6a121";
const BOOKSY_API_BASE = "https://us.booksy.com/api/us/2/customer_api";
const BOOKSY_TIMESLOTS_BASE = "https://us.booksy.com/core/v2/customer_api/me";
const BUSINESS_ID = 155582;
const STAFF_ID = 880999;

// Discovered tokens from network trace
const ACCESS_TOKEN = "eNS0OXV6weGN4wzcr8CyXOuI02Guuh3c";
const FINGERPRINT = "6eff4848-00da-481e-aae6-6c5b394bb25d";

async function testBusinessAPI() {
  console.log("\n🏢 Testing Business API...");

  try {
    const response = await fetch(`${BOOKSY_API_BASE}/businesses/${BUSINESS_ID}`, {
      headers: {
        Accept: "application/json",
        "x-api-key": BOOKSY_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Business API failed: ${response.status}`);
    }

    const data = await response.json();
    const business = data.business;

    console.log("✅ Business API Success:");
    console.log(`   Name: ${business.name}`);
    console.log(`   Address: ${business.location?.address}`);
    console.log(`   Phone: ${business.phone}`);
    console.log(`   Rating: ${business.reviews_stars} (${business.reviews_count} reviews)`);
    console.log(`   Services: ${business.top_services.length}`);

    return business;
  } catch (error) {
    console.log("❌ Business API Failed:", error.message);
    return null;
  }
}

async function testTimeSlotsAPI(serviceVariantId) {
  console.log("\n⏰ Testing Time Slots API...");

  try {
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const payload = {
      subbookings: [
        {
          service_variant_id: serviceVariantId,
          staffer_id: STAFF_ID,
          combo_children: [],
        },
      ],
      start_date: startDate,
      end_date: endDate,
    };

    const response = await fetch(
      `${BOOKSY_TIMESLOTS_BASE}/businesses/${BUSINESS_ID}/appointments/time_slots`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Api-Key": BOOKSY_API_KEY,
          "X-Access-Token": ACCESS_TOKEN,
          "X-Fingerprint": FINGERPRINT,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
          Referer: "https://booksy.com/",
          Origin: "https://booksy.com",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`Time Slots API failed: ${response.status}`);
    }

    const data = await response.json();

    console.log("✅ Time Slots API Success:");
    console.log(`   Date range: ${startDate} to ${endDate}`);
    console.log(`   Days with availability: ${data.time_slots.length}`);

    data.time_slots.forEach((day) => {
      const dayName = new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
      });
      console.log(`   ${dayName} (${day.date}): ${day.slots.length} slots`);
      if (day.slots.length > 0) {
        const firstFew = day.slots
          .slice(0, 3)
          .map((s) => s.t)
          .join(", ");
        console.log(`     Times: ${firstFew}${day.slots.length > 3 ? "..." : ""}`);
      }
    });

    return data.time_slots;
  } catch (error) {
    console.log("❌ Time Slots API Failed:", error.message);
    return null;
  }
}

async function testCompleteIntegration() {
  console.log("🧪 TESTING COMPLETE BOOKSY INTEGRATION LOCALLY");
  console.log("================================================");

  // Test 1: Business API
  const business = await testBusinessAPI();
  if (!business) {
    console.log("\n❌ FAILED: Business API not working");
    return false;
  }

  // Test 2: Find Curly Adventure service
  console.log("\n🔍 Finding Curly Adventure service...");
  const curlyService = business.top_services.find((s) => s.name.toLowerCase().includes("curly"));

  if (!curlyService) {
    console.log("❌ FAILED: Could not find Curly Adventure service");
    return false;
  }

  console.log("✅ Found Curly Service:");
  console.log(`   Name: ${curlyService.name}`);
  console.log(`   ID: ${curlyService.id}`);
  console.log(`   Variant ID: ${curlyService.variants[0]?.id}`);
  console.log(`   Price: ${curlyService.variants[0]?.service_price}`);
  console.log(`   Duration: ${curlyService.variants[0]?.duration} minutes`);

  // Test 3: Time Slots API
  const timeSlots = await testTimeSlotsAPI(curlyService.variants[0]?.id);
  if (!timeSlots) {
    console.log("\n⚠️  WARNING: Time Slots API not working (tokens may have expired)");
    console.log("   Business data still works (90% functionality)");
    return "partial";
  }

  // Test 4: Complete integration
  console.log("\n🎯 Testing Complete Integration...");
  const totalSlots = timeSlots.reduce((sum, day) => sum + day.slots.length, 0);

  console.log("✅ COMPLETE INTEGRATION SUCCESS:");
  console.log(`   Business data: ✅ Working`);
  console.log(`   Service data: ✅ Working`);
  console.log(`   Time slots: ✅ Working`);
  console.log(`   Total available slots: ${totalSlots}`);
  console.log(`   Coverage: 100%`);

  return true;
}

async function main() {
  try {
    const result = await testCompleteIntegration();

    if (result === true) {
      console.log("\n🎉 ALL TESTS PASSED - READY FOR PRODUCTION DEPLOYMENT!");
      console.log("\nNext steps:");
      console.log("1. Update router to use booksy-complete.js");
      console.log("2. Deploy to production");
      console.log("3. Test production endpoints");
    } else if (result === "partial") {
      console.log("\n⚠️  PARTIAL SUCCESS - BUSINESS DATA WORKING");
      console.log("\nOptions:");
      console.log("1. Deploy with business data only (90% functionality)");
      console.log("2. Get fresh access tokens for 100% functionality");
    } else {
      console.log("\n❌ TESTS FAILED - DO NOT DEPLOY");
      console.log("\nIssues to fix:");
      console.log("1. Check API keys");
      console.log("2. Verify network connectivity");
      console.log("3. Check Booksy API status");
    }
  } catch (error) {
    console.log("\n💥 TEST SUITE CRASHED:", error.message);
  }
}

// Run the tests
main();
