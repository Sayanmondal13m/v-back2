import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Visitor schema and model
const visitorSchema = new mongoose.Schema({
    ip: String,
    fingerprint: String,
    userAgent: String,
    visitCount: { type: Number, default: 1 },
    lastVisit: { type: Date, default: Date.now },
});
const Visitor = mongoose.model('Visitor', visitorSchema);

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: '*' })); // Allow all origins

// Helper to generate a fingerprint
function generateFingerprint(ip, userAgent) {
    return crypto.createHash('sha256').update(ip + userAgent).digest('hex');
}

// Route: Track a visitor
app.post('/track-visitor', async (req, res) => {
    const { ip, userAgent } = req.body;
    const fingerprint = generateFingerprint(ip, userAgent);

    try {
        let visitor = await Visitor.findOne({ fingerprint });

        if (visitor) {
            const now = new Date();
            const oneDay = 24 * 60 * 60 * 1000; // 24 hours
            if (now - visitor.lastVisit >= oneDay) {
                visitor.visitCount++;
                visitor.lastVisit = now;
                await visitor.save();
            }
        } else {
            visitor = new Visitor({ ip, fingerprint, userAgent });
            await visitor.save();
        }

        const totalCount = await Visitor.countDocuments();
        res.status(200).json({ message: 'Visitor tracked successfully!', count: totalCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error tracking visitor' });
    }
});

// Route: Get visitor count
app.get('/visitor-count', async (req, res) => {
    try {
        const totalCount = await Visitor.countDocuments();
        res.status(200).json({ count: totalCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching visitor count' });
    }
});

// Route: Manually increase visitor count
app.post('/increase-visitors', async (req, res) => {
    const { amount } = req.body;

    try {
        for (let i = 0; i < amount; i++) {
            const now = new Date();
            const fakeVisitor = {
                ip: `127.0.0.${i}`, // Unique placeholder IPs
                fingerprint: `manual-${now.getTime()}-${i}`, // Unique fingerprint
                userAgent: 'Manual Increment',
                lastVisit: now,
            };
            const visitor = new Visitor(fakeVisitor);
            await visitor.save();
        }

        const totalCount = await Visitor.countDocuments();
        res.status(200).json({ message: `Manually added ${amount} visitors`, count: totalCount });
    } catch (error) {
        console.error('Error manually adding visitors:', error);
        res.status(500).json({ message: 'Failed to manually add visitors' });
    }
});

// Route: Fetch all visitor data (Admin)
app.get('/visitor-data', async (req, res) => {
    try {
        const visitors = await Visitor.find();
        res.status(200).json(visitors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching visitor data' });
    }
});

// Automatically increment visitor count every minute and save to MongoDB
setInterval(async () => {
    const now = new Date();

    // Simulate a visitor with a placeholder IP and user agent
    const fakeVisitor = {
        ip: '127.0.0.1', // Placeholder IP
        fingerprint: `auto-${now.getTime()}`, // Unique identifier for auto-generated visitors
        userAgent: 'System Auto Increment',
        lastVisit: now,
    };

    try {
        const visitor = new Visitor(fakeVisitor);
        await visitor.save();
        console.log('Auto-increment visitor added to MongoDB');
    } catch (error) {
        console.error('Error adding auto-increment visitor:', error);
    }
}, 60000); // Every 1 minute

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export app for Vercel
export default app;