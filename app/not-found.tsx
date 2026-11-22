import { TopBar } from '@/components/storefront';

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="col" style={{ paddingTop: '12vh' }}>
        <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.035em]">
          That page isn’t here.
        </h1>
        <p className="mt-4 text-[17px] leading-[1.5] text-muted">
          The link may be wrong, or the creator may have taken the page down.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-ink px-7 text-base font-medium text-white transition hover:bg-black"
          style={{ minHeight: 56 }}
        >
          Build your own storefront
        </a>
      </main>
    </>
  );
}
