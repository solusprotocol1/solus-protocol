// S4 Ledger — session-init
// Extracted from monolith lines 1940-1947
// 6 lines

// Auto-enter platform if user has already clicked "Enter Platform" this session
if (sessionStorage.getItem('s4_entered') === '1') {
    document.getElementById('platformLanding').style.display = 'none';
    document.querySelector('.hero').style.display = 'none';
    document.getElementById('platformWorkspace').style.display = 'block';
}
