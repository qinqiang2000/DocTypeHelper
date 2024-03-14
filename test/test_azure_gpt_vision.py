import os
from dotenv import load_dotenv
from openai import AzureOpenAI
import base64
import json
from mimetypes import guess_type
from provider.prompt import base_prompt


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


load_dotenv(override=True)

api_base = os.environ.get("AZURE_OPENAI_ENDPOINT")
api_key = os.environ.get("AZURE_OPENAI_KEY")
deployment_name = os.environ.get("OPENAI_DEPLOYMENT_NAME")
api_version = os.environ.get("OPENAI_API_VERSION")

client = AzureOpenAI(
    api_key=api_key,
    api_version=api_version,
    base_url=f"{api_base}openai/deployments/{deployment_name}/extensions",
)


def image_chat(data_url):
    response = client.chat.completions.create(
        model=deployment_name,
        temperature=0,
        messages=[
            {"role": "system", "content": base_prompt},
            {"role": "user", "content": [
                # {
                #     "type": "text",
                #     "text": base_prompt
                # },
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
    return response


# Path to your image
# image_path = "/Users/qinqiang02/job/客户/百胜新财务影像和档案系统/poc/收货单样例"
image_path = "/Users/qinqiang02/job/客户/百胜新财务影像和档案系统/poc/收货单样例/7.png"
# image_path = "/Users/qinqiang02/job/客户/百胜新财务影像和档案系统/poc/缴费通知单/1月通知单.jpg"

# 判断image_path是否file
if os.path.isfile(image_path):
    data_url = local_image_to_data_url(image_path)
    response = image_chat(data_url)

    print(f"[{image_path}]total tokens:", response.usage.total_tokens)
    print(f"[{image_path}]", response.choices[0].message.content)
    exit(1)

# 遍历文件夹，打印文件
for root, dirs, files in os.walk(image_path):
    for file in files:
        f = os.path.join(root, file)
        # 只读取图片文件
        if not f.endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp')):
            continue

        print(f)
        data_url = local_image_to_data_url(f)
        response = image_chat(data_url)

        print(f"[{file}]total tokens:", response.usage.total_tokens)
        print(f"[{file}]", response.choices[0].message.content)
