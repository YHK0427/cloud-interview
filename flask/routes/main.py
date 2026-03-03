import random
from flask import Blueprint, render_template, request, jsonify
from models import db, Question, Answer

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    return render_template('index.html')


@main_bp.route('/api/categories')
def get_categories():
    rows = db.session.query(Question.category).distinct().all()
    categories = [row[0] for row in rows]
    return jsonify(categories)


@main_bp.route('/api/start', methods=['POST'])
def start_interview():
    data = request.get_json()
    categories = data.get('categories', [])

    if not categories:
        return jsonify({'error': '카테고리를 선택해주세요.'}), 400

    # 새 세션 번호 생성
    max_session = db.session.query(db.func.max(Answer.session_no)).scalar()
    session_no = (max_session or 0) + 1

    # 카테고리별 균등 배분으로 10문제 선발
    total = 10
    per_category = total // len(categories)
    remainder = total % len(categories)

    selected_questions = []
    for i, cat in enumerate(categories):
        count = per_category + (1 if i < remainder else 0)
        questions = Question.query.filter_by(category=cat).all()
        if len(questions) <= count:
            selected_questions.extend(questions)
        else:
            selected_questions.extend(random.sample(questions, count))

    random.shuffle(selected_questions)

    # answers 테이블에 빈 레코드 미리 생성
    for q in selected_questions:
        answer = Answer(question_id=q.id, session_no=session_no)
        db.session.add(answer)
    db.session.commit()

    return jsonify({
        'session_no': session_no,
        'questions': [
            {
                'id': q.id,
                'question': q.question,
                'category': q.category
            } for q in selected_questions
        ]
    })
