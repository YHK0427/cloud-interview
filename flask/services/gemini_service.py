import os
from google import genai


def get_feedback(question, model_answer, user_answer):
    api_key = os.environ.get('GEMINI_API_KEY', '')
    if not api_key:
        return '피드백을 생성할 수 없습니다. GEMINI_API_KEY가 설정되지 않았습니다.'

    client = genai.Client(api_key=api_key)

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
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f'피드백 생성 중 오류가 발생했습니다: {str(e)}'
