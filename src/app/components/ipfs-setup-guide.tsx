import { useState, useEffect } from 'react';
import { Check, Copy, FileText, Link as LinkIcon, AlertCircle, CheckCircle, X, ChevronDown, ChevronRight, ExternalLink, Cloud } from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';
import { motion, AnimatePresence } from 'motion/react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface IPFSSetupGuideProps {
  onClose: () => void;
  onSetupComplete?: () => void;
}

export function IPFSSetupGuide({ onClose, onSetupComplete }: IPFSSetupGuideProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isChecking, setIsChecking] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if PINATA_JWT is configured
  useEffect(() => {
    checkIPFSConfiguration();
  }, []);

  const checkIPFSConfiguration = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/health`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        // Try a test upload to check if PINATA_JWT is set
        const testFormData = new FormData();
        const testBlob = new Blob(['test'], { type: 'text/plain' });
        testFormData.append('file', testBlob, 'test.txt');

        const uploadResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ipfs/upload`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: testFormData,
          }
        );

        const result = await uploadResponse.json();
        
        // If error mentions PINATA_JWT not configured, it's not set
        if (result.error?.includes('PINATA_JWT') || result.error?.includes('not configured')) {
          setIsConfigured(false);
        } else {
          setIsConfigured(true);
        }
      }
    } catch (error) {
      console.error('Error checking IPFS configuration:', error);
      setIsConfigured(false);
    } finally {
      setIsChecking(false);
    }
  };

  const steps = [
    {
      id: 1,
      title: 'Create Pinata Account',
      description: 'Sign up for a free Pinata account to get IPFS storage',
      action: (
        <a
          href="https://app.pinata.cloud/register"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold rounded-lg transition-colors"
        >
          Go to Pinata <ExternalLink size={16} />
        </a>
      ),
    },
    {
      id: 2,
      title: 'Generate API Key',
      description: 'Create a new API key with pinning permissions',
      content: (
        <div className="space-y-3 text-sm text-zinc-300">
          <p>1. Go to <strong className="text-white">API Keys</strong> in Pinata dashboard</p>
          <p>2. Click <strong className="text-white">New Key</strong></p>
          <p>3. Enable these permissions:</p>
          <ul className="list-disc list-inside pl-4 space-y-1 text-zinc-400">
            <li>✅ <strong className="text-white">pinFileToIPFS</strong> (required)</li>
            <li>✅ <strong className="text-white">pinJSONToIPFS</strong> (optional)</li>
          </ul>
          <p>4. Name it "Orina Upload"</p>
          <p>5. Click <strong className="text-white">Create Key</strong></p>
          <p className="text-amber-400 font-medium">⚠️ Copy the JWT immediately - it only shows once!</p>
        </div>
      ),
    },
    {
      id: 3,
      title: 'Configure Supabase',
      description: 'Add the JWT to your Supabase environment variables',
      content: (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Supabase Dashboard URL
              </label>
              <button
                onClick={() => copyToClipboard(`https://supabase.com/dashboard/project/${projectId}/settings/functions`)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                {copied ? <Check size={14} className="text-[#2CC295]" /> : <Copy size={14} />}
              </button>
            </div>
            <code className="text-xs text-[#2CC295] break-all">
              https://supabase.com/dashboard/project/{projectId}/settings/functions
            </code>
          </div>

          <div className="space-y-3 text-sm text-zinc-300">
            <p>1. Open the Supabase dashboard URL above</p>
            <p>2. Go to <strong className="text-white">Edge Functions</strong> → <strong className="text-white">Settings</strong></p>
            <p>3. In <strong className="text-white">Environment Variables</strong> section:</p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 ml-4">
              <p className="text-xs text-zinc-400 mb-2">Variable name:</p>
              <code className="text-sm text-white font-mono">PINATA_JWT</code>
              <p className="text-xs text-zinc-400 mt-3 mb-2">Variable value:</p>
              <code className="text-sm text-zinc-500 font-mono">eyJhbG... (paste your JWT)</code>
            </div>
            <p>4. Click <strong className="text-white">Save</strong></p>
            <p className="text-amber-400 font-medium">⚠️ Functions will restart automatically</p>
          </div>

          <a
            href={`https://supabase.com/dashboard/project/${projectId}/settings/functions`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold rounded-lg transition-colors"
          >
            Open Supabase Dashboard <ExternalLink size={16} />
          </a>
        </div>
      ),
    },
    {
      id: 4,
      title: 'Verify Setup',
      description: 'Test your IPFS configuration',
      content: (
        <div className="space-y-4">
          <button
            onClick={checkIPFSConfiguration}
            disabled={isChecking}
            className="w-full px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Test Configuration'}
          </button>

          {!isChecking && (
            <div className={`p-4 rounded-lg border ${
              isConfigured 
                ? 'bg-[#2CC295]/10 border-[#2CC295]/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center gap-3">
                {isConfigured ? (
                  <>
                    <CheckCircle className="text-[#2CC295]" size={20} />
                    <div className="flex-1">
                      <p className="font-bold text-[#2CC295] text-sm">Setup Complete!</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        IPFS uploads are ready to use
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="text-red-400" size={20} />
                    <div className="flex-1">
                      <p className="font-bold text-red-400 text-sm">Not Configured</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Please complete the setup steps above
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-[#141417] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-gradient-to-r from-[#2CC295]/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2CC295]/20 rounded-xl flex items-center justify-center">
              <Cloud className="text-[#2CC295]" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">IPFS Upload Setup</h2>
              <p className="text-sm text-zinc-400">Configure Pinata for decentralized storage</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isConfigured && onSetupComplete) {
                onSetupComplete();
              }
              onClose();
            }}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                    currentStep === step.id
                      ? 'bg-[#2CC295] border-[#2CC295] text-black'
                      : currentStep > step.id
                      ? 'bg-[#2CC295]/20 border-[#2CC295] text-[#2CC295]'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                  }`}>
                    {currentStep > step.id ? <CheckCircle size={18} /> : step.id}
                  </div>
                  <p className={`text-xs mt-2 font-medium text-center ${
                    currentStep >= step.id ? 'text-white' : 'text-zinc-600'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                    currentStep > step.id ? 'bg-[#2CC295]' : 'bg-zinc-800'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {steps.map(step => (
              currentStep === step.id && (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">{step.title}</h3>
                    <p className="text-sm text-zinc-400">{step.description}</p>
                  </div>

                  {step.content && (
                    <div className="mt-4">
                      {step.content}
                    </div>
                  )}

                  {step.action && (
                    <div className="mt-4">
                      {step.action}
                    </div>
                  )}
                </motion.div>
              )
            ))}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-6 border-t border-zinc-800">
          <button
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="text-sm text-zinc-500">
            Step {currentStep} of {steps.length}
          </div>

          {currentStep < steps.length ? (
            <button
              onClick={() => setCurrentStep(prev => Math.min(steps.length, prev + 1))}
              className="px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold rounded-lg transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                if (isConfigured && onSetupComplete) {
                  onSetupComplete();
                }
                onClose();
              }}
              disabled={!isConfigured}
              className="px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfigured ? 'Complete Setup' : 'Setup Required'}
            </button>
          )}
        </div>

        {/* Info Banner */}
        <div className="px-6 pb-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-zinc-300">
                <p className="font-bold text-blue-400 mb-1">Why IPFS?</p>
                <p>IPFS (InterPlanetary File System) provides decentralized, permanent storage for your assets. Files are distributed across the network and accessible via multiple gateways, ensuring reliability and censorship resistance.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}