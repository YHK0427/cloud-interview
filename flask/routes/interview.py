import asyncio
import hashlib
import edge_tts
from flask import Blueprint, render_template, request, jsonify, Response
from models import db, Question, Answer
from services.gemini_service import get_feedback

interview_bp = Blueprint('interview', __name__)

# TTS 캐시 (질문 텍스트 해시 → MP3 바이트)
_tts_cache = {}

# edge-tts 한국어 음성
EDGE_TTS_VOICE = 'ko-KR-SunHiNeural'


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

    # 캐시 키 생성
    cache_key = hashlib.md5(text.encode('utf-8')).hexdigest()

    # 캐시 히트 → 즉시 반환
    if cache_key in _tts_cache:
        return Response(_tts_cache[cache_key], mimetype='audio/mpeg')

    try:
        async def _generate():
            communicate = edge_tts.Communicate(text, EDGE_TTS_VOICE)
            audio_data = b''
            async for chunk in communicate.stream():
                if chunk['type'] == 'audio':
                    audio_data += chunk['data']
            return audio_data

        mp3_bytes = asyncio.run(_generate())

        # 캐시에 저장 (같은 질문 재요청 시 즉시 반환)
        _tts_cache[cache_key] = mp3_bytes

        return Response(mp3_bytes, mimetype='audio/mpeg')
    except Exception as e:
        return jsonify({'error': f'TTS 생성 실패: {str(e)}'}), 500
