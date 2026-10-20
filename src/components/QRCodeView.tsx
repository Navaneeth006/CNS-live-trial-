import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, Copy, Check, ExternalLink, Radio, Tv, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext.tsx';
import { useRouter } from '../context/RouterContext.tsx';

interface QRCodeViewProps {
  tableId: number;
  tableName?: string;
  onClose?: () => void;
  compact?: boolean;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({ tableId, tableName, onClose, compact = false }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { showToast } = useToast();
  const { navigate } = useRouter();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cuecontrol.app';
  const tableUrl = `${baseUrl}/table/${tableId}`;
  const streamUrl = `${baseUrl}/stream/${tableId}`;
  const tvUrl = `${baseUrl}/tv/${tableId}`;
  const arenaUrl = `${baseUrl}/display`;

  useEffect(() => {
    QRCode.toDataURL(
      tableUrl,
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (err, url) => {
        if (!err && url) {
          setDataUrl(url);
        }
      }
    );
  }, [tableUrl]);

  const handleCopy = (url: string, key: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedKey(key);
      showToast(`${label} copied`, url, 'success');
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `cuecontrol-table-${String(tableId).padStart(2, '0')}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('QR Code Downloaded', `Table 0${tableId} QR code saved as PNG`, 'success');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocked', 'Please allow popups to print table placard', 'error');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table 0${tableId} QR Placard - CueControl</title>
          <style>
            @page { size: A5 landscape; margin: 10mm; }
            body {
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
              text-align: center;
              padding: 24px;
              color: #0f172a;
              background: #ffffff;
            }
            .border-wrap {
              border: 3px solid #0f172a;
              border-radius: 20px;
              padding: 32px;
              max-width: 480px;
              margin: 0 auto;
            }
            .badge {
              display: inline-block;
              background: #0f172a;
              color: #ffffff;
              padding: 6px 18px;
              border-radius: 9999px;
              font-weight: 700;
              font-size: 14px;
              letter-spacing: 0.1em;
              text-transform: uppercase;
              margin-bottom: 12px;
            }
            h1 {
              font-size: 38px;
              margin: 8px 0;
              font-weight: 800;
              letter-spacing: -0.02em;
            }
            p.sub {
              font-size: 15px;
              color: #475569;
              margin-bottom: 24px;
            }
            img {
              width: 220px;
              height: 220px;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 8px;
            }
            .url {
              font-family: monospace;
              font-size: 13px;
              color: #64748b;
              margin-top: 16px;
            }
            .tagline {
              font-size: 12px;
              color: #94a3b8;
              margin-top: 24px;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="border-wrap">
            <div class="badge">CueControl Table Scoring</div>
            <h1>TABLE 0${tableId}</h1>
            <p class="sub">Scan with any phone camera to control live score & view match stats</p>
            <img src="${dataUrl}" alt="Table ${tableId} QR Code" />
            <div class="url">${tableUrl}</div>
            <div class="tagline">Every shot. Every score. Connected.</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-[#151918] rounded-xl border border-[#E1E3DF] dark:border-[#26302B]">
        {dataUrl ? (
          <img src={dataUrl} alt={`Table ${tableId} QR`} className="w-24 h-24 rounded-lg shadow-xs bg-white p-1" />
        ) : (
          <div className="w-24 h-24 bg-[#F4F5F3] dark:bg-[#1D2321] animate-pulse rounded-lg" />
        )}
        <span className="text-[11px] font-mono font-medium text-[#5A635E] dark:text-[#8E9B95]">
          /table/{tableId}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-[#151918] rounded-2xl border border-[#E1E3DF] dark:border-[#26302B] shadow-2xl max-w-sm w-full mx-auto">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#197A4C]/10 dark:bg-[#1F9D63]/15 border border-[#197A4C]/25 dark:border-[#1F9D63]/30 text-[#197A4C] dark:text-[#1F9D63] text-xs font-mono font-bold uppercase tracking-wider mb-3">
        Permanent QR Placard
      </div>

      <h3 className="text-xl font-bold font-display uppercase tracking-tight text-[#111413] dark:text-[#F5F7F6]">
        {tableName || `Table 0${tableId}`}
      </h3>
      <p className="text-xs text-[#5A635E] dark:text-[#8E9B95] mt-1 max-w-[260px]">
        Scan with any mobile camera to open live scoreboard. No app install needed.
      </p>

      {/* QR Display Card */}
      <div className="my-5 p-4 bg-[#F4F5F3] dark:bg-[#1D2321] rounded-xl border border-[#E1E3DF] dark:border-[#26302B] shadow-inner flex flex-col items-center">
        {dataUrl ? (
          <div className="p-2.5 bg-white rounded-xl shadow-md">
            <img src={dataUrl} alt={`Table ${tableId} QR`} className="w-48 h-48 rounded-lg" />
          </div>
        ) : (
          <div className="w-48 h-48 bg-white dark:bg-[#151918] animate-pulse rounded-lg" />
        )}
        {/* Dedicated URLs */}
        <div className="mt-3 space-y-1.5 w-full text-left">
          {/* Remote scoring URL */}
          <div className="flex items-center justify-between w-full text-[11px] font-mono text-[#111413] dark:text-[#F5F7F6] bg-white dark:bg-[#151918] px-2.5 py-1.5 rounded-lg border border-[#E1E3DF] dark:border-[#26302B]">
            <span className="truncate mr-2 text-[#5A635E] dark:text-[#8E9B95]">{tableUrl}</span>
            <button
              onClick={() => handleCopy(tableUrl, 'table', 'Remote Scorer Link')}
              className="text-[#5A635E] hover:text-[#111413] dark:text-[#8E9B95] dark:hover:text-[#F5F7F6] transition-colors p-1 cursor-pointer shrink-0"
              title="Copy Remote Scoring URL"
            >
              {copiedKey === 'table' ? <Check className="w-3.5 h-3.5 text-[#197A4C] dark:text-[#1F9D63]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* OBS Stream URL */}
          <div className="flex items-center justify-between w-full text-[11px] font-mono text-[#111413] dark:text-[#F5F7F6] bg-white dark:bg-[#151918] px-2.5 py-1.5 rounded-lg border border-[#E1E3DF] dark:border-[#26302B]">
            <div className="flex items-center gap-1.5 truncate mr-2">
              <Radio className="w-3 h-3 text-[#B8892F] dark:text-[#D6A84F] shrink-0" />
              <span className="truncate text-[#5A635E] dark:text-[#8E9B95]">{streamUrl}</span>
            </div>
            <button
              onClick={() => handleCopy(streamUrl, 'stream', 'OBS Stream URL')}
              className="text-[#5A635E] hover:text-[#111413] dark:text-[#8E9B95] dark:hover:text-[#F5F7F6] transition-colors p-1 cursor-pointer shrink-0"
              title="Copy OBS Stream URL"
            >
              {copiedKey === 'stream' ? <Check className="w-3.5 h-3.5 text-[#197A4C] dark:text-[#1F9D63]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Dedicated Table TV Display URL */}
          <div className="flex items-center justify-between w-full text-[11px] font-mono text-[#111413] dark:text-[#F5F7F6] bg-white dark:bg-[#151918] px-2.5 py-1.5 rounded-lg border border-[#E1E3DF] dark:border-[#26302B]">
            <div className="flex items-center gap-1.5 truncate mr-2">
              <Tv className="w-3 h-3 text-[#197A4C] dark:text-[#1F9D63] shrink-0" />
              <span className="truncate text-[#5A635E] dark:text-[#8E9B95]">{tvUrl}</span>
            </div>
            <button
              onClick={() => handleCopy(tvUrl, 'tv', 'Table TV URL')}
              className="text-[#5A635E] hover:text-[#111413] dark:text-[#8E9B95] dark:hover:text-[#F5F7F6] transition-colors p-1 cursor-pointer shrink-0"
              title="Copy Dedicated TV Feed URL"
            >
              {copiedKey === 'tv' ? <Check className="w-3.5 h-3.5 text-[#197A4C] dark:text-[#1F9D63]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 w-full mt-2">
        <button
          id={`btn-qr-print-${tableId}`}
          onClick={handlePrint}
          className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[#F4F5F3] hover:bg-[#EBECE8] dark:bg-[#1D2321] dark:hover:bg-[#26302B] border border-[#E1E3DF] dark:border-[#26302B] text-[#111413] dark:text-[#F5F7F6] text-xs font-medium transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4 text-[#5A635E] dark:text-[#8E9B95]" />
          <span>Print Placard</span>
        </button>

        <button
          id={`btn-qr-download-${tableId}`}
          onClick={handleDownload}
          className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[#F4F5F3] hover:bg-[#EBECE8] dark:bg-[#1D2321] dark:hover:bg-[#26302B] border border-[#E1E3DF] dark:border-[#26302B] text-[#111413] dark:text-[#F5F7F6] text-xs font-medium transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#5A635E] dark:text-[#8E9B95]" />
          <span>Download PNG</span>
        </button>

        <button
          id={`btn-qr-open-${tableId}`}
          onClick={() => {
            if (onClose) onClose();
            navigate(`/table/${tableId}`);
          }}
          className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[#197A4C] dark:bg-[#1F9D63] hover:bg-[#14643E] dark:hover:bg-[#26B372] text-white text-xs font-bold font-display uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open Scoring</span>
        </button>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 text-xs font-medium text-[#5A635E] hover:text-[#111413] dark:text-[#8E9B95] dark:hover:text-[#F5F7F6] transition-colors cursor-pointer"
        >
          Close window
        </button>
      )}
    </div>
  );
};
