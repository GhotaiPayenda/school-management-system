import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="state-page" role="main">
      <p className="state-code">404</p>
      <h1 className="state-title">That page is not part of the school.</h1>
      <p className="muted state-copy">Check the address, or return to the workspace.</p>
      <Link className="button button-primary" to="/">
        Back to dashboard
      </Link>
    </main>
  );
}
