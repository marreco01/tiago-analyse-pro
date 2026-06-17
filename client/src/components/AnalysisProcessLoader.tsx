type AnalysisProcessLoaderProps = {
  title?: string;
  message?: string;
};

export default function AnalysisProcessLoader({
  title = "Processando análise...",
  message = "Aguarde enquanto carregamos os dados e indicadores.",
}: AnalysisProcessLoaderProps) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/86 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-[390px] overflow-hidden rounded-[2rem] border border-yellow-400/40 bg-[#07080c] px-7 py-8 text-center shadow-[0_0_90px_rgba(250,204,21,0.22)] sm:px-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent" />
        <div className="absolute left-1/2 top-10 h-28 w-40 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />

        <div className="analysis-charge-shell mx-auto flex h-28 w-[132px] items-end justify-center gap-2 rounded-[1.75rem] border border-yellow-400/30 bg-black p-5 shadow-[inset_0_0_35px_rgba(255,255,255,0.03),0_0_32px_rgba(250,204,21,0.08)]">
          <span className="analysis-battery-bar analysis-battery-free h-6 w-4 rounded-md bg-white shadow-[0_0_14px_rgba(255,255,255,0.40)]" />
          <span className="analysis-battery-bar analysis-battery-pro h-9 w-4 rounded-md bg-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.42)]" />
          <span className="analysis-battery-bar analysis-battery-vip h-[3.25rem] w-4 rounded-md bg-orange-500 shadow-[0_0_14px_rgba(249,115,22,0.42)]" />
          <span className="analysis-battery-bar analysis-battery-founder h-16 w-4 rounded-md bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.42)]" />
        </div>

        <h3 className="mt-5 text-2xl font-black text-white">
          ANALYSE <span className="text-yellow-400">PRO 2.0</span>
        </h3>
        <p className="mt-3 font-black text-yellow-400">{title}</p>
        <p className="analysis-loading-message mt-2 text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}
