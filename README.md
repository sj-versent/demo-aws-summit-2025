# Bedrock Nova Canvas Image Generator

This is a Streamlit application that lets you generate images using the Amazon Bedrock Nova Canvas model based on your text prompts.

## Features
- Enter a prompt and generate an image using AWS Bedrock's Nova Canvas model
- Images are displayed directly in the app
- Credentials are loaded securely from a `.env` file

## Prerequisites
- Python 3.9+
- An AWS account with access to Bedrock and the Nova Canvas model

## Setup

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd bedrock-image-generator
```

2. **Create and configure your `.env` file**

Copy the example below into a file named `.env` in the project root:

```
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
```

3. **Create and activate a Python virtual environment (recommended)**

```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
```

4. **Install dependencies**

```bash
pip install -r requirements.txt
```

## Running the App

```bash
streamlit run streamlit_app.py
```

The app will open in your browser. Enter your prompt and click "Generate Image".

## Notes
- Make sure your AWS credentials have permission to use Bedrock and the Nova Canvas model.
- The Nova Canvas API parameters and response format may change; update the code as needed for your use case.

## Troubleshooting
- If you see errors about credentials or permissions, double-check your `.env` file and AWS account access.
- If the image does not display, check the app logs for error messages.

## License
MIT 