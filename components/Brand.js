// Product name.
export default function Brand({ size = 'md' }) {
  const big = size === 'lg';
  return <div className={`${big ? 'text-[26px]' : 'text-[20px]'} font-bold tracking-[-0.03em] leading-none`}>Reddit Agent</div>;
}
