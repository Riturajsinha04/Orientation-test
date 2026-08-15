import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Copy, Check, Printer, Download, ExternalLink, Sparkles } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose }) => {
  const defaultUrl = window.location.origin;
  const [targetUrl, setTargetUrl] = useState(defaultUrl);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svgElement = document.getElementById('reception-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngFile;
        downloadLink.download = 'mirai-reception-qr.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svgElement = document.getElementById('reception-qr-svg')?.outerHTML || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mirai Orientation - Reception QR Poster</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              margin: 0;
              padding: 40px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              box-sizing: border-box;
              background-color: #ffffff;
              color: #0f172a;
              text-align: center;
            }
            .poster-card {
              border: 3px solid #1e293b;
              border-radius: 32px;
              padding: 48px;
              max-width: 550px;
              width: 100%;
              box-shadow: 0 20px 40px rgba(0,0,0,0.08);
              background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            }
            .header-logo {
              height: 48px;
              margin-bottom: 16px;
            }
            .title {
              font-size: 28px;
              font-weight: 900;
              letter-spacing: -0.5px;
              color: #0f172a;
              text-transform: uppercase;
              margin: 0 0 6px 0;
            }
            .subtitle {
              font-size: 14px;
              font-weight: 600;
              color: #2563eb;
              margin: 0 0 32px 0;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .qr-container {
              background: #ffffff;
              padding: 24px;
              border-radius: 24px;
              display: inline-block;
              border: 2px solid #e2e8f0;
              margin-bottom: 24px;
            }
            .instruction {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 8px;
            }
            .sub-instruction {
              font-size: 13px;
              color: #64748b;
              margin-bottom: 24px;
            }
            .footer-badge {
              display: inline-block;
              background-color: #0f172a;
              color: #ffffff;
              padding: 8px 20px;
              border-radius: 100px;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            @media print {
              body { padding: 0; }
              .poster-card { border-width: 2px; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="poster-card">
            <img src="/mirai-logo.png" alt="Mirai Logo" class="header-logo" />
            <h1 class="title">ORIENTATION 2026</h1>
            <p class="subtitle">Self Student Registration</p>
            
            <div class="qr-container">
              ${svgElement}
            </div>

            <div class="instruction">📱 SCAN QR CODE TO CHECK-IN</div>
            <div class="sub-instruction">Register your Name & Phone Number directly from your mobile phone to receive your token ticket.</div>

            <div class="footer-badge">MIRAI SCHOOL OF TECHNOLOGY</div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-500/40 rounded-2xl text-blue-400">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-tight font-outfit text-white">
                Reception QR Code
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Paste at reception for direct student check-in
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* QR Code Display Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md mb-4">
              <QRCodeSVG
                id="reception-qr-svg"
                value={targetUrl}
                size={220}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: "/mirai-logo.png",
                  x: undefined,
                  y: undefined,
                  height: 36,
                  width: 36,
                  excavate: true,
                }}
              />
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Direct Link: Standalone Reception App</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Students scanning this QR code will open this dedicated reception portal.
            </p>
          </div>

          {/* Editable URL input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Target Registration URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                onClick={handleCopy}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Tip: If testing on mobile via local Wi-Fi, replace <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">localhost</code> with your computer's LAN IP.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="col-span-2 sm:col-span-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Poster</span>
            </button>

            <button
              onClick={handleDownload}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center justify-center space-x-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Save PNG</span>
            </button>

            <a
              href={targetUrl}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center justify-center space-x-2 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Test Link</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
