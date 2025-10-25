window.addEventListener('load', () => {
    // --- CONSTANTS & STATE ---
    const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const SUITS = { s: '♠', h: '♥', d: '♦', c: '♣' };
    const SUIT_CLASSES = { s: 'suit-s', h: 'suit-h', d: 'suit-d', c: 'suit-c' };
    const CARD_RANKS_MAP = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    const HAND_NAMES = {
        10: 'Royal Flush / Straight Flush', 9: 'Four of a Kind', 8: 'Full House', 7: 'Flush',
        6: 'Straight', 5: 'Three of a Kind', 4: 'Two Pair', 3: 'One Pair', 2: 'High Card'
    };
    
    // Player configuration for colors and max players
    const MAX_PLAYERS = 9;
    const PLAYER_CONFIG = {
        1: { name: 'Player 1', colorClass: 'text-player-green', winnerClass: 'winner-p-1' },
        2: { name: 'Player 2', colorClass: 'text-player-red', winnerClass: 'winner-p-2' },
        3: { name: 'Player 3', colorClass: 'text-player-blue', winnerClass: 'winner-p-3' },
        4: { name: 'Player 4', colorClass: 'text-player-yellow', winnerClass: 'winner-p-4' },
        5: { name: 'Player 5', colorClass: 'text-player-purple', winnerClass: 'winner-p-5' },
        6: { name: 'Player 6', colorClass: 'text-player-pink', winnerClass: 'winner-p-6' },
        7: { name: 'Player 7', colorClass: 'text-player-cyan', winnerClass: 'winner-p-7' },
        8: { name: 'Player 8', colorClass: 'text-player-orange', winnerClass: 'winner-p-8' },
        9: { name: 'Player 9', colorClass: 'text-player-indigo', winnerClass: 'winner-p-9' },
    };

    // Dynamic state management
    let selections = {
        board: [null, null, null, null, null],
        players: {
            1: [null, null],
            2: [null, null]
        }
    };

    let usedCards = new Set();
    let openDropdown = null;

    // --- DOM ELEMENTS ---
    const playersContainer = document.getElementById('players-container');
    const playerTemplate = document.getElementById('player-panel-template');
    const evaluateBtn = document.getElementById('evaluate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const addPlayerBtn = document.getElementById('add-player-btn');
    const removePlayerBtn = document.getElementById('remove-player-btn');
    const winnerDisplay = document.getElementById('winner-display');
    

    // --- POKER EVALUATION LOGIC (Kept as is - it's already robust) ---

    function get5CardCombinations(cards7) {
        const result = [];
        for (let i = 0; i < 7; i++) {
            for (let j = i + 1; j < 7; j++) {
                const combo = cards7.filter((_, idx) => idx !== i && idx !== j);
                result.push(combo);
            }
        }
        return result;
    }

    function evaluate5CardHand(hand5) {
        const numericalRanks = hand5.map(c => CARD_RANKS_MAP[c[0]]).sort((a, b) => b - a);
        const suits = hand5.map(c => c[1]);
        const counts = {};
        numericalRanks.forEach(r => counts[r] = (counts[r] || 0) + 1);
        const rankCounts = Object.values(counts).sort((a, b) => b - a);
        const isFlush = new Set(suits).size === 1;

        let isStraight = false;
        const uniqueRanks = [...new Set(numericalRanks)];
        let straightHighCard = uniqueRanks[0];
        if (uniqueRanks.length >= 5) {
            if (uniqueRanks[0] - uniqueRanks[4] === 4) {
                isStraight = true;
            } else if (uniqueRanks[0] === 14 && uniqueRanks.slice(1).join(',') === '5,4,3,2') {
                isStraight = true;
                straightHighCard = 5; // Ace-low straight is a 5-high straight
            }
        }

        let rank = 2;
        let score = numericalRanks.reduce((acc, r, i) => acc + r * Math.pow(14, 4 - i), 0);

        if (isStraight && isFlush) { 
            rank = 10; 
            score = straightHighCard; // Simple score for straight/royal flush
        }
        else if (rankCounts[0] === 4) {
            rank = 9;
            const quadRank = numericalRanks.find(r => counts[r] === 4);
            const kicker = numericalRanks.find(r => counts[r] === 1);
            score = quadRank * Math.pow(14, 2) + kicker;
        }
        else if (rankCounts[0] === 3 && rankCounts[1] === 2) {
            rank = 8;
            const tripRank = numericalRanks.find(r => counts[r] === 3);
            const pairRank = numericalRanks.find(r => counts[r] === 2);
            score = tripRank * Math.pow(14, 2) + pairRank;
        }
        else if (isFlush) { rank = 7; }
        else if (isStraight) { 
            rank = 6;
            score = straightHighCard; // Simple score for straight
        }
        else if (rankCounts[0] === 3) {
            rank = 5;
            const tripRank = numericalRanks.find(r => counts[r] === 3);
            score = tripRank * Math.pow(14, 3) + numericalRanks.filter(r => counts[r] === 1).reduce((acc, r, i) => acc + r * Math.pow(14, 1 - i), 0);
        }
        else if (rankCounts[0] === 2 && rankCounts[1] === 2) {
            rank = 4;
            const pairs = Object.entries(counts).filter(([, count]) => count === 2).map(([r]) => parseInt(r)).sort((a, b) => b - a);
            const kicker = numericalRanks.find(r => counts[r] === 1);
            score = pairs[0] * Math.pow(14, 3) + pairs[1] * Math.pow(14, 2) + kicker;
        }
        else if (rankCounts[0] === 2) {
            rank = 3;
            const pairRank = numericalRanks.find(r => counts[r] === 2);
            score = pairRank * Math.pow(14, 4) + numericalRanks.filter(r => counts[r] === 1).reduce((acc, r, i) => acc + r * Math.pow(14, 2 - i), 0);
        }

        return { rank, score };
    }

    function evalHandInternal(hand7) {
        const combinations = get5CardCombinations(hand7);
        let bestResult = { rank: 0, score: 0 };

        for (const hand5 of combinations) {
            const currentResult = evaluate5CardHand(hand5);

            if (currentResult.rank > bestResult.rank ||
                (currentResult.rank === bestResult.rank && currentResult.score > bestResult.score)) {
                bestResult = currentResult;
            }
        }

        return {
            handRank: bestResult.rank,
            handName: HAND_NAMES[bestResult.rank] || 'N/A',
            handScore: bestResult.score
        };
    }

    // --- UI/EVENT HANDLERS ---
    
    const renderPlayerPanels = () => {
        playersContainer.innerHTML = ''; // Clear existing players
        const playerIds = Object.keys(selections.players).map(Number).sort((a, b) => a - b);
        
        playerIds.forEach(id => {
            const config = PLAYER_CONFIG[id];
            const panel = playerTemplate.content.cloneNode(true).querySelector('.player-panel');
            
            // --- NEW: Apply the Positional CSS Class ---
            panel.classList.add(`pos-${id}`);
            
            // Update attributes and content
            panel.dataset.playerId = id;
            panel.querySelector('.player-name-color').textContent = config.name;
            panel.querySelector('.player-name-color').classList.add(config.colorClass);

            const cardContainers = panel.querySelectorAll('.card-selector-container');
            cardContainers.forEach(container => {
                // Set data-player attribute used for event delegation
                container.dataset.player = id;
            });
            
            playersContainer.appendChild(panel);
        });
        
        renderAllSelectors();
    };

    const createCardSelectorHTML = (playerKey, cardIndex) => {
        const stateKey = playerKey === 'board' ? selections.board : selections.players[playerKey];
        const selection = stateKey[cardIndex];

        const rank = selection ? selection[0] : '-';
        const suit = selection ? selection[1] : '-';
        const suitSymbol = SUITS[suit] || '-';
        const suitClass = SUIT_CLASSES[suit] || '';
        const isSelected = !!selection;

        let itemsHTML = '';
        for (const r of RANKS) {
            for (const s of Object.keys(SUITS)) {
                const card = r + s;
                const isDisabled = usedCards.has(card) && card !== selection;
                itemsHTML += `
                            <div class="dropdown-item p-2 text-center text-lg ${isDisabled ? 'disabled' : ''}" data-card="${card}" data-player="${playerKey}" data-card-index="${cardIndex}">
                                <span class="${SUIT_CLASSES[s]}">${r}${SUITS[s]}</span>
                            </div>
                        `;
            }
        }

        const clearButton = isSelected ?
            `<div class="col-span-4 dropdown-item p-1 text-center text-sm text-gray-400 bg-gray-800 hover:bg-gray-700" data-card="" data-player="${playerKey}" data-card-index="${cardIndex}">Clear Card</div>` : '';

        return `
                    <div class="relative">
                        <div class="card-selector ${isSelected ? 'selected' : ''} rounded-lg w-20 h-28 flex flex-col justify-center items-center cursor-pointer transform hover:scale-105 transition-transform" role="button" aria-expanded="false">
                            <span class="text-4xl font-bold ${suitClass}">${rank}</span>
                            <span class="text-2xl ${suitClass}">${suitSymbol}</span>
                        </div>
                        <div class="dropdown-menu rounded-md mt-1 w-64 right-1/2 translate-x-1/2 md:w-72">
                            ${clearButton}
                            ${itemsHTML}
                        </div>
                    </div>
                `;
    };

    const renderAllSelectors = () => {
        document.querySelectorAll('.card-selector-container').forEach(container => {
            const playerKey = container.dataset.player;
            const cardIndex = parseInt(container.dataset.cardIndex, 10);

            container.innerHTML = createCardSelectorHTML(playerKey, cardIndex);
            
            // Clear result and winner highlighting on any card change
            const playerId = playerKey === 'board' ? null : parseInt(playerKey, 10);
            if (playerId) {
                const resultDiv = document.querySelector(`.player-panel[data-player-id="${playerId}"] .player-result`);
                if (resultDiv) resultDiv.textContent = '';
                const panel = document.querySelector(`.player-panel[data-player-id="${playerId}"]`);
                if (panel) {
                    Object.values(PLAYER_CONFIG).forEach(conf => panel.classList.remove(conf.winnerClass));
                    panel.classList.remove('winner-tie');
                }
            }
        });
        
        winnerDisplay.textContent = '';
        winnerDisplay.className = 'text-2xl md:text-3xl font-bold h-10 mb-4 transition-all';
        updateButtonStates();
    };

    const handleCardSelection = (playerKey, cardIndex, card) => {
        let oldSelection;
        if (playerKey === 'board') {
            oldSelection = selections.board[cardIndex];
            selections.board[cardIndex] = card;
        } else {
            const playerId = parseInt(playerKey, 10);
            oldSelection = selections.players[playerId][cardIndex];
            selections.players[playerId][cardIndex] = card;
        }

        if (oldSelection) { usedCards.delete(oldSelection); }
        if (card) { usedCards.add(card); }

        closeAllDropdowns();
        renderAllSelectors();

        // Auto-evaluate if all required cards are selected
        const numPlayers = Object.keys(selections.players).length;
        const requiredCards = (numPlayers * 2) + 5;
        if (usedCards.size === requiredCards) {
            evaluateHands();
        }
    };

    const updateButtonStates = () => {
        const numPlayers = Object.keys(selections.players).length;
        const requiredCards = (numPlayers * 2) + 5;
        const allHoleCardsSelected = Object.values(selections.players).every(hand => hand.every(c => c !== null));
        const allBoardCardsSelected = selections.board.every(c => c !== null);
        
        // Evaluate button enabled only when all required cards are selected and unique.
        evaluateBtn.disabled = !(usedCards.size === requiredCards && allHoleCardsSelected && allBoardCardsSelected);
        
        // Add Player button enabled if fewer than MAX_PLAYERS are present AND there are enough unused cards (52 - 5 board - current hole cards > 2)
        const totalUsed = usedCards.size;
        addPlayerBtn.disabled = numPlayers >= MAX_PLAYERS || (totalUsed + 2 > 52);

        // Remove Player button enabled if more than 2 players exist
        removePlayerBtn.disabled = numPlayers <= 2;
    };

    const addPlayer = () => {
        const numPlayers = Object.keys(selections.players).length;
        if (numPlayers >= MAX_PLAYERS) return;

        const nextPlayerId = numPlayers + 1;
        
        // Check if there are enough cards left (52 - current used < 2)
        if (usedCards.size + 2 > 52) {
             alert(`Cannot add Player ${nextPlayerId}. Not enough unique cards left in the deck!`);
             return;
        }

        selections.players[nextPlayerId] = [null, null];
        renderPlayerPanels();
    };

    const removePlayer = () => {
        const playerIds = Object.keys(selections.players).map(Number).sort((a, b) => b - a);
        const lastPlayerId = playerIds[0];

        if (lastPlayerId <= 2) return; 

        // Remove cards from usedCards set
        selections.players[lastPlayerId].forEach(card => {
            if (card) usedCards.delete(card);
        });

        // Remove player from state
        delete selections.players[lastPlayerId];
        
        renderPlayerPanels();
    };

    const resetGame = () => {
        selections = {
            board: [null, null, null, null, null],
            players: { 1: [null, null], 2: [null, null] } // Reset to 2 players
        };
        usedCards.clear();
        renderPlayerPanels(); // Re-render the initial two players
        winnerDisplay.textContent = '';
        updateButtonStates();
    };
    
    /**
     * Evaluates all hands and displays the winner(s).
     */
    const evaluateHands = () => {
        if (evaluateBtn.disabled) return;
        
        let results = [];
        const playerIds = Object.keys(selections.players).map(Number);
        const boardCards = selections.board;

        // 1. Evaluate all hands
        playerIds.forEach(id => {
            const holeCards = selections.players[id];
            const hand7 = [...holeCards, ...boardCards];
            const result = evalHandInternal(hand7);
            
            results.push({ id, ...result });
            
            // Display result name on panel
            const panel = document.querySelector(`.player-panel[data-player-id="${id}"]`);
            if (panel) {
                panel.querySelector('.player-result').textContent = result.handName;
            }
        });

        // 2. Find the best hand(s)
        let bestRank = 0;
        let bestScore = 0;
        
        results.forEach(res => {
            if (res.handRank > bestRank) {
                bestRank = res.handRank;
                bestScore = res.handScore;
            } else if (res.handRank === bestRank && res.handScore > bestScore) {
                bestScore = res.handScore;
            }
        });

        // 3. Determine winners and handle ties
        const winners = results.filter(res => res.handRank === bestRank && res.handScore === bestScore);
        
        // Clear all previous winner classes
        document.querySelectorAll('.player-panel').forEach(panel => {
            Object.values(PLAYER_CONFIG).forEach(conf => panel.classList.remove(conf.winnerClass));
            panel.classList.remove('winner-tie');
        });

        if (winners.length === 1) {
            const winnerId = winners[0].id;
            const winnerName = PLAYER_CONFIG[winnerId].name;
            winnerDisplay.textContent = `${winnerName} Wins with ${HAND_NAMES[bestRank]}!`;
            winnerDisplay.className = `text-2xl md:text-3xl font-bold h-10 mb-4 transition-all ${PLAYER_CONFIG[winnerId].colorClass}`;
            
            // Highlight panel
            document.querySelector(`.player-panel[data-player-id="${winnerId}"]`).classList.add(PLAYER_CONFIG[winnerId].winnerClass);

        } else if (winners.length > 1) {
            const winnerNames = winners.map(w => PLAYER_CONFIG[w.id].name);
            winnerDisplay.textContent = `It's a Tie (Split Pot!) between ${winnerNames.join(', ')}!`;
            winnerDisplay.className = 'text-2xl md:text-3xl font-bold h-10 mb-4 transition-all text-blue-400';
            
            // Highlight tied panels
            winners.forEach(w => {
                document.querySelector(`.player-panel[data-player-id="${w.id}"]`).classList.add('winner-tie');
            });
        } else {
             winnerDisplay.textContent = 'No Hands Found (Should not happen)';
        }
    };
    
    // Helper functions for dropdown/event handling
    const toggleDropdown = (selector) => {
        const container = selector.closest('.relative');
        if (!container) return;
        const menu = container.querySelector('.dropdown-menu');
        if (!menu) return;
        const isOpening = !menu.classList.contains('show');
        closeAllDropdowns();
        if (isOpening) {
            menu.classList.add('show');
            openDropdown = menu;
            selector.setAttribute('aria-expanded', 'true');
        } else {
            selector.setAttribute('aria-expanded', 'false');
        }
    };

    const closeAllDropdowns = () => {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
            const selector = menu.previousElementSibling;
            if (selector) selector.setAttribute('aria-expanded', 'false');
        });
        openDropdown = null;
    };

    // --- EVENT LISTENERS ---

    document.body.addEventListener('click', (e) => {
        const selector = e.target.closest('.card-selector');
        const dropdownItem = e.target.closest('.dropdown-item');

        if (dropdownItem) {
            const { player, cardIndex, card } = dropdownItem.dataset;
            if (dropdownItem.classList.contains('disabled')) return;
            
            const cardValue = card || null;
            handleCardSelection(player, parseInt(cardIndex, 10), cardValue);
            return;
        }

        if (selector) {
            toggleDropdown(selector);
        } else if (!e.target.closest('.dropdown-menu')) {
            closeAllDropdowns();
        }
    });

    evaluateBtn.addEventListener('click', evaluateHands);
    resetBtn.addEventListener('click', resetGame);
    addPlayerBtn.addEventListener('click', addPlayer);
    removePlayerBtn.addEventListener('click', removePlayer);

    // --- INITIALIZATION ---
    renderPlayerPanels();
});