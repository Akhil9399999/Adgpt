import express from 'express';

const router = express.Router();

// In a real app, this would query Firebase/DB
// For now, returns mock stats structure that frontend uses with Firebase data
router.get('/stats', (req, res) => {
    res.json({
        message: 'Use Firebase directly for real-time admin stats',
        note: 'Frontend reads from Firebase Firestore for live data'
    });
});

export default router;