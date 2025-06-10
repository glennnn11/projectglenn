# 🛡️ Ecommerce Fraud Detection System (2024)

## 📌 Project Background

In 2024, global e-commerce fraud is projected to exceed **$1.2 trillion USD** in losses. To address this growing issue, our team developed a real-time fraud detection system using AWS serverless architecture and **Amazon Fraud Detector**. This system identifies suspicious user signups and triggers alerts to prevent potential fraud.

---

## 👥 Team Contributions

Our team of five collaborated on different components of the project:

- **Fraud Detector Model** – Built and trained using Amazon Fraud Detector *(2 teammates)*
- **Frontend Web App** – Interface for user signups and interaction *(1 teammate)*
- **Amazon Lex Bot** – Chatbot for fraud-related inquiries *(1 teammate)*
- **Backend (Glenn & Chris)** – Implemented and deployed the backend:
  - Amazon API Gateway
  - AWS Lambda
  - Amazon SNS
  - Amazon DynamoDB
  - Integration with Amazon Fraud Detector

---

## 🏗️ System Architecture

1. User submits registration details via the frontend.
2. The frontend sends a `POST` request to **Amazon API Gateway**.
3. API Gateway invokes an **AWS Lambda** function.
4. Lambda:
   - Evaluates fraud risk using **Amazon Fraud Detector**
   - Logs the result in **Amazon DynamoDB**
   - Sends a notification via **Amazon SNS** if the user is classified as `high_risk_customer`

---

## 🚀 Backend Setup Instructions

### ✅ Prerequisites

- AWS CLI configured (`aws configure`)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- Docker installed
- Node.js 18+

### 🛠️ Deployment Steps

```bash
# Clone the repository
git clone https://github.com/<your-repo>/ecommerce-fraud-app.git
cd ecommerce-fraud-app

# Build the application
sam build

# Deploy the backend
sam deploy --guided
After deployment, the CLI will output your API Gateway endpoint URL.

🧪 Sample API Request
bash
Copy
Edit
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/Prod/predict \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "signup-test-001",
    "ip_address": "1.2.3.4",
    "email_address": "test@example.com"
  }'
🔍 How Each AWS Component Works
📡 Amazon API Gateway
Exposes RESTful endpoints to the frontend

Routes HTTP POST requests to the backend Lambda function

⚙️ AWS Lambda
Processes incoming user data

Calls Amazon Fraud Detector for real-time risk evaluation

Writes results to DynamoDB

Publishes an SNS message for high_risk_customer cases

📬 Amazon SNS
Sends email alerts when a high-risk customer is detected

Can be extended to support SMS or chat alerts

💾 Amazon DynamoDB
Logs all fraud evaluations

Enables future querying and analysis

🧠 Amazon Fraud Detector
Predicts fraud risk based on IP and email

Returns outcomes like low_risk_customer, medium_risk_customer, or high_risk_customer

🧰 Tech Stack Overview
Component	Technology
Frontend	HTML/CSS/JavaScript
API Layer	Amazon API Gateway
Backend Logic	AWS Lambda (Node.js)
ML Detection	Amazon Fraud Detector
Database	Amazon DynamoDB
Notifications	Amazon SNS
Chatbot	Amazon Lex
Deployment Tool	AWS SAM

🔭 Future Enhancements
Add CloudWatch Dashboards to monitor fraud trends and API activity

Integrate user authentication and JWT for secured API access

Train Fraud Detector with more detailed real-case datasets

Extend detection to transaction-level fraud

Display fraud score/risk level in frontend UI

Use S3 for long-term log storage and compliance
