import { FraudDetectorClient, GetEventPredictionCommand } from "@aws-sdk/client-frauddetector";

export const lambdaHandler = async (event) => {
  try {
    const client = new FraudDetectorClient({ region: "us-east-1" });

    const command = new GetEventPredictionCommand({
      detectorId: "group3_fraud_detector",
      detectorVersionId: "1",
      eventId: event.eventId || "defaultEventId",
      eventTypeName: "group3_fraud_detector", // match your event type name exactly
      eventTimestamp: new Date().toISOString(),
      entities: [
        {
          entityType: "customer",
          entityId: event.eventId || "defaultCustomerId",
        },
      ],
      eventVariables: {
        ip_address: event.ip_address || "0.0.0.0",
        email_address: event.email_address || "default@example.com",
      },
    });

    const response = await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Prediction complete",
        outcome: response.ruleResults?.[0]?.outcomes?.[0] || "No outcome",
        ruleResults: response.ruleResults || [],
      }),
    };
  } catch (err) {
    console.error("Prediction error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error during prediction",
        error: err.message,
      }),
    };
  }
};