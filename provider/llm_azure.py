import base64
import os
from mimetypes import guess_type

from dotenv import load_dotenv
from openai import AzureOpenAI
import json

load_dotenv(override=True)


# Function to encode a local image into data URL
def local_image_to_data_url(image_path):
    # Guess the MIME type of the image based on the file extension
    mime_type, _ = guess_type(image_path)
    if mime_type is None:
        mime_type = 'application/octet-stream'  # Default MIME type if none is found

    # Read and encode the image file
    with open(image_path, "rb") as image_file:
        base64_encoded_data = base64.b64encode(image_file.read()).decode('utf-8')

    # Construct the data URL
    return f"data:{mime_type};base64,{base64_encoded_data}"


api_base = os.environ.get("AZURE_OPENAI_ENDPOINT")
api_key = os.environ.get("AZURE_OPENAI_KEY")
deployment_name = os.environ.get("OPENAI_DEPLOYMENT_NAME")
api_version = os.environ.get("OPENAI_API_VERSION")
client = AzureOpenAI(
    api_key=api_key,
    api_version=api_version,
    base_url=f"{api_base}openai/deployments/{deployment_name}/extensions",
)


class LLMAzureOpenAI:
    def generate_text(self, image_path, sys_prompt, reqid):
        print("使用模型API：azure ", os.environ['OPENAI_DEPLOYMENT_NAME'], reqid)
        try:
            data_url = local_image_to_data_url(image_path)
            response = client.chat.completions.create(
                model=deployment_name,
                temperature=0,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": data_url
                            }
                        }
                    ]}
                ],
                max_tokens=2000
            )
        except Exception as e:
            print(f"调用openai出错：{e}")
            return json.dumps({"error": "fail: 调用大模型接口出错"})

        print("total tokens:", response.usage.total_tokens)
        print(response.choices[0].message.content)

        return response.choices[0].message.content
