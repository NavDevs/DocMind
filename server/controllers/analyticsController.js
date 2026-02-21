const Analytics = require('../models/Analytics');
const Document = require('../models/Document');
const Chat = require('../models/Chat');

// GET /api/analytics/dashboard
const getDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const [totalUploads, totalQueries, totalSummaries] = await Promise.all([
            Analytics.countDocuments({ userId, event: 'upload' }),
            Analytics.countDocuments({ userId, event: 'query' }),
            Analytics.countDocuments({ userId, event: 'summary' }),
        ]);

        const tokensResult = await Analytics.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
        ]);
        const totalTokens = tokensResult[0]?.total || 0;

        const avgResponseResult = await Analytics.aggregate([
            { $match: { userId, event: 'query' } },
            { $group: { _id: null, avg: { $avg: '$responseTimeMs' } } },
        ]);
        const avgResponseMs = Math.round(avgResponseResult[0]?.avg || 0);

        const totalDocuments = await Document.countDocuments({ userId });
        const latestDocs = await Document.find({ userId }).sort({ uploadedAt: -1 }).limit(5).select('originalName status uploadedAt');

        res.json({
            success: true,
            stats: {
                totalDocuments,
                totalUploads,
                totalQueries,
                totalTokens,
                avgResponseMs,
            },
            recentDocuments: latestDocs,
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/analytics/usage/daily
const getDailyUsage = async (req, res, next) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const daily = await Analytics.aggregate([
            {
                $match: {
                    userId: req.user._id,
                    event: 'query',
                    timestamp: { $gte: thirtyDaysAgo },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                    count: { $sum: 1 },
                    tokens: { $sum: '$tokensUsed' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json({ success: true, daily });
    } catch (err) {
        next(err);
    }
};

module.exports = { getDashboard, getDailyUsage };
