window.addEventListener('load', () => {
    // --- CONSTANTS & STATE ---
    // Note: Cards are represented as 'Ranks' + 'Suits' (e.g., 'As', 'Kh')
    const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const SUITS = { s: '♠', h: '♥', d: '♦', c: '♣' };
    const SUIT_CLASSES = { s: 'suit-s', h: 'suit-h', d: 'suit-d', c: 'suit-c' };

    // Internal numerical ranks for evaluation (A=14, K=13, ..., 2=2)
    const CARD_RANKS_MAP = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

    // Hand Names, mapped to the Hand Rank score (10 = Royal/Straight Flush, 1 = High Card)
    const HAND_NAMES = {
        10: 'Royal Flush / Straight Flush', 9: 'Four of a Kind', 8: 'Full House', 7: 'Flush',
        6: 'Straight', 5: 'Three of a Kind', 4: 'Two Pair', 3: 'One Pair', 2: 'High Card'
    };

    // The single source of truth for all selections
    let selections = {
        player1: [null, null],
        player2: [null, null],
        board: [null, null, null, null, null]
    };

    let usedCards = new Set();
    let openDropdown = null;

    // --- DOM ELEMENTS ---
    const cardSelectorContainers = document.querySelectorAll('.card-selector-container');
    const evaluateBtn = document.getElementById('evaluate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const winnerDisplay = document.getElementById('winner-display');
    const player1Result = document.getElementById('player1-result');
    const player2Result = document.getElementById('player2-result');
    const player1Panel = document.getElementById('player1-panel');
    const player2Panel = document.getElementById('player2-panel');


    // --- POKER EVALUATION LOGIC (Self-Contained) ---

    /**
     * Generates all 5-card combinations from a 7-card array (Texas Hold'em).
     * @param {string[]} cards7 - Array of 7 card strings (e.g., ['As', 'Kh', ...])
     * @returns {string[][]} Array of 21 5-card combinations.
     */
    function get5CardCombinations(cards7) {
        const result = [];
        for (let i = 0; i < 7; i++) {
            for (let j = i + 1; j < 7; j++) {
                // Omit cards at index i and j to form the 5-card hand
                const combo = cards7.filter((_, idx) => idx !== i && idx !== j);
                result.push(combo);
            }
        }
        return result;
    }

    /**
     * Evaluates a single 5-card hand and returns its rank and tie-breaker score.
     * This function relies on rank counting and sequential checks.
     * @param {string[]} hand5 - Array of 5 card strings
     * @returns {{rank: number, score: number}}
     */
    function evaluate5CardHand(hand5) {
        const numericalRanks = hand5.map(c => CARD_RANKS_MAP[c[0]]).sort((a, b) => b - a);
        const suits = hand5.map(c => c[1]);

        // 1. Rank Counts
        const counts = {};
        numericalRanks.forEach(r => counts[r] = (counts[r] || 0) + 1);
        // Get the frequency of the counts (e.g., [4, 1] for quads, [3, 2] for FH)
        const rankCounts = Object.values(counts).sort((a, b) => b - a);

        // 2. Flush Check
        const isFlush = new Set(suits).size === 1;

        // 3. Straight Check
        let isStraight = false;
        const uniqueRanks = [...new Set(numericalRanks)];
        if (uniqueRanks.length >= 5) {
            // Check standard straight (e.g., 9, 8, 7, 6, 5)
            if (uniqueRanks[0] - uniqueRanks[4] === 4) {
                isStraight = true;
            }
            // Check Ace-low straight (A, 5, 4, 3, 2)
            // Ranks will be [14, 5, 4, 3, 2] after sorting
            else if (uniqueRanks[0] === 14 && uniqueRanks.slice(1).join(',') === '5,4,3,2') {
                isStraight = true;
                // For scoring purposes, treat the A-5 straight as high card 5
                numericalRanks[0] = 5;
            }
        }

        let rank = 2; // Default to High Card (2 in the ranking scheme)
        let score = numericalRanks.reduce((acc, r, i) => acc + r * Math.pow(14, 4 - i), 0); // Positional tie-breaker score

        // High-to-Low Ranking (10 to 2)

        // 10. Straight Flush
        if (isStraight && isFlush) { rank = 10; }

        // 9. Four of a Kind (e.g., [4, 1])
        else if (rankCounts[0] === 4) {
            rank = 9;
            const quadRank = numericalRanks.find(r => counts[r] === 4);
            const kicker = numericalRanks.find(r => counts[r] === 1);
            score = quadRank * Math.pow(14, 2) + kicker;
        }

        // 8. Full House (e.g., [3, 2])
        else if (rankCounts[0] === 3 && rankCounts[1] === 2) {
            rank = 8;
            const tripRank = numericalRanks.find(r => counts[r] === 3);
            const pairRank = numericalRanks.find(r => counts[r] === 2);
            score = tripRank * Math.pow(14, 2) + pairRank;
        }

        // 7. Flush
        else if (isFlush) { rank = 7; } // Positional score handles tie-break

        // 6. Straight
        else if (isStraight) { rank = 6; } // Score already adjusted for A-5

        // 5. Three of a Kind (e.g., [3, 1, 1])
        else if (rankCounts[0] === 3) {
            rank = 5;
            const tripRank = numericalRanks.find(r => counts[r] === 3);
            score = tripRank * Math.pow(14, 3) + numericalRanks.filter(r => counts[r] === 1).reduce((acc, r, i) => acc + r * Math.pow(14, 1 - i), 0);
        }

        // 4. Two Pair (e.g., [2, 2, 1])
        else if (rankCounts[0] === 2 && rankCounts[1] === 2) {
            rank = 4;
            const pairs = Object.entries(counts).filter(([, count]) => count === 2).map(([r]) => parseInt(r)).sort((a, b) => b - a);
            const kicker = numericalRanks.find(r => counts[r] === 1);
            score = pairs[0] * Math.pow(14, 3) + pairs[1] * Math.pow(14, 2) + kicker;
        }

        // 3. One Pair (e.g., [2, 1, 1, 1])
        else if (rankCounts[0] === 2) {
            rank = 3;
            const pairRank = numericalRanks.find(r => counts[r] === 2);
            score = pairRank * Math.pow(14, 4) + numericalRanks.filter(r => counts[r] === 1).reduce((acc, r, i) => acc + r * Math.pow(14, 2 - i), 0);
        }

        // 2. High Card (Rank 2) - Already handled by default positional score.

        return { rank, score };
    }

    /**
     * Main evaluation function for a 7-card Hold'em hand.
     * @param {string[]} hand7 - Array of 7 card strings.
     * @returns {{handRank: number, handName: string, handScore: number}}
     */
    function evalHandInternal(hand7) {
        const combinations = get5CardCombinations(hand7);
        let bestResult = { rank: 0, score: 0 }; // Initialize below High Card

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
            handScore: bestResult.score // Used for tie-breaking
        };
    }

    // --- UI/EVENT HANDLERS ---

    /**
     * Generates the HTML for a single card selector dropdown.
     */
    const createCardSelectorHTML = (playerKey, cardIndex) => {
        const playerStateKey = playerKey === 'board' ? 'board' : `player${playerKey}`;
        const selection = selections[playerStateKey][cardIndex];

        const rank = selection ? selection[0] : '-';
        const suit = selection ? selection[1] : '-';
        const suitSymbol = SUITS[suit] || '-';
        const suitClass = SUIT_CLASSES[suit] || '';
        const isSelected = !!selection;

        let itemsHTML = '';
        // The full deck of 52 cards
        for (const r of RANKS) {
            for (const s of Object.keys(SUITS)) {
                const card = r + s; // e.g., 'As', 'Kh'
                // Disable card if it's already used AND it's not the currently selected card being rendered
                const isDisabled = usedCards.has(card) && card !== selection;
                itemsHTML += `
                            <div class="dropdown-item p-2 text-center text-lg ${isDisabled ? 'disabled' : ''}" data-card="${card}" data-player="${playerKey}" data-card-index="${cardIndex}">
                                <span class="${SUIT_CLASSES[s]}">${r}${SUITS[s]}</span>
                            </div>
                        `;
            }
        }

        // Add a "Clear Card" button for deselection if a card is currently selected
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
        cardSelectorContainers.forEach(container => {
            const playerKey = container.dataset.player;
            const cardIndex = parseInt(container.dataset.cardIndex, 10);

            container.innerHTML = createCardSelectorHTML(playerKey, cardIndex);
        });
        updateEvaluateButtonState();
    };

    const handleCardSelection = (playerKey, cardIndex, card) => {
        const playerStateKey = playerKey === 'board' ? 'board' : `player${playerKey}`;
        const oldSelection = selections[playerStateKey][cardIndex];

        if (oldSelection) { usedCards.delete(oldSelection); }

        if (card) {
            usedCards.add(card);
            selections[playerStateKey][cardIndex] = card;
        } else {
            selections[playerStateKey][cardIndex] = null;
        }

        // Clear previous results and winner highlighting
        winnerDisplay.textContent = '';
        winnerDisplay.className = 'text-2xl md:text-3xl font-bold h-10 mb-4 transition-all';
        player1Result.textContent = '';
        player2Result.textContent = '';
        player1Panel.classList.remove('winner-p1', 'winner-p2', 'winner-tie');
        player2Panel.classList.remove('winner-p1', 'winner-p2', 'winner-tie');

        closeAllDropdowns();
        renderAllSelectors();

        // Auto-evaluate if all required cards (9 total) are selected
        if (usedCards.size === 9) {
            evaluateHands();
        }
    };

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

    const updateEvaluateButtonState = () => {
        // Button is enabled only when exactly 9 unique cards are selected (2 P1, 2 P2, 5 Board)
        evaluateBtn.disabled = usedCards.size !== 9;
    };

    const resetGame = () => {
        selections = {
            player1: [null, null],
            player2: [null, null],
            board: [null, null, null, null, null]
        };
        usedCards.clear();
        winnerDisplay.textContent = '';
        player1Result.textContent = '';
        player2Result.textContent = '';
        // Reset panel classes
        player1Panel.className = 'w-full max-w-xs md:max-w-sm text-center p-4 rounded-xl border-2 border-transparent transition-all duration-500';
        player2Panel.className = 'w-full max-w-xs md:max-w-sm text-center p-4 rounded-xl border-2 border-transparent transition-all duration-500';
        renderAllSelectors();
    };

    /**
     * Evaluates the hands and displays the winner.
     */
    const evaluateHands = () => {
        if (usedCards.size !== 9) return;

        // The evaluation function requires an array of 7 cards (2 hole + 5 community)
        const p1Hand = [...selections.player1, ...selections.board];
        const p2Hand = [...selections.player2, ...selections.board];

        const p1ResultObj = evalHandInternal(p1Hand);
        const p2ResultObj = evalHandInternal(p2Hand);

        player1Result.textContent = p1ResultObj.handName;
        player2Result.textContent = p2ResultObj.handName;

        // Reset winner classes
        player1Panel.classList.remove('winner-p1', 'winner-p2', 'winner-tie');
        player2Panel.classList.remove('winner-p1', 'winner-p2', 'winner-tie');

        // Hand Rank comparison is primary, Hand Score (tie-breaker) is secondary
        if (p1ResultObj.handRank > p2ResultObj.handRank ||
            (p1ResultObj.handRank === p2ResultObj.handRank && p1ResultObj.handScore > p2ResultObj.handScore)) {

            winnerDisplay.textContent = 'Player 1 Wins!';
            winnerDisplay.className = 'text-2xl md:text-3xl font-bold h-10 mb-4 transition-all text-green-400';
            player1Panel.classList.add('winner-p1');

        } else if (p2ResultObj.handRank > p1ResultObj.handRank ||
            (p1ResultObj.handRank === p2ResultObj.handRank && p2ResultObj.handScore > p1ResultObj.handScore)) {

            winnerDisplay.textContent = 'Player 2 Wins!';
            winnerDisplay.className = 'text-2xl md:text-3xl font-bold h-10 mb-4 transition-all text-red-400';
            player2Panel.classList.add('winner-p2');

        } else {
            // Final tie
            winnerDisplay.textContent = "It's a Tie (Split Pot)!";
            winnerDisplay.className = 'text-2xl md:text-3xl font-bold h-10 mb-4 transition-all text-blue-400';
            player1Panel.classList.add('winner-tie');
            player2Panel.classList.add('winner-tie');
        }
    };

    // --- EVENT LISTENERS ---

    // Event delegation for all interactions
    document.body.addEventListener('click', (e) => {
        const selector = e.target.closest('.card-selector');
        const dropdownItem = e.target.closest('.dropdown-item');

        if (dropdownItem) {
            const { player, cardIndex, card } = dropdownItem.dataset;

            if (dropdownItem.classList.contains('disabled')) {
                return;
            }

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

    // --- INITIALIZATION ---
    renderAllSelectors();
});