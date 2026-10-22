import React, { useEffect } from 'react';
import landingBody from './landing-body.generated.js';

export function App() {
  useEffect(() => {
    // The original accessible menu behavior is shared with the local version.
    const script = document.createElement('script');
    script.src = '/landing.js';
    document.body.append(script);
    return () => script.remove();
  }, []);
  return <div dangerouslySetInnerHTML={{ __html: landingBody }} />;
}
