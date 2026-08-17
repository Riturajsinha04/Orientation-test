import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { Token, IToken, TokenStatus } from '../models/Token.js';
import { Session } from '../models/Session.js';
import { syncTokenToSupabase } from '../services/supabase.js';

let ioInstance: Server | null = null;

export const setIoInstance = (io: Server) => {
  ioInstance = io;
};

const notifyQueueUpdate = async () => {
  if (!ioInstance) return;
  try {
    const stats = await getStatsData();
    const currentData = await getCurrentData();
    ioInstance.emit('queue:updated', stats);
    ioInstance.emit('smartboard:updated', currentData);
  } catch (err) {
    console.error('Error broadcasting socket updates:', err);
  }
};

const getActiveSessionId = async (): Promise<string> => {
  let activeSession = await Session.findOne({ isActive: true });
  if (!activeSession) {
    activeSession = await Session.create({
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
  const activeSession = await Session.findOne({ sessionId });
  const tableNames: Record<number, string> = {};
  if (activeSession?.tablesConfig) {
    activeSession.tablesConfig.forEach((tc) => {
      if (tc.name) tableNames[tc.tableNumber] = tc.name;
    });
  }
  
  // Active / Called tokens (up to 12)
  const activeTokens = await Token.find({
    sessionId,
    status: { $in: ['CALLED', 'PROCESSING'] },
  })
    .sort({ calledAt: -1, updatedAt: -1 })
    .limit(12);

  // Next waiting tokens (up to 12)
  const waitingTokens = await Token.find({
    sessionId,
    status: 'WAITING',
  })
    .sort({ tokenNumber: 1 })
    .limit(12);

  const waitingCount = await Token.countDocuments({
    sessionId,
    status: 'WAITING',
  });

  return {
    currentToken: activeTokens[0] || null,
    activeTokens,
    waitingTokens,
    nextTokens: waitingTokens.slice(0, 3).map((t) => t.token),
    waitingCount,
    tableNames,
  };
};

const getStatsData = async () => {
  const sessionId = await getActiveSessionId();
  const activeSession = await Session.findOne({ sessionId });
  const tableCount = activeSession?.tableCount || 4;
  const tableNames: Record<number, string> = {};
  if (activeSession?.tablesConfig) {
    activeSession.tablesConfig.forEach((tc) => {
      if (tc.name) tableNames[tc.tableNumber] = tc.name;
    });
  }

  const total = await Token.countDocuments({ sessionId });
  const waiting = await Token.countDocuments({ sessionId, status: 'WAITING' });
  const processing = await Token.countDocuments({
    sessionId,
    status: { $in: ['CALLED', 'PROCESSING'] },
  });
  const onHold = await Token.countDocuments({ sessionId, status: 'ON_HOLD' });
  const completed = await Token.countDocuments({ sessionId, status: 'COMPLETED' });
  const skipped = await Token.countDocuments({ sessionId, status: 'SKIPPED' });

  // Get active per table count
  const activeTokens = await Token.find({
    sessionId,
    status: { $in: ['CALLED', 'PROCESSING'] },
  });

  const tableMap: Record<number, IToken[]> = {};
  for (let i = 1; i <= tableCount; i++) {
    tableMap[i] = [];
  }
  activeTokens.forEach((t) => {
    if (t.tableNumber) {
      if (!tableMap[t.tableNumber]) tableMap[t.tableNumber] = [];
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
    tableCount,
    tableNames,
    tables: tableMap,
  };
};

export const updateTableCount = async (req: Request, res: Response) => {
  try {
    const { tableCount } = req.body;
    const count = Number(tableCount);
    if (isNaN(count) || count < 1 || count > 20) {
      return res.status(400).json({
        success: false,
        message: 'Table count must be a number between 1 and 20.',
      });
    }

    const sessionId = await getActiveSessionId();
    const activeSession = await Session.findOne({ sessionId });

    if (activeSession) {
      activeSession.tableCount = count;
      await activeSession.save();
    }

    await notifyQueueUpdate();

    return res.json({
      success: true,
      message: `Orientation tables updated to ${count} tables.`,
      tableCount: count,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTableName = async (req: Request, res: Response) => {
  try {
    const { tableNumber } = req.params;
    const { name } = req.body;
    const tableNum = Number(tableNumber);

    if (isNaN(tableNum) || tableNum < 1 || tableNum > 20) {
      return res.status(400).json({ success: false, message: 'Invalid table number' });
    }

    const sessionId = await getActiveSessionId();
    const activeSession = await Session.findOne({ sessionId });

    if (activeSession) {
      if (!activeSession.tablesConfig) {
        activeSession.tablesConfig = [];
      }
      const existingIndex = activeSession.tablesConfig.findIndex((tc) => tc.tableNumber === tableNum);
      const cleanName = (name || '').trim();

      if (existingIndex > -1) {
        activeSession.tablesConfig[existingIndex].name = cleanName;
      } else {
        activeSession.tablesConfig.push({ tableNumber: tableNum, name: cleanName });
      }
      await activeSession.save();
    }

    await notifyQueueUpdate();

    return res.json({
      success: true,
      message: (name || '').trim()
        ? `Table ${tableNum} dedicated name updated to "${(name || '').trim()}".`
        : `Table ${tableNum} dedicated name removed.`,
      tableNumber: tableNum,
      name: (name || '').trim(),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 1. Get Tokens List (with search & status filter)
export const getTokens = async (req: Request, res: Response) => {
  try {
    const sessionId = await getActiveSessionId();
    const { search, status } = req.query;

    const query: any = { sessionId };

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

    const tokens = await Token.find(query).sort({ tokenNumber: 1 });
    return res.json({ success: true, tokens });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get Current Smartboard Data
export const getCurrentToken = async (_req: Request, res: Response) => {
  try {
    const data = await getCurrentData();
    return res.json({ success: true, ...data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get Queue Statistics
export const getStats = async (_req: Request, res: Response) => {
  try {
    const stats = await getStatsData();
    return res.json({ success: true, stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Register Student & Generate Token
export const createToken = async (req: Request, res: Response) => {
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
      const existing = await Token.findOne({ sessionId, mobile: cleanedMobile });
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
    const lastToken = await Token.findOne({ sessionId }).sort({ tokenNumber: -1 });
    const nextNumber = lastToken ? lastToken.tokenNumber + 1 : 1;
    const tokenFormatted = `A-${String(nextNumber).padStart(3, '0')}`;

    const newToken = await Token.create({
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
    syncTokenToSupabase(newToken);

    return res.status(201).json({
      success: true,
      message: 'Token generated successfully',
      token: newToken,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Call Next Token for a Table
export const callNext = async (req: Request, res: Response) => {
  try {
    const { tableNumber } = req.body;
    const tableNum = Number(tableNumber) || 1;

    const sessionId = await getActiveSessionId();

    // CAPACITY CHECK: Max 2 active students per table
    const tableActiveCount = await Token.countDocuments({
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
    const nextToken = await Token.findOne({
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
    syncTokenToSupabase(nextToken);

    return res.json({
      success: true,
      message: `Called Token ${nextToken.token} to Table ${tableNum}`,
      token: nextToken,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Update Token Status (START, COMPLETE, SKIP, RECALL)
export const updateTokenStatus = async (req: Request, res: Response) => {
  try {
    const { tokenStr } = req.params;
    const { status, tableNumber } = req.body;

    const sessionId = await getActiveSessionId();
    const tokenDoc = await Token.findOne({ sessionId, token: tokenStr.toUpperCase() });

    if (!tokenDoc) {
      return res.status(404).json({ success: false, message: `Token ${tokenStr} not found.` });
    }

    if (tableNumber !== undefined && tableNumber !== null) {
      const targetTable = Number(tableNumber);
      // Check capacity if moving to table in CALLED/PROCESSING
      // When resuming from ON_HOLD, we allow +1 overflow for express return
      const isResuming = tokenDoc.status === 'ON_HOLD' && status === 'PROCESSING';
      if (['CALLED', 'PROCESSING'].includes(status || tokenDoc.status)) {
        const tableActiveCount = await Token.countDocuments({
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
      tokenDoc.status = status as TokenStatus;

      if (status === 'CALLED') {
        tokenDoc.calledAt = new Date();
      } else if (status === 'COMPLETED') {
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
    syncTokenToSupabase(tokenDoc);

    return res.json({
      success: true,
      message: `Token ${tokenDoc.token} status updated to ${tokenDoc.status}`,
      token: tokenDoc,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Recall Current Token
export const recallToken = async (req: Request, res: Response) => {
  try {
    const { tokenStr } = req.params;
    const sessionId = await getActiveSessionId();

    const tokenDoc = await Token.findOne({ sessionId, token: tokenStr.toUpperCase() });
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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Reset / New Session
export const resetSession = async (_req: Request, res: Response) => {
  try {
    const newSessionId = `orientation-${Date.now()}`;
    await Session.updateMany({}, { isActive: false });
    await Session.create({
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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
