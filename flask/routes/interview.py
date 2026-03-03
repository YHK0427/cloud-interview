from flask import Blueprint, render_template, request, jsonify
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
