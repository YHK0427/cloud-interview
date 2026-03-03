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
const revealBtn = document.getElementById('reveal-btn');
const questionHiddenMsg = document.getElementById('question-hidden-msg');
let questionRevealed = false;

// 질문 목록 로드
fetch(`/api/questions/${SESSION_NO}`)
    .then(res => res.json())
    .then(data => {
        questions = data;
        showQuestion();
    });

function showQuestion() {
    if (currentIndex >= questions.length) {
        // 면접 완료
        document.querySelector('.question-card').style.display = 'none';
        document.querySelector('.answer-card').style.display = 'none';
        resultSection.style.display = 'none';

        const container = document.querySelector('.interview-container');
        const doneDiv = document.createElement('div');
        doneDiv.className = 'done-section';
        doneDiv.innerHTML = `
            <span class="done-icon">&#10003;</span>
            <p>면접 연습 완료</p>
            <p class="done-sub">모든 질문에 답변했습니다</p>
            <div class="done-actions">
                <a href="/history" class="btn btn-primary btn-lg">히스토리 보기</a>
                <a href="/" class="btn btn-secondary btn-lg">새 면접 시작</a>
            </div>
        `;
        container.appendChild(doneDiv);
        return;
    }

    const q = questions[currentIndex];
    questionText.textContent = q.question;
    categoryBadge.textContent = q.category;
    categoryBadge.style.display = 'inline-flex';

    // 질문 텍스트 숨김 (실제 면접처럼)
    questionRevealed = false;
    questionText.style.display = 'none';
    questionHiddenMsg.style.display = 'block';
    revealBtn.textContent = '질문 텍스트 보기';

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
    document.querySelector('.answer-card').style.display = 'block';
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    listenBtn.disabled = false;

    if (currentIndex === questions.length - 1) {
        nextBtn.textContent = '면접 완료';
    } else {
        nextBtn.textContent = '다음 질문';
    }

    // TTS 프리페치: 현재 질문 + 다음 질문을 백그라운드로 미리 로드
    prefetchTTS(currentIndex);
    prefetchTTS(currentIndex + 1);
}

// 질문 텍스트 토글
revealBtn.addEventListener('click', function() {
    questionRevealed = !questionRevealed;
    if (questionRevealed) {
        questionText.style.display = 'block';
        questionHiddenMsg.style.display = 'none';
        revealBtn.textContent = '질문 텍스트 숨기기';
    } else {
        questionText.style.display = 'none';
        questionHiddenMsg.style.display = 'block';
        revealBtn.textContent = '질문 텍스트 보기';
    }
});

// TTS - 프리페치 캐시 + 질문 듣기
let ttsAudio = null;
const ttsCache = {}; // index → Blob 캐시
let ttsReady = false;
const ttsBanner = document.getElementById('tts-loading-banner');

function hideTTSBanner() {
    if (!ttsReady) {
        ttsReady = true;
        ttsBanner.classList.add('hidden');
    }
}

function prefetchTTS(index, retryCount) {
    if (index >= questions.length || ttsCache[index]) return;
    const retry = retryCount || 0;
    ttsCache[index] = fetch('/api/tts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: questions[index].question})
    })
    .then(res => {
        if (!res.ok) throw new Error('TTS prefetch failed');
        return res.blob();
    })
    .then(blob => {
        hideTTSBanner();
        return blob;
    })
    .catch(err => {
        console.error('TTS 프리페치 오류:', err);
        delete ttsCache[index];
        // 모델 로딩 중일 수 있으므로 최대 5회 재시도 (5초 간격)
        if (retry < 5) {
            setTimeout(() => prefetchTTS(index, retry + 1), 5000);
        }
        return null;
    });
}

listenBtn.addEventListener('click', function() {
    // 이전 재생 중지
    if (ttsAudio) {
        ttsAudio.pause();
        ttsAudio = null;
    }

    const idx = currentIndex;

    // 프리페치된 결과가 있으면 사용, 없으면 새로 요청
    const blobPromise = ttsCache[idx] || (function() {
        return fetch('/api/tts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text: questions[idx].question})
        })
        .then(res => {
            if (!res.ok) throw new Error('TTS 생성 실패');
            return res.blob();
        });
    })();

    // 이미 로드 완료됐으면 즉시 재생, 아니면 로딩 표시
    listenBtn.disabled = true;
    listenBtn.textContent = '로딩 중...';

    Promise.resolve(blobPromise)
    .then(blob => {
        if (!blob) throw new Error('TTS 데이터 없음');
        hideTTSBanner();
        const url = URL.createObjectURL(blob);
        ttsAudio = new Audio(url);
        ttsAudio.play();
        listenBtn.textContent = '재생 중...';
        listenBtn.disabled = false;
        ttsAudio.onended = () => {
            URL.revokeObjectURL(url);
            ttsAudio = null;
            listenBtn.textContent = '질문 듣기';
        };
    })
    .catch(err => {
        console.error('TTS 오류:', err);
        if (!ttsReady) {
            listenBtn.textContent = '모델 준비 중...';
            // 3초 후 버튼 텍스트 복원
            setTimeout(() => {
                listenBtn.textContent = '질문 듣기';
                listenBtn.disabled = false;
            }, 3000);
        } else {
            listenBtn.textContent = '질문 듣기';
            listenBtn.disabled = false;
        }
    });
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
    const icon = modelAnswerToggle.querySelector('.collapsible-icon');
    if (text.style.display === 'none') {
        text.style.display = 'block';
        modelAnswerToggle.classList.add('open');
    } else {
        text.style.display = 'none';
        modelAnswerToggle.classList.remove('open');
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
        feedbackText.innerHTML = marked.parse(data.feedback);
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
    if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
    currentIndex++;
    showQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
