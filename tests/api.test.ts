import dotenv from "dotenv";
import {
  createMeasurement,
  pollMeasurementResult,
  PingOptions,
  MeasurementResult,
} from "../src/globalping/api.js";

// Load environment variables (e.g., for API_KEY if needed)
dotenv.config();

// Retrieve API key from environment variable, if set
// Note: Many Globalping tests can be run without an API key
const apiKey = process.env.GLOBALPING_API_KEY;

async function runTest() {
  console.log("Starting Globalping API client test...");

  const testMeasurement: PingOptions = {
    type: "ping",
    target: "google.com",
    limit: 1, // Use a small limit for faster testing
    locations: [{ country: "US" }], // Optional: specify a location
  };

  try {
    console.log(
      `Attempting to create measurement: ${JSON.stringify(testMeasurement)}`
    );
    const measurementId = await createMeasurement(testMeasurement, apiKey);
    console.log(`Measurement created with ID: ${measurementId}`);

    console.log(`Polling for result of measurement ${measurementId}...`);
    const result: MeasurementResult = await pollMeasurementResult(
      measurementId,
      apiKey,
      60000, // Set a shorter timeout for testing (e.g., 60 seconds)
      3000 // Poll every 3 seconds
    );

    console.log("--------------------");
    console.log("Measurement Result:");
    console.log("Status:", result.status);
    console.log("Target:", result.target);
    console.log("Type:", result.type);
    console.log("Probes Count:", result.probesCount);
    if (result.results && result.results.length > 0) {
        console.log("First Probe Location:", result.results[0].probe.city, result.results[0].probe.country);
        console.log("First Probe Output (raw):", result.results[0].result.rawOutput);
    } else {
        console.log("No results received from probes.");
    }
    console.log("--------------------");
    console.log("Test finished successfully!");

  } catch (error) {
    console.error("--------------------");
    console.error("Test failed:", error);
    console.error("--------------------");
    process.exitCode = 1; // Indicate failure
  }
}

runTest();
