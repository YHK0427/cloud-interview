import os
import json
import urllib.request


GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'


def get_feedback(question, model_answer, user_answer):
    api_key = os.environ.get('GEMINI_API_KEY', '')
    key_file = os.environ.get('GEMINI_API_KEY_FILE', '')
    if key_file:
        with open(key_file, 'r') as f:
            api_key = f.read().strip()
    if not api_key:
        return '피드백을 생성할 수 없습니다. GEMINI_API_KEY가 설정되지 않았습니다.'

    prompt = f"""당신은 IT 면접관입니다. 다음 면접 질문에 대한 지원자의 답변을 평가해주세요.

[질문]: {question}
[모범 답안]: {model_answer}
[지원자 답변]: {user_answer}

다음 형식으로 피드백해주세요:
1. 점수 (10점 만점)
2. 잘한 점
3. 부족한 점
4. 보완 제안

지원자의 답변이 비어있거나 너무 짧은 경우, 그에 맞는 피드백을 제공해주세요."""

    try:
        body = json.dumps({
            'contents': [{'parts': [{'text': prompt}]}]
        }).encode('utf-8')

        req = urllib.request.Request(
            f'{GEMINI_API_URL}?key={api_key}',
            data=body,
            headers={'Content-Type': 'application/json'},
        )

        with urllib.request.urlopen(req, timeout=30) as res:
            data = json.loads(res.read())

        return data['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        return f'피드백 생성 중 오류가 발생했습니다: {str(e)}'
