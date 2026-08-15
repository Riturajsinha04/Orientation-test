"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Token = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TokenSchema = new mongoose_1.Schema({
    token: { type: String, required: true, trim: true },
    tokenNumber: { type: Number, required: true },
    studentName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    course: { type: String, trim: true, default: '' },
    status: {
        type: String,
        enum: ['WAITING', 'CALLED', 'PROCESSING', 'ON_HOLD', 'COMPLETED', 'SKIPPED'],
        default: 'WAITING',
    },
    tableNumber: { type: Number, default: null },
    sessionId: { type: String, required: true, default: 'orientation-2026' },
    calledAt: { type: Date },
    completedAt: { type: Date },
}, {
    timestamps: true,
});
// Compound index for unique token per session and mobile duplicate check per session
TokenSchema.index({ sessionId: 1, token: 1 }, { unique: true });
TokenSchema.index({ sessionId: 1, status: 1 });
TokenSchema.index({ sessionId: 1, mobile: 1 });
exports.Token = mongoose_1.default.model('Token', TokenSchema);
