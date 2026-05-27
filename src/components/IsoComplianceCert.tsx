import React, { useState } from "react";
import { Award, CheckCircle2, ShieldEllipsis, AlertCircle, RefreshCw, FileCheck2, Share2 } from "lucide-react";
import { IsoCompliance } from "../types";

interface IsoComplianceCertProps {
  compliance: IsoCompliance;
  repoOwner: string;
  repoName: string;
}

export default function IsoComplianceCert({ compliance, repoOwner, repoName }: IsoComplianceCertProps) {
  const [certifying, setCertifying] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!compliance) {
    return (
      <div id="iso-compliance-certification" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 gap-2">
          <div>
            <h3 className="text-base font-bold text-white font-display">Standardised ISO/IEC 5055 Verification</h3>
            <p className="text-xs text-slate-400">Compliance analysis not yet available for this scan.</p>
          </div>
        </div>
        <div className="p-6 bg-slate-800/50 rounded-xl text-center text-slate-400 text-sm">
          Compliance report will appear here once the scan completes.
        </div>
      </div>
    );
  }

  const activeCompliance = compliance;

  const handleShareCert = () => {
    setCopied(true);
    navigator.clipboard.writeText(`Grader Technical Verification - ISO/IEC 5055 Compliant for ${repoOwner}/${repoName}. ID: ${activeCompliance.certValidationId}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="iso-compliance-certification" className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 gap-2">
        <div>
          <h3 className="text-base font-bold text-white font-display">Standardised ISO/IEC 5055 Verification</h3>
          <p className="text-xs text-slate-400">Validate code quality against severe structural weaknesses representing international benchmarks.</p>
        </div>
        <div className="py-1 px-2.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-mono rounded font-bold uppercase tracking-wider flex items-center gap-1.5">
          <FileCheck2 className="w-3.5 h-3.5" /> ISO Standard Audited
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Certification Receipt Stamp (col-span-4) */}
        <div className="lg:col-span-4 bg-gradient-to-b from-indigo-950/15 to-slate-950/40 border border-indigo-500/30 p-6 rounded-xl text-center space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="space-y-3">
            <div className="inline-flex p-3 bg-indigo-500/10 rounded-full border border-indigo-500/30 text-indigo-400">
              <Award className="w-8 h-8" />
            </div>

            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-200 font-mono">
              Compliance Certificate
            </h4>

            <div className="py-1.5 px-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px] uppercase rounded tracking-wider inline-block">
              {activeCompliance.iso5055Compliant ? "✓ CERTIFIED COMPLIANT" : "❌ AUDIT FAILURE"}
            </div>

            <div className="text-left py-2.5 border-t border-b border-white/5 text-[11px] space-y-1 font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Domain:</span>
                <span className="text-slate-200 font-bold truncate max-w-[120px]">{repoName}</span>
              </div>
              <div className="flex justify-between">
                <span>License Key:</span>
                <span className="text-indigo-400 truncate max-w-[120px]">{activeCompliance.certValidationId}</span>
              </div>
              <div className="flex justify-between">
                <span>Standard compliance:</span>
                <span className="text-slate-200">ISO/IEC 5055</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleShareCert}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white select-none rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              {copied ? "Key Copied!" : "Share Verification Key"}
            </button>
          </div>
        </div>

        {/* Breakdown subscores (col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Structural Soundness Pillars
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Reliability */}
            <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Reliability Structural practices</span>
                <span className="text-indigo-400 font-bold">{activeCompliance.reliabilityScore}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${activeCompliance.reliabilityScore}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal pt-1">
                Robust exception handlers. Avoids swallow of runtime node process exceptions.
              </p>
            </div>

            {/* Security Practices */}
            <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Security Architectural limits</span>
                <span className="text-indigo-400 font-bold">{activeCompliance.securityPracticesScore}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${activeCompliance.securityPracticesScore}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal pt-1">
                Validation inputs filters. Avoids SQL injectable code patterns entirely.
              </p>
            </div>

            {/* Performance Efficiency */}
            <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Performance and Resource use</span>
                <span className="text-indigo-400 font-bold">{activeCompliance.performanceScore}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${activeCompliance.performanceScore}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal pt-1">
                Optimized synchronous IO blocking, avoiding redundant connection leakage.
              </p>
            </div>

            {/* Maintainability */}
            <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Maintainability & Redundancy</span>
                <span className="text-indigo-400 font-bold">{activeCompliance.maintainabilityPracticesScore}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${activeCompliance.maintainabilityPracticesScore}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal pt-1">
                Cyclomatic complexity is capped. Decoupled module hierarchy rules maintained.
              </p>
            </div>

          </div>

          {/* Severe Violations Indicator */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-slate-300">
                Severe code practices violations (ISO/IEC 5055):
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded tracking-wide">
              {activeCompliance.severeViolationsCount} Found
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
