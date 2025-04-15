import os
from firebase_functions import https_fn, options
import openai
import firebase_admin
from firebase_admin import credentials
import requests
import base64
import json
import numpy as np
import embeddings

# Firebase Admin SDKの初期化
cred = credentials.ApplicationDefault()
firebase_admin.initialize_app(cred)

# OpenAI APIキーを環境変数から取得
API_KEY = "sk-proj-your-api-key"
openai.api_key = API_KEY

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins=["*"], cors_methods=["GET", "POST"])
)
def image_to_status(text: https_fn.Request) -> https_fn.Response:
    try:
        # 0. 引数の確認
        # image_url = text.args.get('image_url')

        # # image_urlがNoneでないことを確認
        # if not image_url:
        #     return https_fn.Response('Image URL is required', status=400)

        # 1. 画像の準備
        request_json = text.get_json(silent=True)
        if not request_json or 'image_url' not in request_json:
            return https_fn.Response('Image URL is required', status=400)

        # 1. 画像の準備
        image_url = request_json['image_url']
        
        response = requests.get(image_url)
        if response.status_code != 200:
            return https_fn.Response('Failed to download image', status=400)
        base64_image = base64.b64encode(response.content).decode('utf-8')
        
        # 2. Image2keywords
        # APIから取得するもの -> keywords, special_move, sorted_status, defeat_quote
        # http://127.0.0.1:5001/picture-hunter-api/us-central1/get_embedding_from_url?word=quick
        status_list = ["vitality", "attack", "defense", "speed"]
        prompt = f"""
        ### Direction ###
        Given an image, generate five representative keywords for the image, a special move name in approximately 2 English words, and select one special move effect from the following list: "{status_list[0]} increase", "{status_list[1]} increase", "{status_list[2]} increase" or "{status_list[3]} increase."

        After estimating these values, sort the attributes ("{status_list[0]}", "{status_list[1]}", "{status_list[2]}", "{status_list[3]}") in descending order based on their values and output the sorted order in an additional field named "sorted_status".

        Finally, generate a defeat quote that the character might say upon losing, related to the image and keywords. The quote should clearly reflect the image's context and keywords so that it is understandable why the line was generated. The quote must be in Japanese within 30 characters, with a tone of reluctance or defiance.

        **Ensure the defeat quote directly references at least one or two of the generated keywords, reflecting the character's specific situation or struggle as seen in the image.**

        ### Output Format ###
        ["keyword1": "keyword1", "keyword2": "keyword2", "keyword3": "keyword3", "keyword4": "keyword4", "keyword5": "keyword5", "special_move": "special move name", "special_move_effect": "selected effect", "sorted_status": "attribute1-attribute2-attribute3-attribute4", "defeat_quote": "character's defeat quote in Japanese within 30 characters, showing reluctance or defiance"]

        ### Example1 ###
        ["keyword1": "dinosaur", "keyword2": "roar", "keyword3": "teeth", "keyword4": "power", "keyword5": "ancient", "special_move": "Roar Quake", "special_move_effect": "attack increase", "sorted_status": "attack-vitality-defense-speed", "defeat_quote": "恐竜は絶滅しない..."]
        
        ### Example2 ###
        ["keyword1": "wizard", "keyword2": "magic", "keyword3": "staff", "keyword4": "spell", "keyword5": "cloak", "special_move": "Arcane Burst", "special_move_effect": "attack increase", "sorted_status": "attack-speed-defense-vitality", "defeat_quote": "魔力が残ってないだと!?"]
        
        ### Example3 ###
        ["keyword1": "robot", "keyword2": "laser", "keyword3": "metal", "keyword4": "technology", "keyword5": "power", "special_move": "Laser Strike", "special_move_effect": "attack increase", "sorted_status": "attack-defense-vitality-speed", "defeat_quote": "どこかのネジが外れてる"]
        """
        API_KEY = "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"
        client = openai.OpenAI(api_key=API_KEY)
        response = client.chat.completions.create(
            # model="gpt-4-vision-preview",
            # model="gpt-4o-mini",
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": str(prompt)
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
            temperature=0.0,
        )
        output = dict(dict(response.choices[0])["message"])["content"]
        output = output.replace('[', '{').replace(']', '}')
        try:
            data_json = json.loads(output)
        except:
            return f"Error: This is not JSON Format {output}"
        
        # 3. keyword2status
        keywords = str(data_json["keyword1"]) + ", " + str(data_json["keyword2"]) + ", " + str(data_json["keyword3"]) + ", " + str(data_json["keyword4"]) + ", " + str(data_json["keyword5"])
        client = openai.OpenAI(api_key="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")
        keyword_embedding = client.embeddings.create(input=[keywords], model="text-embedding-3-small").data[0].embedding
        # ステータスの計算
        status_embeddings = [embeddings.vitality, embeddings.attack, embeddings.defense, embeddings.speed]
        for status_name, status_embedding in zip(status_list, status_embeddings):
            dot_product = np.dot(keyword_embedding, status_embedding)
            norm1 = np.linalg.norm(keyword_embedding)
            norm2 = np.linalg.norm(status_embedding)
            cosine_similarity = dot_product / (norm1 * norm2)
            status_value = int(cosine_similarity * 1000) * 10
            data_json[status_name] = status_value
        
        # sorted_statusから属性順序を取得
        sorted_status_list = data_json["sorted_status"].split("-")
        
        # 各属性に倍率を適用し、10の倍数に丸める
        attribute_multipliers = [1.5, 1.2, 1.0, 0.8]
        for i, attribute in enumerate(sorted_status_list):
            if attribute in data_json:
                # 倍率を適用
                new_value = data_json[attribute] * attribute_multipliers[i]
                # 10の倍数に丸める
                data_json[attribute] = int(round(new_value / 10) * 10)

        # JSON形式に変換
        data_json[f"real_{status_list[0]}"] = data_json[status_list[0]]
        data_json[f"real_{status_list[3]}"] = data_json[status_list[3]]
        data_json[status_list[0]] = data_json[status_list[0]] * 5
        data_json[status_list[3]] = max(int(data_json[status_list[3]]) // 1000, 1)
        return data_json
    except Exception as e:
        # その他の予期しないエラー処理
        return f"An unexpected error occurred: {str(e)}"

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins=["*"], cors_methods=["GET", "POST"])
)
def generate_image_description(text: https_fn.Request) -> https_fn.Response:
    try:
        # リクエストの検証
        # image_url = text.args.get('image_url')
        request_json = text.get_json(silent=True)
        if not request_json or 'image_url' not in request_json:
            return https_fn.Response('Image URL is required', status=400)

        image_url = request_json['image_url']
        print("image url", image_url)
        # 画像をダウンロードしてBase64にエンコード
        response = requests.get(image_url)
        if response.status_code != 200:
            return https_fn.Response('Failed to download image', status=400)
        base64_image = base64.b64encode(response.content).decode('utf-8')
        
        status_list = ["vitality", "attack", "defense", "speed"]
        
        prompt = f"""
        ### direction ###
        Given an image, analyze it to estimate the following characteristics on a scale from1 to 10000in increments of 10: "{status_list[0]}", "{status_list[1]}", "{status_list[2]}", and "{status_list[3]}". The estimations should be based on the visual features of the entity depicted in the image. Additionally, generate five representative keywords for the image, a special move name in approximately 2 English words, and select one special move effect from the following list: "{status_list[0]} increase", "{status_list[1]} increase", "{status_list[2]} increase" or "{status_list[3]} increase."

        After estimating these values, sort the attributes ("{status_list[0]}", "{status_list[1]}", "{status_list[2]}", "{status_list[3]}") in descending order based on their values and output the sorted order in an additional field named "sorted_status".

        ### output format ###
        Please provide the estimated values in the following Listformat (Each value should be a multiple of 10):
        
        ["{status_list[0]}": value, "{status_list[1]}": value, "{status_list[2]}": value, "{status_list[3]}": value, "keyword1": "keyword1", "keyword2": "keyword2", "keyword3": "keyword3", "keyword4": "keyword4", "keyword5": "keyword5", "special_move": "special move name", "special_move_effect": "selected effect", "sorted_status": "attribute1-attribute2-attribute3-attribute4"]

        ### Example ###
        ["{status_list[0]}": 8320, "{status_list[1]}": 9530, "{status_list[2]}": 7640, "{status_list[3]}": 6530, "keyword1": "dragon", "keyword2": "fear", "keyword3": "wing", "keyword4": "nail", "keyword5": "fire", "special_move": "Fire Explosion", "special_move_effect": "{status_list[1]}" increase", "sorted_status": "{status_list[1]}-{status_list[0]}-{status_list[2]}-{status_list[3]}"]
        """

        
        API_KEY = "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"
        client = openai.OpenAI(api_key=API_KEY)
        
        response = client.chat.completions.create(
            # model="gpt-4-vision-preview",
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": str(prompt)
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
            temperature=0.0,
        )
        # 文字列として取得
        output = dict(dict(response.choices[0])["message"])["content"]
        output = output.replace('[', '{').replace(']', '}')
        try:
            data_json = json.loads(output)
        except:
            return f"Error: This is not JSON Format {output}"
        
        # sorted_statusから属性順序を取得
        sorted_status_list = data_json["sorted_status"].split("-")
        
                # 各属性に倍率を適用し、10の倍数に丸める
        attribute_multipliers = [1.5, 1.2, 1.0, 0.8]
        for i, attribute in enumerate(sorted_status_list):
            if attribute in data_json:
                # 倍率を適用
                new_value = data_json[attribute] * attribute_multipliers[i]
                # 10の倍数に丸める
                data_json[attribute] = int(round(new_value / 10) * 10)

        # JSON形式に変換
        data_json["vitality"] = data_json["vitality"] * 5
        data_json["speed"] = max(data_json["speed"] // 1000, 1)
        return data_json
    except openai.error.OpenAIError as e:
        # OpenAI APIのエラー処理
        return f"OpenAI API error: {str(e)}"
    except Exception as e:
        # その他の予期しないエラー処理
        return f"An unexpected error occurred: {str(e)}"

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins=["*"], cors_methods=["GET", "POST"])
)
def generate_text_response(text: https_fn.Request) -> https_fn.Response:
    try:
        # API_KEY = "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"
        API_KEY = "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"
        client = openai.OpenAI(api_key=API_KEY)
        
        # リクエストの検証
        request_json = text.get_json(silent=True)
        if not request_json or 'text' not in request_json:
            return https_fn.Response('Text is required', status=400)

        input_text = request_json['text']
        print("input text", input_text)

        # OpenAIのCompletionエンドポイントを使用
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": str(input_text)
                        }
                    ]
                }
            ],
            max_tokens=100,
            temperature=0.0,
        )
        
        output = dict(dict(response.choices[0])["message"])["content"]
        return output

    except openai.error.OpenAIError as e:
        # OpenAI APIのエラー処理
        return https_fn.Response(f"OpenAI API error: {str(e)}", status=500)
    except Exception as e:
        # その他の予期しないエラー処理
        return https_fn.Response(f"An unexpected error occurred: {str(e)}", status=500)

def get_embedding(word: str) -> list:
    client = openai.OpenAI(api_key="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")
    response = client.embeddings.create(input=[word], model="text-embedding-3-small").data[0].embedding
    return response  # ここで数値ベクトルを直接返します

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins=["*"], cors_methods=["GET", "POST"])
)
def get_embedding_from_url(text: https_fn.Request) -> https_fn.Response:
    word = text.args.get('word')
    client = openai.OpenAI(api_key="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")
    response = client.embeddings.create(input=[word], model="text-embedding-3-small").data[0].embedding
    return response


@https_fn.on_request(
    cors=options.CorsOptions(cors_origins=["*"], cors_methods=["GET", "POST"])
)
def caliculate_similarity(request: https_fn.Request) -> https_fn.Response:
    request_json = request.get_json(silent=True)
    if not request_json or 'word1' not in request_json:
        return https_fn.Response('Word1 is required', status=400)
    if not request_json or 'word2' not in request_json:
        return https_fn.Response('Word2 is required', status=400)
    word1 = request_json['word1']
    word2 = request_json['word2']
    # word1 = request.args.get('word1')
    # word2 = request.args.get('word2')

    if word1 is None or word2 is None:
        return https_fn.Response("Both 'word1' and 'word2' must be provided.", status=400)

    embedding1 = np.array(get_embedding(word1))
    embedding2 = np.array(get_embedding(word2))
    
    # コサイン類似度の計算
    dot_product = np.dot(embedding1, embedding2)
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)
    cosine_similarity = dot_product / (norm1 * norm2)
    
    return https_fn.Response(str(cosine_similarity), status=200)
