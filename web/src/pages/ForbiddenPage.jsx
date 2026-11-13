import { Link } from 'react-router-dom';

/**
 * Rendered as a section when it replaces the content of the application shell,
 * so the page keeps a single main landmark.
 */
export default function ForbiddenPage({ embedded = false }) {
  const Wrapper = embedded ? 'section' : 'main';

  return (
    <Wrapper className="state-page" aria-labelledby="forbidden-title">
      <p className="state-code">403</p>
      <h1 className="state-title" id="forbidden-title">
        This screen is outside your role.
      </h1>
      <p className="muted state-copy">
        Your Role does not include the Permission needed here. If you believe this is a mistake,
        ask a Super Admin to review your access.
      </p>
      <Link className="button button-primary" to="/">
        Back to dashboard
      </Link>
    </Wrapper>
  );
}
