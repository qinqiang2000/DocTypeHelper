import base64
from mimetypes import guess_type

import requests
from dotenv import load_dotenv
import os

load_dotenv(override=True)


# Function to encode the image
def encode_image(image_path):
  with open(image_path, "rb") as image_file:
    return base64.b64encode(image_file.read()).decode('utf-8')


# Function to encode a local image into data URL
def local_image_to_data_url(image_path):
    # Guess the MIME type of the image based on the file extension
    mime_type, _ = guess_type(image_path)
    if mime_type is None:
        mime_type = 'application/octet-stream'  # Default MIME type if none is found

    # Read and encode the image file
    base64_encoded_data = encode_image(image_path)

    # Construct the data URL
    return f"data:{mime_type};base64,{base64_encoded_data}"

# Path to your image
image_path = "/Users/qinqiang02/job/客户/百胜新财务影像和档案系统/poc/缴费通知单/86002175.jpg"

# Getting the base64 string
data_url = local_image_to_data_url(image_path)


# OpenAI API Key
api_key = os.environ['OPENAI_API_KEY']

headers = {
  "Content-Type": "application/json",
  "Authorization": f"Bearer {api_key}"
}

payload = {
  "model": "gpt-4-vision-preview",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "30个字以内描述这幅图片"
        },
        {
          "type": "image_url",
          "image_url": {
            # "url": f"data:image/jpeg;base64,{base64_image}"
            "url": data_url
          }
        }
      ]
    }
  ],
  "max_tokens": 300
}

response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)

print(response.json())