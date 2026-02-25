import { useState } from 'react';
import { X, Download, FileJson, FileText } from 'lucide-react';
import { TimeRange, ExportData } from '@/types/analytics';
import { downloadJSON, downloadCSV } from '@/utils/analyticsUtils';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface ExportModalProps {
  exportData: ExportData;
  onClose: () => void;
}

export function ExportModal({ exportData, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<'json' | 'csv'>('json');

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analytics_${exportData.userId}_${exportData.timeRange}_${timestamp}`;

    try {
      if (format === 'json') {
        downloadJSON(exportData, `${filename}.json`);
        toast.success('Analytics exported as JSON');
      } else {
        downloadCSV(exportData.portfolio, `${filename}.csv`);
        toast.success('Portfolio data exported as CSV');
      }
      onClose();
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md bg-[#141417] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2CC295]/10 rounded-lg">
              <Download size={24} className="text-[#2CC295]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Export Analytics</h2>
              <p className="text-sm text-zinc-500">Download your data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('json')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  format === 'json'
                    ? 'border-[#2CC295] bg-[#2CC295]/10'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <FileJson size={32} className={format === 'json' ? 'text-[#2CC295]' : 'text-zinc-600'} />
                <p className="text-sm font-bold text-white mt-2">JSON</p>
                <p className="text-xs text-zinc-500 mt-1">Complete data</p>
              </button>

              <button
                onClick={() => setFormat('csv')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  format === 'csv'
                    ? 'border-[#2CC295] bg-[#2CC295]/10'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <FileText size={32} className={format === 'csv' ? 'text-[#2CC295]' : 'text-zinc-600'} />
                <p className="text-sm font-bold text-white mt-2">CSV</p>
                <p className="text-xs text-zinc-500 mt-1">Portfolio only</p>
              </button>
            </div>
          </div>

          {/* Export Info */}
          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <h3 className="text-sm font-bold text-white mb-3">Export includes:</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              {format === 'json' ? (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2CC295]">✓</span>
                    Portfolio snapshots
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2CC295]">✓</span>
                    Performance metrics
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2CC295]">✓</span>
                    Category breakdown
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2CC295]">✓</span>
                    Trade history
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2CC295]">✓</span>
                    Portfolio value over time
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2CC295]">✓</span>
                    Total assets count
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2CC295]">✓</span>
                    Profit/loss data
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-zinc-600]">✗</span>
                    <span className="text-zinc-600">Detailed metrics</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Time Range */}
          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Time Range:</span>
              <span className="text-sm font-bold text-white">{exportData.timeRange}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-zinc-500">Export Date:</span>
              <span className="text-sm font-bold text-white">
                {new Date(exportData.exportDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-4 py-2.5 bg-[#2CC295] hover:bg-[#25a882] text-black rounded-lg transition-colors font-bold flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Export {format.toUpperCase()}
          </button>
        </div>
      </motion.div>
    </div>
  );
}