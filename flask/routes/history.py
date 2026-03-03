from flask import Blueprint, render_template, jsonify
from models import db, Question, Answer

history_bp = Blueprint('history', __name__)


@history_bp.route('/history')
def history_page():
    return render_template('history.html')


@history_bp.route('/api/history')
def get_history():
    sessions = (
        db.session.query(
            Answer.session_no,
            db.func.count(Answer.id).label('question_count'),
            db.func.max(Answer.created_at).label('last_date')
        )
        .group_by(Answer.session_no)
        .order_by(Answer.session_no.desc())
        .all()
    )

    return jsonify([
        {
            'session_no': s.session_no,
            'question_count': s.question_count,
            'date': s.last_date.strftime('%Y-%m-%d %H:%M') if s.last_date else ''
        } for s in sessions
    ])


@history_bp.route('/api/history/<int:session_no>')
def get_session_detail(session_no):
    answers = (
        Answer.query
        .filter_by(session_no=session_no)
        .order_by(Answer.id)
        .all()
    )

    result = []
    for a in answers:
        q = Question.query.get(a.question_id)
        result.append({
            'question': q.question,
            'model_answer': q.model_answer,
            'category': q.category,
            'user_answer': a.answer,
            'feedback': a.feedback
        })

    return jsonify(result)
