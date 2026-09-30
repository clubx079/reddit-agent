// Wordmark + product name. Uses the Casa Libre mascot image from /public.
export default function Brand({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-2.5">
      <img src="/cuate.png" alt="" width={big ? 44 : 32} height={big ? 44 : 32} className="shrink-0" />
      <div className="leading-none">
        <div className={`${big ? 'text-[24px]' : 'text-[18px]'} font-bold tracking-[-0.03em]`}>casa-libre</div>
        <div className="font-serif italic text-[15px] text-muted mt-0.5">Reddit Agent</div>
      </div>
    </div>
  );
}
