import streamlit as st
import boto3
import base64
import os
import json
import random
from dotenv import load_dotenv
import time

# --- Versent Branding and Custom CSS ---
st.logo('assets/V-mark-Green.png', size='large')

st.markdown("""
    <style>
    /* Header */
    .main > div:first-child {background: #00E600;}
    .versent-header {
        background: #00E600;
        color: #fff;
        padding: 1.5rem 1rem 1rem 1rem;
        border-radius: 0 0 12px 12px;
        margin-bottom: 2rem;
        text-align: left;
    }
    .versent-header img {
        height: 40px;
        vertical-align: middle;
        margin-right: 1rem;
    }
    .versent-title {
        font-size: 2.2rem;
        font-weight: 700;
        display: inline-block;
        vertical-align: middle;
    }
    .versent-subtitle {
        font-size: 1.1rem;
        color: #fff;
        margin-top: 0.2rem;
        margin-bottom: 0.5rem;
    }
    /* Button */
    .stButton > button {
        background-color: #00E600;
        color: #232F3E;
        font-weight: bold;
        border-radius: 8px;
        border: none;
        padding: 0.7em 2em;
        font-size: 1.1em;
    }
    /* Text area */
    .stTextArea textarea {
        border-radius: 8px;
        border: 1px solid #00E600;
        padding: 0.5em;
        font-size: 1.1em;
    }
    </style>
""", unsafe_allow_html=True)

st.markdown(f"""
<div class="versent-header">
    <span class="versent-title">Bedrock Nova Canvas Image Generator</span>
    <div class="versent-subtitle">Powered by AWS Bedrock & Nova Canvas | Inspired by AWS Summit Sydney</div>
</div>
""", unsafe_allow_html=True)

# --- End AWS Branding ---

# Load environment variables from .env file
load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_SESSION_TOKEN = os.getenv('AWS_SESSION_TOKEN')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

# Prepare boto3 client arguments
boto3_args = {
    'service_name': 'bedrock-runtime',
    'region_name': AWS_REGION,
    'aws_access_key_id': AWS_ACCESS_KEY_ID,
    'aws_secret_access_key': AWS_SECRET_ACCESS_KEY
}
if AWS_SESSION_TOKEN:
    boto3_args['aws_session_token'] = AWS_SESSION_TOKEN

# Initialize Bedrock client
bedrock = boto3.client(**boto3_args)

# --- Metrics Setup ---
COST_PER_IMAGE = 0.01  # USD, adjust as needed
if 'total_cost' not in st.session_state:
    st.session_state.total_cost = 0.0
if 'latencies' not in st.session_state:
    st.session_state.latencies = []

# --- Metrics Display ---
col1, col2, col3 = st.columns(3)
col1.metric("Cost per Image", f"${COST_PER_IMAGE:.2f}")
col2.metric("Total Cost", f"${st.session_state.total_cost:.2f}")
if st.session_state.latencies:
    avg_latency = sum(st.session_state.latencies) / len(st.session_state.latencies)
    col3.metric("Avg Latency (s)", f"{avg_latency:.2f}")
else:
    col3.metric("Avg Latency (s)", "-")

def generate_image(prompt):
    try:
        seed = random.randint(0, 858993460)
        body = json.dumps({
            "taskType": "TEXT_IMAGE",
            "textToImageParams": {"text": prompt},
            "imageGenerationConfig": {
                "seed": seed,
                "quality": "standard",
                "height": 1024,
                "width": 1024,
                "numberOfImages": 1
            }
        })
        response = bedrock.invoke_model(
            modelId='amazon.nova-canvas-v1:0',
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        response_body = json.loads(response['body'].read())
        image_data = response_body['images'][0]
        return image_data, None
    except Exception as e:
        return None, str(e)

# --- Saved Prompts ---
saved_prompts = [
    "A futuristic city skyline at sunset",
    "A koala sitting in a eucalyptus tree, watercolor style",
    "A cyberpunk kangaroo in Sydney",
    "Outback landscape with dramatic clouds, photorealistic",
    "Abstract art inspired by the Australian bush"
]

if 'gallery' not in st.session_state:
    st.session_state.gallery = []
if 'prompt' not in st.session_state:
    st.session_state.prompt = ''

with st.sidebar:
    st.header('🎨 Saved Prompts')
    for i, p in enumerate(saved_prompts):
        if st.button(p, key=f'saved_prompt_{i}'):
            st.session_state.prompt = p
    st.markdown('---')
    st.header('🖼️ Image Gallery')
    if st.session_state.gallery:
        for img_b64 in st.session_state.gallery[::-1]:
            st.image(base64.b64decode(img_b64), use_container_width=True)
    else:
        st.caption('No images generated yet.')

st.title('')  # Hide default Streamlit title
prompt = st.text_area('Enter your image prompt:', value=st.session_state.prompt, key='main_prompt')
if st.button('Generate Image'):
    if not prompt.strip():
        st.warning('Please enter a prompt.')
    else:
        with st.spinner('Generating image...'):
            start_time = time.time()
            image_data, error = generate_image(prompt)
            latency = time.time() - start_time
            if error:
                st.error(f'Error: {error}')
            elif image_data:
                st.session_state.gallery.append(image_data)
                st.session_state.total_cost += COST_PER_IMAGE
                st.session_state.latencies.append(latency)
                st.image(base64.b64decode(image_data), caption='Generated by Nova Canvas', use_container_width=True)
            else:
                st.error('No image returned. Please try again.') 