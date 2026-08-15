"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSession = exports.recallToken = exports.updateTokenStatus = exports.callNext = exports.createToken = exports.getStats = exports.getCurrentToken = exports.getTokens = exports.setIoInstance = void 0;
const Token_js_1 = require("../models/Token.js");
const Session_js_1 = require("../models/Session.js");
const supabase_js_1 = require("../services/supabase.js");
let ioInstance = null;
const setIoInstance = (io) => {
    ioInstance = io;
};
exports.setIoInstance = setIoInstance;
const notifyQueueUpdate = async () => {
    if (!ioInstance)
        return;
    try {
        const stats = await getStatsData();
        const currentData = await getCurrentData();
        ioInstance.emit('queue:updated', stats);
        ioInstance.emit('smartboard:updated', currentData);
    }
    catch (err) {
        console.error('Error broadcasting socket updates:', err);
    }
};
const getActiveSessionId = async () => {
    let activeSession = await Session_js_1.Session.findOne({ isActive: true });
    if (!activeSession) {
        activeSession = await Session_js_1.Session.create({
            sessionId: 'orientation-2026',
            title: 'Mirai Orientation 2026',
            date: '2026-08-18',
            isActive: true,
        });
    }
    return activeSession.sessionId;
};
const getCurrentData = async () => {
    const sessionId = await getActiveSessionId();
    // Active / Called tokens (up to 12)
    const activeTokens = await Token_js_1.Token.find({
        sessionId,
        status: { $in: ['CALLED', 'PROCESSING'] },
    })
        .sort({ calledAt: -1, updatedAt: -1 })
        .limit(12);
    // Next waiting tokens (up to 12)
    const waitingTokens = await Token_js_1.Token.find({
        sessionId,
        status: 'WAITING',
    })
        .sort({ tokenNumber: 1 })
        .limit(12);
    const waitingCount = await Token_js_1.Token.countDocuments({
        sessionId,
        status: 'WAITING',
    });
    return {
        currentToken: activeTokens[0] || null,
        activeTokens,
        waitingTokens,
        nextTokens: waitingTokens.slice(0, 3).map((t) => t.token),
        waitingCount,
    };
};
const getStatsData = async () => {
    const sessionId = await getActiveSessionId();
    const total = await Token_js_1.Token.countDocuments({ sessionId });
    const waiting = await Token_js_1.Token.countDocuments({ sessionId, status: 'WAITING' });
    const processing = await Token_js_1.Token.countDocuments({
        sessionId,
        status: { $in: ['CALLED', 'PROCESSING'] },
    });
    const onHold = await Token_js_1.Token.countDocuments({ sessionId, status: 'ON_HOLD' });
    const completed = await Token_js_1.Token.countDocuments({ sessionId, status: 'COMPLETED' });
    const skipped = await Token_js_1.Token.countDocuments({ sessionId, status: 'SKIPPED' });
    // Get active per table count
    const activeTokens = await Token_js_1.Token.find({
        sessionId,
        status: { $in: ['CALLED', 'PROCESSING'] },
    });
    const tableMap = { 1: [], 2: [], 3: [], 4: [] };
    activeTokens.forEach((t) => {
        if (t.tableNumber) {
            if (!tableMap[t.tableNumber])
                tableMap[t.tableNumber] = [];
            tableMap[t.tableNumber].push(t);
        }
    });
    return {
        total,
        waiting,
        processing,
        onHold,
        completed,
        skipped,
        tables: tableMap,
    };
};
// 1. Get Tokens List (with search & status filter)
const getTokens = async (req, res) => {
    try {
        const sessionId = await getActiveSessionId();
        const { search, status } = req.query;
        const query = { sessionId };
        if (status && typeof status === 'string' && status !== 'ALL') {
            query.status = status;
        }
        if (search && typeof search === 'string' && search.trim()) {
            const s = search.trim();
            query.$or = [
                { token: { $regex: s, $options: 'i' } },
                { studentName: { $regex: s, $options: 'i' } },
                { mobile: { $regex: s, $options: 'i' } },
            ];
        }
        const tokens = await Token_js_1.Token.find(query).sort({ tokenNumber: 1 });
        return res.json({ success: true, tokens });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTokens = getTokens;
// 2. Get Current Smartboard Data
const getCurrentToken = async (_req, res) => {
    try {
        const data = await getCurrentData();
        return res.json({ success: true, ...data });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCurrentToken = getCurrentToken;
// 3. Get Queue Statistics
const getStats = async (_req, res) => {
    try {
        const stats = await getStatsData();
        return res.json({ success: true, stats });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getStats = getStats;
// 4. Register Student & Generate Token
const createToken = async (req, res) => {
    try {
        const { studentName, mobile, course, allowDuplicate } = req.body;
        if (!studentName || !studentName.trim()) {
            return res.status(400).json({ success: false, message: 'Student Name is required' });
        }
        // Validate 10 digit Indian Mobile Number
        const cleanedMobile = String(mobile || '').replace(/\D/g, '');
        if (cleanedMobile.length !== 10) {
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number. Please enter a valid 10-digit mobile number.',
            });
        }
        const sessionId = await getActiveSessionId();
        // Check duplicate mobile unless explicit override
        if (!allowDuplicate) {
            const existing = await Token_js_1.Token.findOne({ sessionId, mobile: cleanedMobile });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    isDuplicate: true,
                    message: `Mobile number ${cleanedMobile} is already registered with Token ${existing.token}.`,
                    existingToken: existing.token,
                });
            }
        }
        // Generate next token number
        const lastToken = await Token_js_1.Token.findOne({ sessionId }).sort({ tokenNumber: -1 });
        const nextNumber = lastToken ? lastToken.tokenNumber + 1 : 1;
        const tokenFormatted = `A-${String(nextNumber).padStart(3, '0')}`;
        const newToken = await Token_js_1.Token.create({
            token: tokenFormatted,
            tokenNumber: nextNumber,
            studentName: studentName.trim(),
            mobile: cleanedMobile,
            course: course ? course.trim() : 'General',
            status: 'WAITING',
            sessionId,
        });
        if (ioInstance) {
            ioInstance.emit('token:created', newToken);
        }
        await notifyQueueUpdate();
        (0, supabase_js_1.syncTokenToSupabase)(newToken);
        return res.status(201).json({
            success: true,
            message: 'Token generated successfully',
            token: newToken,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.createToken = createToken;
// 5. Call Next Token for a Table
const callNext = async (req, res) => {
    try {
        const { tableNumber } = req.body;
        const tableNum = Number(tableNumber) || 1;
        const sessionId = await getActiveSessionId();
        // CAPACITY CHECK: Max 2 active students per table
        const tableActiveCount = await Token_js_1.Token.countDocuments({
            sessionId,
            tableNumber: tableNum,
            status: { $in: ['CALLED', 'PROCESSING'] },
        });
        if (tableActiveCount >= 2) {
            return res.status(400).json({
                success: false,
                message: `TABLE ${tableNum} IS FULL! Table ${tableNum} already has ${tableActiveCount} active students. Please complete or skip a student first.`,
            });
        }
        // Find next waiting token
        const nextToken = await Token_js_1.Token.findOne({
            sessionId,
            status: 'WAITING',
        }).sort({ tokenNumber: 1 });
        if (!nextToken) {
            return res.status(400).json({
                success: false,
                message: 'No students waiting in queue.',
            });
        }
        nextToken.status = 'CALLED';
        nextToken.tableNumber = tableNum;
        nextToken.calledAt = new Date();
        await nextToken.save();
        if (ioInstance) {
            ioInstance.emit('token:updated', { token: nextToken, action: 'CALLED' });
            ioInstance.emit('token:called', { token: nextToken });
        }
        await notifyQueueUpdate();
        (0, supabase_js_1.syncTokenToSupabase)(nextToken);
        return res.json({
            success: true,
            message: `Called Token ${nextToken.token} to Table ${tableNum}`,
            token: nextToken,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.callNext = callNext;
// 6. Update Token Status (START, COMPLETE, SKIP, RECALL)
const updateTokenStatus = async (req, res) => {
    try {
        const { tokenStr } = req.params;
        const { status, tableNumber } = req.body;
        const sessionId = await getActiveSessionId();
        const tokenDoc = await Token_js_1.Token.findOne({ sessionId, token: tokenStr.toUpperCase() });
        if (!tokenDoc) {
            return res.status(404).json({ success: false, message: `Token ${tokenStr} not found.` });
        }
        if (tableNumber !== undefined && tableNumber !== null) {
            const targetTable = Number(tableNumber);
            // Check capacity if moving to table in CALLED/PROCESSING
            // When resuming from ON_HOLD, we allow +1 overflow for express return
            const isResuming = tokenDoc.status === 'ON_HOLD' && status === 'PROCESSING';
            if (['CALLED', 'PROCESSING'].includes(status || tokenDoc.status)) {
                const tableActiveCount = await Token_js_1.Token.countDocuments({
                    sessionId,
                    tableNumber: targetTable,
                    status: { $in: ['CALLED', 'PROCESSING'] },
                    _id: { $ne: tokenDoc._id },
                });
                // Allow express resume even if table is full (student was already assigned here)
                if (tableActiveCount >= 2 && !isResuming) {
                    return res.status(400).json({
                        success: false,
                        message: `TABLE ${targetTable} IS FULL! Maximum capacity is 2 students per table.`,
                    });
                }
            }
            tokenDoc.tableNumber = targetTable;
        }
        if (status) {
            if (!['WAITING', 'CALLED', 'PROCESSING', 'ON_HOLD', 'COMPLETED', 'SKIPPED'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status' });
            }
            tokenDoc.status = status;
            if (status === 'CALLED') {
                tokenDoc.calledAt = new Date();
            }
            else if (status === 'COMPLETED') {
                tokenDoc.completedAt = new Date();
            }
        }
        await tokenDoc.save();
        if (ioInstance) {
            ioInstance.emit('token:updated', { token: tokenDoc, action: status });
            if (status === 'CALLED') {
                ioInstance.emit('token:called', { token: tokenDoc });
            }
        }
        await notifyQueueUpdate();
        (0, supabase_js_1.syncTokenToSupabase)(tokenDoc);
        return res.json({
            success: true,
            message: `Token ${tokenDoc.token} status updated to ${tokenDoc.status}`,
            token: tokenDoc,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateTokenStatus = updateTokenStatus;
// 7. Recall Current Token
const recallToken = async (req, res) => {
    try {
        const { tokenStr } = req.params;
        const sessionId = await getActiveSessionId();
        const tokenDoc = await Token_js_1.Token.findOne({ sessionId, token: tokenStr.toUpperCase() });
        if (!tokenDoc) {
            return res.status(404).json({ success: false, message: `Token ${tokenStr} not found.` });
        }
        tokenDoc.calledAt = new Date();
        await tokenDoc.save();
        if (ioInstance) {
            ioInstance.emit('token:called', { token: tokenDoc, isRecall: true });
        }
        await notifyQueueUpdate();
        return res.json({
            success: true,
            message: `Recalled announcement for Token ${tokenDoc.token}`,
            token: tokenDoc,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.recallToken = recallToken;
// 8. Reset / New Session
const resetSession = async (req, res) => {
    try {
        const newSessionId = `orientation-${Date.now()}`;
        await Session_js_1.Session.updateMany({}, { isActive: false });
        await Session_js_1.Session.create({
            sessionId: newSessionId,
            title: `Mirai Orientation Session (${new Date().toLocaleTimeString()})`,
            date: new Date().toISOString().split('T')[0],
            isActive: true,
        });
        if (ioInstance) {
            ioInstance.emit('session:reset', { sessionId: newSessionId });
        }
        await notifyQueueUpdate();
        return res.json({
            success: true,
            message: 'New orientation session initialized cleanly.',
            sessionId: newSessionId,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.resetSession = resetSession;
