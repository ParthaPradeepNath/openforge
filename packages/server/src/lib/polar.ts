import { PolarClientError } from "@polar-sh/sdk";
import { createPolar } from "@polar-sh/sdk/2026-10";

type PolarServer = "sandbox" | "production";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}

// Functions to validate environment variables
export function getPolarAccessToken(): string {
  return getRequiredEnv("POLAR_ACCESS_TOKEN");
}

export function getPolarProductId(): string {
  return getRequiredEnv("POLAR_PRODUCT_ID");
}

export function getPolarCreditsMeterId(): string {
  return getRequiredEnv("POLAR_CREDITS_METER_ID");
}

// Determine which Polar environment to use
export function getPolarServer(): PolarServer {
  const server = process.env.POLAR_SERVER;

  if (!server) {
    return "sandbox";
  }

  if (server !== "sandbox" && server !== "production") {
    throw new Error("POLAR_SERVER must be either 'sandbox' or 'production'");
  }

  return server;
}

// Initialize the Polar client
const polar = createPolar({
  accessToken: getPolarAccessToken(),
  environment: getPolarServer(),
});

type CreateCheckoutUrlParams = {
  customerExternalId: string;
  requestUrl: string;
};

// Create a Polar checkout URL
export async function createCheckoutUrl({
  customerExternalId,
  requestUrl,
}: CreateCheckoutUrlParams): Promise<string> {
  const result = await polar.checkouts.create({
    products: [getPolarProductId()],
    success_url: new URL("/billing/success", requestUrl).toString(),
    external_customer_id: customerExternalId,
    metadata: {
      source: "openforge-cli",
    },
  });

  return result.url;
}

// Create a customer portal URL
export async function createCustomerPortalUrl({
  customerExternalId,
  requestUrl,
}: CreateCheckoutUrlParams): Promise<string> {
  const result = await polar.customerSessions.create({
    external_customer_id: customerExternalId,
    return_url: new URL("/billing/success", requestUrl).toString(),
  });

  return result.customer_portal_url;
}

export async function getAvailableCreditsBalance(customerExternalId: string) {
  try {
    const customerState =
      await polar.customers.getStateExternal(customerExternalId);

    const matchingMeters = customerState.active_meters.filter(
      (meter) => meter.meter_id === getPolarCreditsMeterId()
    );

    if (matchingMeters.length > 1) {
      throw new Error("Expected exactly one matching Polar credits meter");
    }

    const creditsMeter = matchingMeters[0];
    return creditsMeter?.balance ?? 0;
  } catch (error) {
    if (error instanceof PolarClientError && error.statusCode === 404) {
      return 0;
    }

    throw error;
  }
}

type IngestAiUsageParams = {
  externalCustomerId: string;
  eventId: string;
  credits: number;
};

export async function ingestAiUsage({
  externalCustomerId,
  eventId,
  credits,
}: IngestAiUsageParams) {
  if (credits <= 0) {
    return;
  }

  await polar.events.ingest({
    events: [
      {
        name: "openforge-usage",
        external_id: eventId,
        external_customer_id: externalCustomerId,
        metadata: { credits },
      },
    ],
  });
}
