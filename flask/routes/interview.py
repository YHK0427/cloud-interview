import io
import os
import wave
from google import genai
from google.genai import types
from flask import Blueprint, render_template, request, jsonify, Response
from models import db, Question, Answer
from services.gemini_service import get_feedback

interview_bp = Blueprint('interview', __name__)


@interview_bp.route('/interview/<int:session_no>')
def interview_page(session_no):
    return render_template('interview.html', session_no=session_no)


@interview_bp.route('/api/questions/<int:session_no>')
def get_session_questions(session_no):
    answers = Answer.query.filter_by(session_no=session_no).all()
    result = []
    for a in answers:
        q = Question.query.get(a.question_id)
        result.append({
            'answer_id': a.id,
            'question_id': q.id,
            'question': q.question,
            'model_answer': q.model_answer,
            'category': q.category,
            'user_answer': a.answer,
            'feedback': a.feedback
        })
    return jsonify(result)


@interview_bp.route('/api/answer', methods=['POST'])
def save_answer():
    data = request.get_json()
    answer_id = data.get('answer_id')
    user_answer = data.get('answer', '')

    answer = Answer.query.get(answer_id)
    if not answer:
        return jsonify({'error': '답변 레코드를 찾을 수 없습니다.'}), 404

    answer.answer = user_answer
    db.session.commit()

    return jsonify({'success': True})


@interview_bp.route('/api/feedback', methods=['POST'])
def generate_feedback():
    data = request.get_json()
    answer_id = data.get('answer_id')

    answer = Answer.query.get(answer_id)
    if not answer:
        return jsonify({'error': '답변 레코드를 찾을 수 없습니다.'}), 404

    question = Question.query.get(answer.question_id)

    feedback_text = get_feedback(
        question=question.question,
        model_answer=question.model_answer,
        user_answer=answer.answer or ''
    )

    answer.feedback = feedback_text
    db.session.commit()

    return jsonify({'feedback': feedback_text})


@interview_bp.route('/api/tts', methods=['POST'])
def text_to_speech():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return jsonify({'error': '텍스트가 없습니다.'}), 400

    try:
        client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY', ''))
        response = client.models.generate_content(
            model='gemini-2.5-flash-preview-tts',
            contents=text,
            config=types.GenerateContentConfig(
                response_modalities=['AUDIO'],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name='Kore',
                        )
                    )
                ),
            )
        )
        pcm_data = response.candidates[0].content.parts[0].inline_data.data
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(pcm_data)
        buffer.seek(0)
        return Response(buffer.read(), mimetype='audio/wav')
    except Exception as e:
        return jsonify({'error': f'TTS 생성 실패: {str(e)}'}), 500
