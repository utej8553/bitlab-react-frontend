import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import {
    Play,
    Terminal as TerminalIcon,
    Activity,
    Download,
    Loader2,
    ChevronDown,
    X,
    Binary,
    Cpu,
    Terminal,
    Zap,
    Box,
    HardDrive,
    Cpu as CpuIcon,
    Wifi,
    ChevronRight
} from 'lucide-react';

const CodeLab = () => {
    const { lang } = useParams();
    const navigate = useNavigate();

    const [designCode, setDesignCode] = useState('');
    const [testbenchCode, setTestbenchCode] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [vcdData, setVcdData] = useState(null);
    const [isTerminalOpen, setIsTerminalOpen] = useState(true);
    const [isVcdOpen, setIsVcdOpen] = useState(false);

    const terminalRef = useRef(null);

    const labConfig = {
        verilog: { title: 'Verilog Core', mode: 'verilog', icon: Binary, hasTestbench: true },
        vhdl: { title: 'VHDL Logic', mode: 'vhdl', icon: Cpu, hasTestbench: true },
        qnx: { title: 'QNX Target', mode: 'cpp', icon: Terminal, hasTestbench: false },
    };

    const currentLab = labConfig[lang] || labConfig.verilog;

    useEffect(() => {
        const savedDesign = localStorage.getItem(`${lang}_design`);
        const savedTB = localStorage.getItem(`${lang}_tb`);
        if (savedDesign) setDesignCode(savedDesign);
        else setDefaultTemplate();
    }, [lang]);

    const setDefaultTemplate = () => {
        if (lang === 'qnx') {
            setDesignCode('#include <stdio.h>\n\nint main() {\n  printf("Initializing BitLab QNX Engine...\\n");\n  return 0;\n}');
            setTestbenchCode('');
        } else if (lang === 'verilog') {
            setDesignCode('// BitLab Verilog Template\nmodule main();\n  initial begin\n    $display("BitLab Logic Core: Ready");\n  end\nendmodule');
            setTestbenchCode('// Verilog Testbench\nmodule testbench();\n  // Stimulus here\nendmodule');
        } else if (lang === 'vhdl') {
            setDesignCode('-- BitLab VHDL Template\nlibrary IEEE;\nuse IEEE.STD_LOGIC_1164.ALL;\n\nentity main is\nend main;\n\narchitecture Behavioral of main is\nbegin\nend Behavioral;');
            setTestbenchCode('-- VHDL Testbench\nlibrary IEEE;\nuse IEEE.STD_LOGIC_1164.ALL;');
        }
    };

    const handleSave = (val, type) => {
        if (type === 'design') {
            setDesignCode(val);
            localStorage.setItem(`${lang}_design`, val);
        } else {
            setTestbenchCode(val);
            localStorage.setItem(`${lang}_tb`, val);
        }
    };

    const downloadVcd = () => {
        if (!vcdData) return;
        const byteCharacters = atob(vcdData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simulation_${Date.now()}.vcd`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const executeCode = async () => {
        if (loading) return;
        setLoading(true);
        setLogs(prev => [...prev, `>>> [INIT] Initializing target environment: ${lang.toUpperCase()}...`]);
        try {
            const response = await api.post('/execute', {
                language: lang,
                designCode,
                testbenchCode: currentLab.hasTestbench ? testbenchCode : null
            });

            const { logs: outputLogs, vcdBase64 } = response.data;
            setLogs(prev => [...prev, ...outputLogs.split('\n')]);

            if (vcdBase64) {
                setVcdData(vcdBase64);
                setIsVcdOpen(true);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Unknown Transport Error';
            const status = err.response?.status ? ` [Status: ${err.response.status}]` : '';
            setLogs(prev => [...prev, `!!! CRITICAL_ERROR: Failed to establish handshake with remote execution kernel.`, `!!! DETAIL: ${errorMsg}${status}`]);
        } finally {
            setLoading(false);
        }
    };

    // Keyboard & UI Sync
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.ctrlKey && e.key === 'Enter') executeCode();
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [designCode, testbenchCode, loading]);

    useEffect(() => {
        if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }, [logs]);

    return (
        <div className="flex h-screen bg-[#030712] overflow-hidden text-slate-300">
            <Sidebar />

            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* IDE Header */}
                <header className="h-14 border-b border-white/[0.03] bg-[#0b0f1a]/80 backdrop-blur-xl px-8 flex items-center justify-between z-40 relative overflow-hidden">
                    <div className="absolute inset-0 shimmer pointer-events-none opacity-5"></div>

                    <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-accent/10 border border-accent/20 rounded-xl text-accent shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                                <currentLab.icon size={18} />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{currentLab.title}</h2>
                                <div className="flex items-center text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 mr-2 animate-pulse"></span> Remote Instance: 0xFD21
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center text-[10px] space-x-4">
                            <div className="h-4 w-px bg-white/5"></div>
                            <span className="text-slate-500 font-black uppercase tracking-widest flex items-center"><Box size={10} className="mr-2" /> Main.v</span>
                            <span className="text-slate-800 font-black uppercase tracking-widest">/</span>
                            <span className="text-slate-500 font-black uppercase tracking-widest flex items-center">Synthesis: Ready</span>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={executeCode}
                        disabled={loading}
                        className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center space-x-3 transition-all duration-500 ${loading ? 'bg-slate-800 text-slate-500' : 'bg-accent text-white shadow-glow hover:bg-accent-hover'}`}
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="fill-white" />}
                        <span>{loading ? 'Processing' : 'Execute Core'}</span>
                    </motion.button>
                </header>

                {/* Workspace */}
                <main key={lang} className="flex-1 flex overflow-hidden relative">
                    {/* Design Editor */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="h-8 px-6 flex items-center bg-[#070b14] border-b border-white/[0.03]">
                            <div className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent/40"></div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    {lang === 'qnx' ? 'Source Console' : 'Logic Workspace'}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 bg-[#0b0f1a] relative">
                            <Editor
                                theme="vs-dark"
                                language={currentLab.mode}
                                value={designCode}
                                onChange={(val) => handleSave(val, 'design')}
                                options={{
                                    fontSize: 14,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    padding: { top: 20 },
                                    backgroundColor: '#0b0f1a'
                                }}
                            />
                        </div>
                    </div>

                    {/* Conditional Testbench Editor */}
                    {currentLab.hasTestbench && (
                        <div className="w-[40%] flex flex-col bg-[#070b14]/50 backdrop-blur-sm border-l border-white/[0.03]">
                            <div className="h-8 px-6 flex items-center border-b border-white/[0.03]">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Simulation Stimulus</span>
                            </div>
                            <div className="flex-1">
                                <Editor
                                    theme="vs-dark"
                                    language={currentLab.mode}
                                    value={testbenchCode}
                                    onChange={(val) => handleSave(val, 'tb')}
                                    options={{
                                        fontSize: 14,
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        padding: { top: 20 },
                                        backgroundColor: '#070b14'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </main>

                {/* VCD Analysis Panel */}
                <AnimatePresence>
                    {isVcdOpen && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 350 }}
                            exit={{ height: 0 }}
                            className="bg-[#0b0f1a]/95 backdrop-blur-3xl border-t border-accent/20 relative z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
                        >
                            <div className="p-8 h-full flex flex-col">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center border border-accent/20">
                                            <Activity className="text-accent animate-pulse" size={20} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] block">Waveform Parse Result</span>
                                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">GTKWave Compatible Stream</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <button onClick={downloadVcd} className="btn-secondary py-3 px-6 flex items-center text-[10px] font-black uppercase tracking-[0.2em] hover:border-accent/40">
                                            <Download size={14} className="mr-3" />
                                            Download VCD
                                        </button>
                                        <button onClick={() => setIsVcdOpen(false)} className="p-2.5 hover:bg-white/5 rounded-2xl text-slate-600 transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 flex items-center justify-center border border-white/[0.03] rounded-[2rem] bg-black/40 relative group overflow-hidden">
                                    <div className="absolute inset-0 shimmer pointer-events-none opacity-5"></div>
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="flex space-x-2">
                                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-4 h-4 rounded-md bg-accent/10 animate-pulse border border-accent/20" style={{ animationDelay: `${i * 0.2}s` }}></div>)}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">Propagating Signal Map...</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Terminal / Status Bar Layout */}
                <div className={`transition-all duration-500 ${isTerminalOpen ? 'h-[280px]' : 'h-10'} border-t border-white/[0.03] bg-black/60 flex flex-col relative`}>
                    <div
                        onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                        className="h-10 px-8 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors relative z-10"
                    >
                        <div className="flex items-center space-x-4">
                            <TerminalIcon size={14} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Console Stream_09X</span>
                        </div>
                        <div className="flex items-center space-x-8">
                            <div className="flex items-center text-[8px] font-black text-slate-700 uppercase tracking-widest space-x-4">
                                <span className="flex items-center"><Wifi size={10} className="mr-2 text-emerald-500" /> Uplink: 1.2ms</span>
                                <span className="flex items-center"><CpuIcon size={10} className="mr-2" /> Host: Lab-7</span>
                            </div>
                            <ChevronDown size={14} className={`transform transition-transform duration-500 ${isTerminalOpen ? '' : 'rotate-180'} text-slate-600`} />
                        </div>
                    </div>

                    {isTerminalOpen && (
                        <div
                            ref={terminalRef}
                            className="flex-1 overflow-y-auto font-mono text-[11px] p-10 text-emerald-400/70 leading-relaxed selection:bg-emerald-500/20 custom-scrollbar relative"
                        >
                            {/* Terminal Scanline Effect */}
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent bg-[length:100%_4px] opacity-10"></div>

                            <div className="max-w-6xl relative z-10">
                                {logs.map((log, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={i}
                                        className="mb-2 flex items-start"
                                    >
                                        <span className="text-emerald-900 font-bold mr-6 select-none">{i.toString().padStart(3, '0')}</span>
                                        <span className="flex-1">{log}</span>
                                    </motion.div>
                                ))}
                                {loading && (
                                    <div className="flex items-center space-x-4 mt-4">
                                        <span className="w-1.5 h-4 bg-accent animate-pulse"></span>
                                        <span className="text-accent font-black text-[10px] uppercase tracking-[0.3em]">Processing Logic Vectors...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Global Footer / Tiny Status Bar */}
                <footer className="h-6 bg-[#0b0f1a] border-t border-white/[0.03] flex items-center justify-between px-6 z-50">
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center text-[8px] font-black text-accent uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span> System Ready
                        </div>
                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">BitLab Engine v4.0</span>
                    </div>
                    <div className="flex items-center space-x-6 text-[8px] font-black text-slate-700 uppercase tracking-widest">
                        <span className="flex items-center"><HardDrive size={10} className="mr-2" /> 2.4 TB Free</span>
                        <span className="flex items-center"><ChevronRight size={10} className="mx-1" /> Node: Primary</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default CodeLab;
