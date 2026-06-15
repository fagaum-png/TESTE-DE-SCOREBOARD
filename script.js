// Configuração de Sincronização Remota (PeerJS)
// Isso permite que o Celular de Controle fale com o Celular da Live
let peer;
let connection;
const peerId = "playfit-king-" + Math.floor(Math.random() * 9000); // ID Único para sua mesa

// Estado do Jogo
let state = {
    event: "KING OF THE COURT",
    sponsor: "PLAYFIT",
    king: { name: "Dupla Rei", score: 0 },
    challengers: [
        { name: "Dupla 2", score: 0 },
        { name: "Dupla 3", score: 0 },
        { name: "Dupla 4", score: 0 },
        { name: "Dupla 5", score: 0 }
    ],
    timer: 900,
    timerRunning: false
};

// --- FUNÇÃO PARA O OVERLAY (PRISM LIVE) ---
function initOverlay() {
    // Exibe o ID na tela inicialmente para você conectar o controle
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room');

    peer = new Peer(room || peerId);
    
    peer.on('open', (id) => {
        console.log("ID do Overlay: " + id);
        // Se quiser debugar no PRISM, pode dar um alert(id)
    });

    peer.on('connection', (conn) => {
        conn.on('data', (data) => {
            state = data;
            renderOverlay();
        });
    });
}

// --- FUNÇÃO PARA O PAINEL DE CONTROLE ---
function initControl() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetRoom = urlParams.get('room');

    peer = new Peer();
    
    peer.on('open', () => {
        if(targetRoom) {
            connection = peer.connect(targetRoom);
            setupControlLogic();
        } else {
            alert("Por favor, adicione ?room=ID_DO_OVERLAY na URL");
        }
    });
}

function pushUpdate() {
    // Atualiza interface local do controle
    renderControlRanking();
    
    // Envia para o Overlay via P2P
    if (connection && connection.open) {
        connection.send(state);
    }
    
    // Backup local
    localStorage.setItem('kotc_state', JSON.stringify(state));
}

// --- LÓGICA DE INTERFACE (Comum) ---

function renderOverlay() {
    document.getElementById('display-event').innerText = state.event;
    document.getElementById('display-sponsor').innerText = state.sponsor;
    document.getElementById('display-king-name').innerText = state.king.name;
    document.getElementById('display-king-score').innerText = state.king.score;
    
    const min = Math.floor(state.timer / 60);
    const sec = state.timer % 60;
    document.getElementById('display-timer').innerText = `${min}:${sec < 10 ? '0'+sec : sec}`;

    const allTeams = [state.king, ...state.challengers].sort((a, b) => b.score - a.score);
    const rankContainer = document.getElementById('display-ranking');
    rankContainer.innerHTML = '';
    
    allTeams.slice(0, 5).forEach((team, idx) => {
        const div = document.createElement('div');
        div.className = `rank-item ${idx === 0 ? 'leader' : ''}`;
        div.innerHTML = `<span>${idx + 1}. ${team.name}</span><span>${team.score}</span>`;
        rankContainer.appendChild(div);
    });
}

// Funções de controle de pontos e cronômetro (Similares ao anterior)
function setupControlLogic() {
    setInterval(() => {
        if (state.timerRunning && state.timer > 0) {
            state.timer--;
            pushUpdate();
        }
    }, 1000);
}

function changeScore(target, val) {
    if (target === 'king') state.king.score = Math.max(0, state.king.score + val);
    else state.challengers[target].score = Math.max(0, state.challengers[target].score + val);
    pushUpdate();
}

function promoteToKing(index) {
    const oldKing = { ...state.king };
    state.king = { ...state.challengers[index] };
    state.challengers[index] = oldKing;
    pushUpdate();
}

function timerAction(action) {
    if (action === 'start') state.timerRunning = true;
    if (action === 'pause') state.timerRunning = false;
    if (action === 'reset') {
        state.timerRunning = false;
        state.timer = 900; 
    }
    pushUpdate();
}