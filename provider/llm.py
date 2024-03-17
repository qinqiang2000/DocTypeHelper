import json
import os
from enum import Enum

from provider.llm_azure import LLMAzureOpenAI
from provider.llm_openai import LLMOpenAI
from provider.llm_rpa_chatgpt import ChatGPTRPA
from provider.prompt import base_prompt


class Channel(Enum):
    MOCK = 1
    RPA = 2
    GPT4 = 3
    AZURE_OPENAI = 4


# 取环境变量LLM_MODEL的值，如果没有，AZURE_OPENAI
channel = Channel(int(os.getenv("LLM_MODEL", Channel.AZURE_OPENAI.value)))


def switch_channel(new_channel):
    global channel
    channel = Channel(new_channel)


# 预处理
def before_extract(text):
    return None


# 后处理
def after_identify(result):
    dic = {}
    # 取result的前三行
    result = result.split("\n")[:3]
    # 去除前后空格
    result = [x.strip() for x in result]

    dic["收货单"] = result[0]
    # dic["Doc Type"] = result[1]
    dic["Reason"] = result[2]

    return json.dumps(dic)


# 入口，包括事前、事中、事后处理
def identify_type(doc_path, text_id=""):
    # 事前

    # 事中
    ret = identify(doc_path, text_id)

    # 事后
    return after_identify(ret)


def identify(doc_path, text_id=""):
    if channel == Channel.MOCK:
        import time
        time.sleep(1)
        return """True
        实物送货单
        双方签字
        """

    if channel == Channel.RPA:
        rpa = ChatGPTRPA()
        return rpa.generate_text(doc_path, base_prompt, text_id)

    if channel == channel.GPT4:
        return LLMOpenAI("gpt-4-1106-preview").generate_text(doc_path, base_prompt, text_id)

    if channel == channel.AZURE_OPENAI:
        return LLMAzureOpenAI().generate_text(doc_path, base_prompt, text_id)

    return """ {"Doc Type": "LLM配置错误"}"""
