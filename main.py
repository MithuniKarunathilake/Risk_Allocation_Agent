from flask import Flask, request, jsonify, send_from_directory
from backend.models import AllocationRequest
from backend.agent import ResourceAllocationAgent
from groq import Groq
import os
from dotenv import load_dotenv
import httpx
from pydantic import ValidationError
import json

load_dotenv()

app = Flask(__name__, static_folder='frontend', static_url_path='')
agent = ResourceAllocationAgent()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable not set")

http_client = httpx.Client(
    proxies=None,
    timeout=httpx.Timeout(30.0),
)
client = Groq(api_key=GROQ_API_KEY, http_client=http_client)


@app.route('/allocate', methods=['POST'])
def allocate_resources():
    try:
        # Parse JSON data from request
        data = request.json
        # Validate and convert to AllocationRequest
        allocation_request = AllocationRequest(**data)
        # Process the validated request
        result = agent.process_request(allocation_request)
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        return jsonify(result)
    except ValidationError as e:
        return jsonify({"error": f"Validation error: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/chat', methods=['POST'])
def chat_with_groq():
    try:
        data = request.json
        message = data.get('message', '')
        if not message:
            return jsonify({"error": "Message is required"}), 400

        system_prompt = (
            "You are a chatbot specialized in construction resource allocation. "
            "You can only answer questions related to allocating resources (e.g., materials, labor, equipment) "
            "for construction projects. If the question is unrelated, respond with: "
            "'I can only assist with construction resource allocation questions.'"
        )

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            model="llama3-8b-8192",
            temperature=0.5,
            max_tokens=1024
        )

        return jsonify({"response": chat_completion.choices[0].message.content})
    except Exception as e:
        return jsonify({"error": f"Groq API error: {str(e)}"}), 500


@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)