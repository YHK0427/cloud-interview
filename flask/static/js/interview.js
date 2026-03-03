let questions = [];
let currentIndex = 0;
let recognition = null;
let isRecording = false;

const questionText = document.getElementById('question-text');
const categoryBadge = document.getElementById('category-badge');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const answerText = document.getElementById('answer-text');
const recordingIndicator = document.getElementById('recording-indicator');
const resultSection = document.getElementById('result-section');
const modelAnswerText = document.getElementById('model-answer-text');
const modelAnswerToggle = document.getElementById('model-answer-toggle');
const feedbackBtn = document.getElementById('feedback-btn');
const feedbackText = document.getElementById('feedback-text');
const nextBtn = document.getElementById('next-btn');
const listenBtn = document.getElementById('listen-btn');
const recordBtn = document.getElementById('record-btn');
const stopBtn = document.getElementById('stop-btn');

// 질문 목록 로드
fetch(`/api/questions/${SESSION_NO}`)
    .then(res => res.json())
    .then(data => {
        questions = data;
        showQuestion();
    });

function showQuestion() {
    if (currentIndex >= questions.length) {
        questionText.textContent = '모든 질문이 완료되었습니다!';
        categoryBadge.style.display = 'none';
        document.querySelector('.answer-section').style.display = 'none';
        resultSection.style.display = 'none';

        const container = document.querySelector('.interview-container');
        const doneDiv = document.createElement('div');
        doneDiv.className = 'done-section';
        doneDiv.innerHTML = `
            <p>면접 연습이 끝났습니다.</p>
            <a href="/history" class="btn btn-primary btn-lg">히스토리 보기</a>
            <a href="/" class="btn btn-secondary btn-lg">새 면접 시작</a>
        `;
        container.appendChild(doneDiv);
        return;
    }

    const q = questions[currentIndex];
    questionText.textContent = q.question;
    categoryBadge.textContent = q.category;
    categoryBadge.style.display = 'inline-block';

    const progress = ((currentIndex + 1) / questions.length) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = `${currentIndex + 1} / ${questions.length}`;

    // 상태 초기화
    answerText.textContent = '';
    resultSection.style.display = 'none';
    feedbackText.style.display = 'none';
    feedbackText.textContent = '';
    feedbackBtn.disabled = false;
    feedbackBtn.textContent = '피드백 보기';
    document.querySelector('.answer-section').style.display = 'block';
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    listenBtn.disabled = false;

    // 마지막 문제면 버튼 텍스트 변경
    if (currentIndex === questions.length - 1) {
        nextBtn.textContent = '면접 완료';
    } else {
        nextBtn.textContent = '다음 질문';
    }
}

// TTS - 질문 듣기
listenBtn.addEventListener('click', function() {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(questions[currentIndex].question);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
});

// STT - 답변하기
recordBtn.addEventListener('click', function() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = answerText.textContent || '';

    recognition.onresult = function(event) {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + ' ';
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        answerText.innerHTML = finalTranscript + '<span class="interim">' + interimTranscript + '</span>';
    };

    recognition.onerror = function(event) {
        if (event.error !== 'no-speech') {
            console.error('음성 인식 오류:', event.error);
        }
    };

    recognition.onend = function() {
        if (isRecording) {
            recognition.start();
        }
    };

    recognition.start();
    isRecording = true;
    recordingIndicator.style.display = 'flex';
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    listenBtn.disabled = true;
});

// 답변 완료
stopBtn.addEventListener('click', function() {
    isRecording = false;
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
    recordingIndicator.style.display = 'none';
    stopBtn.disabled = true;
    recordBtn.disabled = true;
    listenBtn.disabled = true;

    // interim 텍스트 정리
    const interim = answerText.querySelector('.interim');
    if (interim) {
        answerText.textContent = answerText.textContent;
    }

    const answer = answerText.textContent.trim();
    const q = questions[currentIndex];

    // 서버에 답변 저장
    fetch('/api/answer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            answer_id: q.answer_id,
            answer: answer
        })
    });

    // 결과 섹션 표시
    modelAnswerText.textContent = q.model_answer;
    resultSection.style.display = 'block';
});

// 모범 답안 토글
modelAnswerToggle.addEventListener('click', function() {
    const text = modelAnswerText;
    if (text.style.display === 'none') {
        text.style.display = 'block';
        modelAnswerToggle.textContent = '모범 답안 ▲';
    } else {
        text.style.display = 'none';
        modelAnswerToggle.textContent = '모범 답안 ▼';
    }
});

// 피드백 보기
feedbackBtn.addEventListener('click', function() {
    const q = questions[currentIndex];
    feedbackBtn.disabled = true;
    feedbackBtn.textContent = '피드백 생성 중...';

    fetch('/api/feedback', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({answer_id: q.answer_id})
    })
    .then(res => res.json())
    .then(data => {
        feedbackText.innerHTML = data.feedback.replace(/\n/g, '<br>');
        feedbackText.style.display = 'block';
        feedbackBtn.textContent = '피드백 완료';
    })
    .catch(err => {
        feedbackText.textContent = '피드백 생성 중 오류가 발생했습니다.';
        feedbackText.style.display = 'block';
        feedbackBtn.disabled = false;
        feedbackBtn.textContent = '피드백 보기';
    });
});

// 다음 질문
nextBtn.addEventListener('click', function() {
    speechSynthesis.cancel();
    currentIndex++;
    showQuestion();
    window.scrollTo(0, 0);
});
