import {
  FraudDetectorClient,
  GetEventPredictionCommand,
} from "@aws-sdk/client-frauddetector";
import {
  SNSClient,
  PublishCommand,
} from "@aws-sdk/client-sns";
import {
  DynamoDBClient,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";

const fraudClient = new FraudDetectorClient({ region: REGION });
const snsClient = new SNSClient({ region: REGION });
const ddbClient = new DynamoDBClient({ region: REGION });

const HIGH_RISK_SNS_TOPIC_ARN = process.env.HIGH_RISK_SNS_TOPIC_ARN;
const FRAUD_EVENTS_TABLE = process.env.FRAUD_EVENTS_TABLE;

// Debug flag to force SNS publish for testing (set env var FORCE_SNS_PUBLISH = "true")
const FORCE_SNS_PUBLISH = process.env.FORCE_SNS_PUBLISH === "true";

if (!HIGH_RISK_SNS_TOPIC_ARN || !FRAUD_EVENTS_TABLE) {
  console.error(
    "Missing required environment variables: HIGH_RISK_SNS_TOPIC_ARN or FRAUD_EVENTS_TABLE"
  );
  throw new Error("Missing required environment variables");
}

console.log("Loaded ENV VARS → SNS Topic ARN:", HIGH_RISK_SNS_TOPIC_ARN);
console.log("Loaded ENV VARS → DynamoDB Table:", FRAUD_EVENTS_TABLE);

export const handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event));

    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    console.log("Parsed body:", body);

    const requiredFields = ["eventId", "ip_address", "email_address"];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    const { eventId, ip_address, email_address } = body;
    const timestamp = new Date().toISOString();

    // Call Fraud Detector
    const fraudCommand = new GetEventPredictionCommand({
      detectorId: "group3_fraud_detector",
      detectorVersionId: "1",
      eventId,
      eventTypeName: "new_registration",
      eventTimestamp: timestamp,
      entities: [{ entityType: "customer", entityId: eventId }],
      eventVariables: { ip_address, email_address },
    });

    const fraudResponse = await fraudClient.send(fraudCommand);
    console.log("Fraud Detector response:", JSON.stringify(fraudResponse));

    // Extract all outcomes from all ruleResults
    const allOutcomes = [];
    if (fraudResponse.ruleResults && Array.isArray(fraudResponse.ruleResults)) {
      for (const ruleResult of fraudResponse.ruleResults) {
        console.log("Rule result:", JSON.stringify(ruleResult));
        if (ruleResult.outcomes && Array.isArray(ruleResult.outcomes)) {
          allOutcomes.push(...ruleResult.outcomes);
        }
      }
    }

    // Use "No outcome" if no outcomes found
    const outcome = allOutcomes.length > 0 ? allOutcomes[0] : "No outcome";

    console.log("All fraud outcomes (raw):", allOutcomes);

    // Normalize all outcomes: trim, lowercase, remove extra spaces
    const normalizedOutcomes = allOutcomes.map((o) =>
      o.trim().toLowerCase().replace(/\s+/g, "_")
    );
    console.log("Normalized outcomes:", normalizedOutcomes);

    // Define high risk keywords (normalized)
    const highRiskKeywords = [
      "high_risk_customer",
      "high_risk",
      "highrisk",
      "fraudulent",
      "fraud",
      "suspicious",
      "suspected",
      "review",
    ];

    console.log("High risk keywords:", highRiskKeywords);

    // Check if any outcome matches any high risk keyword exactly or included
    const isHighRisk = normalizedOutcomes.some((outcomeStr) =>
      highRiskKeywords.some((keyword) => outcomeStr.includes(keyword))
    );

    console.log("Is high risk from outcomes?:", isHighRisk);

    // If debug flag is set, override isHighRisk to true
    const shouldPublishSNS = FORCE_SNS_PUBLISH || isHighRisk;
    if (shouldPublishSNS) {
      console.log("High risk detected — publishing SNS alert...");

      const message = `⚠️ High Risk Fraud Detected\nEvent ID: ${eventId}\nEmail: ${email_address}\nIP: ${ip_address}\nOutcome(s): ${allOutcomes.join(", ")}`;

      const publishCommand = new PublishCommand({
        TopicArn: HIGH_RISK_SNS_TOPIC_ARN,
        Subject: "🚨 Fraud Detection Alert - High Risk",
        Message: message,
      });

      try {
        const snsResponse = await snsClient.send(publishCommand);
        console.log("SNS publish success:", snsResponse.MessageId || snsResponse);
      } catch (snsErr) {
        console.error("SNS publish failed:", snsErr);
      }
    } else {
      console.log("Outcome not high risk — no SNS publish.");
    }

    // Log event and outcome to DynamoDB
    const putCommand = new PutItemCommand({
      TableName: FRAUD_EVENTS_TABLE,
      Item: {
        eventId: { S: eventId },
        ip_address: { S: ip_address },
        email_address: { S: email_address },
        outcome: { S: outcome },
        timestamp: { S: timestamp },
      },
    });

    await ddbClient.send(putCommand);
    console.log("DynamoDB log entry created successfully");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Fraud check completed.",
        outcome,
        details: fraudResponse,
      }),
    };
  } catch (err) {
    console.error("Error during Lambda execution:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error during prediction",
        error: err.message,
      }),
    };
  }
};


