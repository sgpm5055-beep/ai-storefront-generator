import { Shell } from '@/components/ui';

export default function NotFound() {
  return (
    <Shell>
      <h1 className="text-2xl font-semibold">That page isn&rsquo;t here.</h1>
      <p className="mt-2 text-muted">
        The link may be wrong, or the creator may have taken the page down.
      </p>
      <a href="/" className="btn-primary mt-6">Build your own storefront</a>
    </Shell>
  );
}
